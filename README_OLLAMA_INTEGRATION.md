# 🤖 Integração com Ollama - Bot WhatsApp

## 📋 Visão Geral

O bot foi atualizado para usar **Ollama** em vez do OpenAI, proporcionando uma solução de IA local e gratuita para análise de mensagens e criação de respostas inteligentes.

## 🚀 Funcionalidades da IA

### 1. **Análise Inteligente de Mensagens**
- **Classificação automática** de mensagens do usuário:
  - `SAUDACAO`: Cumprimentos e saudações
  - `PROBLEMA`: Descrição de problemas técnicos
  - `DUVIDA`: Perguntas sobre o sistema
  - `OUTRO`: Outras mensagens

### 2. **Primeira Interação Personalizada**
- **Mensagem de boas-vindas** gerada pela IA
- **Não cria OS automaticamente** na primeira mensagem
- **Orientação sobre uso** do sistema

### 3. **Análise de Problemas Técnicos**
- **Categorização automática** (Hardware, Software, Rede, etc.)
- **Definição de prioridade** (Alta, Normal, Baixa)
- **Análise breve** do problema reportado

## ⚙️ Configuração do Ollama

### Pré-requisitos
1. **Instalar Ollama**: https://ollama.ai/
2. **Baixar modelo recomendado**:
   ```bash
   ollama pull llama3.2:3b
   ```

### Configuração no Bot
```javascript
// bot-whatsapp/config/config.js
ollama: {
  baseUrl: 'http://localhost:11434',  // URL do Ollama
  model: 'llama3.2:3b'                // Modelo a ser usado
}
```

### Variáveis de Ambiente (.env)
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

## 🔄 Fluxo de Interação Atualizado

### 1. **Primeira Mensagem do Usuário**
```
Usuário: "oi"
Bot: 👋 Olá! Sou seu assistente técnico de TI.

🔧 Para abrir um chamado, descreva seu problema técnico
📋 Use !ajuda para ver todos os comandos disponíveis
💬 Estou aqui para ajudar com questões de TI!
```

### 2. **Problema Técnico Identificado**
```
Usuário: "minha impressora não está funcionando"
Bot: ✅ CHAMADO CRIADO COM SUCESSO

🎫 OS #123
📝 Problema: minha impressora não está funcionando
📅 Criado em: 15/12/2024 14:30

🤖 Análise Automática:
📂 Categoria: Impressora
⚡ Prioridade: Normal
🔍 Análise: Problema comum de conectividade com impressora

💡 Próximos passos:
• Use !dados para adicionar mais informações
• Use !status 123 para consultar o andamento
• Nossa equipe técnica foi notificada
```

### 3. **Dúvidas sobre o Sistema**
```
Usuário: "como faço para abrir um chamado?"
Bot: ❓ Entendi que você tem uma dúvida sobre o sistema.

📋 Use !ajuda para ver todos os comandos disponíveis
🔧 Para abrir um chamado, descreva seu problema técnico
💬 Posso ajudar com questões de TI, impressoras, computadores, rede, etc.
```

## 🛠️ Comandos Técnicos

### Para Usuários
- **Primeira mensagem**: Recebe boas-vindas personalizadas
- **Descrever problema**: Cria OS automaticamente com análise IA
- **!ajuda**: Lista de comandos disponíveis
- **!status [id]**: Consultar status da OS
- **!dados**: Adicionar informações detalhadas

### Para Técnicos (inalterados)
- **!list**: Listar OS abertas
- **!atendendo [id]**: Assumir OS
- **!finalizado [id]**: Finalizar OS
- **!listpeças [id]**: Solicitar peças

## 🔧 Instalação e Configuração

### 1. **Instalar Ollama**
```bash
# Linux/Mac
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Baixar do site oficial: https://ollama.ai/
```

### 2. **Iniciar Ollama**
```bash
ollama serve
```

### 3. **Baixar Modelo**
```bash
ollama pull llama3.2:3b
```

### 4. **Verificar Instalação**
```bash
ollama list
```

### 5. **Iniciar o Bot**
```bash
cd bot-whatsapp
npm install
npm start
```

## 📊 Monitoramento

### Status da Conexão Ollama
O bot verifica automaticamente a conexão com Ollama:
- ✅ **Conectado**: IA funcionando normalmente
- ⚠️ **Desconectado**: Bot funciona sem IA (modo fallback)

### Logs
```
✅ Ollama conectado com sucesso
⚠️ Ollama não está disponível
⚠️ Erro ao conectar com Ollama: Connection refused
```

## 🚨 Troubleshooting

### Problema: Ollama não conecta
**Solução**:
1. Verificar se Ollama está rodando: `ollama serve`
2. Verificar URL no config: `http://localhost:11434`
3. Testar conexão: `curl http://localhost:11434/api/tags`

### Problema: Modelo não encontrado
**Solução**:
1. Listar modelos: `ollama list`
2. Baixar modelo: `ollama pull llama3.2:3b`
3. Verificar nome no config

### Problema: IA não responde
**Solução**:
1. Bot funciona em modo fallback (sem IA)
2. Verificar logs do Ollama
3. Reiniciar serviço Ollama

## 🔄 Modelos Alternativos

### Modelos Recomendados
- **llama3.2:3b** (padrão) - Rápido e eficiente
- **llama3.2:1b** - Mais leve, menos preciso
- **mistral:7b** - Alternativa robusta
- **codellama:7b** - Especializado em código

### Trocar Modelo
```bash
# Baixar novo modelo
ollama pull mistral:7b

# Atualizar config
OLLAMA_MODEL=mistral:7b
```

## 📈 Performance

### Recursos Recomendados
- **RAM**: Mínimo 8GB (16GB recomendado)
- **CPU**: 4+ cores
- **Armazenamento**: 10GB+ livre

### Otimização
- Usar modelos menores para melhor performance
- Configurar timeout adequado
- Monitorar uso de recursos

## 🔐 Segurança

### Vantagens do Ollama
- **Dados locais**: Nenhuma informação enviada para terceiros
- **Privacidade**: Conversas permanecem no servidor
- **Controle total**: Sem dependência de APIs externas
- **Gratuito**: Sem custos de API

## 📝 Logs e Debugging

### Logs da IA
```javascript
// Logs automáticos no console
✅ Ollama conectado com sucesso
🤖 Análise IA: PROBLEMA detectado
⚠️ Ollama não disponível, usando fallback
```

### Debug Manual
```javascript
// Testar conexão
const ollamaClient = require('./utils/ollama');
console.log(ollamaClient.getStatus());
```

## 🎯 Próximos Passos

1. **Monitoramento avançado** de performance da IA
2. **Treinamento personalizado** com dados específicos
3. **Múltiplos modelos** para diferentes tarefas
4. **Interface web** para configuração da IA
5. **Métricas de precisão** da análise automática

---

**Nota**: O sistema funciona perfeitamente mesmo sem Ollama, mantendo todas as funcionalidades básicas do bot.
