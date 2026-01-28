"""
Intent Classification Service
Classifica intenções de mensagens do chatbot usando spaCy + sklearn
"""

from flask import Flask, request, jsonify
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import joblib
import os
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carregar modelo spaCy para português
try:
    nlp = spacy.load("pt_core_news_sm")
    logger.info("✅ spaCy model loaded")
except:
    logger.warning("⚠️ spaCy model not found, using basic tokenization")
    nlp = None

# Dados de treinamento para classificação de intenção
TRAINING_DATA = {
    'new_ticket': [
        'preciso abrir um chamado',
        'quero registrar um problema',
        'tenho um problema para reportar',
        'preciso de suporte técnico',
        'meu computador não funciona',
        'a impressora parou de funcionar',
        'não consigo acessar o sistema',
        'internet não está funcionando',
        'rede caiu',
        'preciso de ajuda com o sistema',
        'sistema dando erro',
        'problema no email',
        'não consigo logar',
        'luz não está funcionando',
        'tomada queimou',
        'ar condicionado parou',
        'quero abrir chamado',
        'preciso de um técnico',
        'tem como me ajudar',
        'estou com problema',
    ],
    'chat_with_tech': [
        'oi está aí',
        'olá tudo bem',
        'ainda está funcionando',
        'o técnico vai demorar',
        'quando vão resolver',
        'vocês receberam minha mensagem',
        'já estão vindo',
        'obrigado pela ajuda',
        'ok entendi',
        'beleza',
        'certo',
        'sim',
        'não',
        'isso mesmo',
        'pode fazer isso',
        'perfeito',
        'valeu',
        'blz',
        'vlw',
        'entao ta bom',
    ],
    'status_query': [
        'qual o status do meu chamado',
        'meu chamado já foi atendido',
        'como está o andamento',
        'tem previsão',
        'quanto tempo vai demorar',
        'status',
        'consultar chamado',
        'ver meu chamado',
        'acompanhar chamado',
        'situação do chamado',
    ],
    'greeting': [
        'oi',
        'olá',
        'ola',
        'bom dia',
        'boa tarde',
        'boa noite',
        'eae',
        'ei',
        'hello',
        'hi',
    ]
}

# Pipeline de classificação
classifier = None

def train_classifier():
    """Treina o classificador com os dados de exemplo"""
    global classifier
    
    texts = []
    labels = []
    
    for intent, examples in TRAINING_DATA.items():
        for text in examples:
            texts.append(text.lower())
            labels.append(intent)
    
    classifier = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=1000,
            stop_words=None  # Português
        )),
        ('clf', MultinomialNB())
    ])
    
    classifier.fit(texts, labels)
    logger.info(f"✅ Classifier trained with {len(texts)} examples")
    
    # Salvar modelo treinado
    joblib.dump(classifier, 'intent_model.joblib')
    logger.info("✅ Model saved to intent_model.joblib")

def load_or_train_classifier():
    """Carrega modelo salvo ou treina novo"""
    global classifier
    
    model_path = 'intent_model.joblib'
    if os.path.exists(model_path):
        try:
            classifier = joblib.load(model_path)
            logger.info("✅ Model loaded from file")
            return
        except:
            logger.warning("⚠️ Failed to load model, training new one")
    
    train_classifier()

def preprocess_text(text):
    """Pré-processa texto usando spaCy"""
    if nlp:
        doc = nlp(text.lower())
        # Lematização e remoção de stopwords
        tokens = [token.lemma_ for token in doc if not token.is_stop and not token.is_punct]
        return ' '.join(tokens) if tokens else text.lower()
    return text.lower()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'model_loaded': classifier is not None})

@app.route('/classify', methods=['POST'])
def classify():
    """
    Classifica a intenção de uma mensagem
    
    Request body:
    {
        "text": "mensagem do usuário",
        "has_active_ticket": false  // opcional
    }
    
    Response:
    {
        "intent": "new_ticket" | "chat_with_tech" | "status_query" | "greeting",
        "confidence": 0.85,
        "should_route_to_tech": false
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing "text" field'}), 400
        
        text = data['text']
        has_active_ticket = data.get('has_active_ticket', False)
        
        # Pré-processar texto
        processed_text = preprocess_text(text)
        
        # Classificar
        if classifier is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        proba = classifier.predict_proba([processed_text])[0]
        intent_idx = proba.argmax()
        intent = classifier.classes_[intent_idx]
        confidence = float(proba[intent_idx])
        
        # Lógica de decisão
        # Se tem ticket ativo e confiança de "new_ticket" é baixa, provavelmente é chat
        should_route_to_tech = False
        
        if has_active_ticket:
            # Se tem ticket ativo, padrão é encaminhar para técnico
            # Exceto se claramente quer novo chamado (confiança alta)
            if intent == 'new_ticket' and confidence > 0.7:
                should_route_to_tech = False
            elif intent == 'greeting':
                # Saudação com ticket ativo = provavelmente quer continuar conversa
                should_route_to_tech = True
                intent = 'chat_with_tech'
            else:
                should_route_to_tech = True
                if intent not in ['status_query', 'new_ticket']:
                    intent = 'chat_with_tech'
        
        result = {
            'intent': intent,
            'confidence': round(confidence, 3),
            'should_route_to_tech': should_route_to_tech,
            'processed_text': processed_text
        }
        
        logger.info(f"Classified: '{text[:50]}...' -> {intent} ({confidence:.2%})")
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error classifying: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/train', methods=['POST'])
def retrain():
    """
    Re-treina o modelo com novos dados (opcional)
    
    Request body:
    {
        "examples": [
            {"text": "exemplo", "intent": "new_ticket"}
        ]
    }
    """
    try:
        data = request.get_json()
        
        if data and 'examples' in data:
            for example in data['examples']:
                intent = example.get('intent')
                text = example.get('text')
                if intent in TRAINING_DATA and text:
                    TRAINING_DATA[intent].append(text)
        
        train_classifier()
        
        return jsonify({'status': 'trained', 'examples_count': sum(len(v) for v in TRAINING_DATA.values())})
    
    except Exception as e:
        logger.error(f"Error training: {e}")
        return jsonify({'error': str(e)}), 500

# Inicializar modelo ao iniciar
load_or_train_classifier()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
