# ⚡ Quick Start - Captain AI

Guia rápido para ativar o Captain AI no seu Helpdesk.

---

## 🚀 Passo 1: Obter Credenciais

### **MiniMax (Primário - OBRIGATÓRIO)**
1. Acesse: https://www.minimaxi.com/
2. Crie conta e obtenha API Key
3. Adicione créditos (recomendado: $10 para testes)

### **Claude/Anthropic (Recomendado)**
1. Acesse: https://console.anthropic.com/
2. Crie conta e obtenha API Key
3. Adicione créditos (recomendado: $10)

### **OpenAI (Opcional - para embeddings)**
1. Acesse: https://platform.openai.com/
2. Crie conta e obtenha API Key
3. Adicione créditos (recomendado: $5)

---

## 🔧 Passo 2: Configurar .env

Edite o arquivo `.env` na raiz do projeto:

```bash
# =============================================================================
# AI / LLM Configuration
# =============================================================================

# MiniMax AI (OBRIGATÓRIO)
MINIMAX_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Anthropic Claude (RECOMENDADO para melhor qualidade)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OpenAI (OPCIONAL - para embeddings)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini

# Ollama (Local fallback - opcional)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

# GLM-4 (Backup - opcional)
GLM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## ✅ Passo 3: Testar Integração

### **3.1. Testar MiniMax**

```bash
cd backend
npx tsx scripts/test-minimax.ts
```

**Resultado esperado:**
```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║       🤖 TESTE DE INTEGRAÇÃO MINIMAX API                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

🔍 Testando conexão com MiniMax API...

✅ Status: CONECTADO
📊 Modelo: abab6-chat
⚡ Latência: 1234ms
💬 Resposta: OK

🧠 Testando classificação de intenção...

✅ "Meu computador não liga"
   → Intent: abrir_ticket_ti (92%) [1456ms]

✅ "Quero reservar um projetor"
   → Intent: reservar_equipamento (88%) [1234ms]

╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║       ✅ TODOS OS TESTES CONCLUÍDOS                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

Se ver ❌ erros:
- Verifique se `MINIMAX_API_KEY` está correto
- Verifique se tem créditos na conta
- Verifique conexão com internet

---

## 🎯 Passo 4: Iniciar Sistema

### **4.1. Backend (Terminal 1)**

```bash
cd backend
npm install  # Apenas na primeira vez
npm run dev
```

Aguarde ver:
```
✅ Database connected
✅ Redis connected
✅ RabbitMQ connected
🚀 Backend rodando em http://localhost:3000
```

### **4.2. Bot WhatsApp (Terminal 2)**

```bash
cd bot
npm install  # Apenas na primeira vez
npm start
```

Aguarde ver:
```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🤖 HELPDESK BOT - WhatsApp + GLPI                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

📦 Conectando Redis...
📦 Conectando RabbitMQ...
⚙️ Iniciando workers...
🌐 Iniciando API Server...
📱 Conectando WhatsApp...
✅ WhatsApp conectado!
```

Escaneie o QR Code com WhatsApp Web.

### **4.3. Frontend (Terminal 3 - Opcional)**

```bash
cd frontend
npm install  # Apenas na primeira vez
npm run dev
```

Acesse: http://localhost:5173

---

## 🧪 Passo 5: Testar Captain AI

### **Teste 1: Problema Simples (Captain deve resolver)**

Envie no WhatsApp:
```
Meu computador não liga
```

**Resultado esperado:**
```
🤖 Captain detecta intent "abrir_ticket_ti"
🔍 Busca conhecimento relevante
📝 Gera resposta com tutorial
⚡ Envia resposta em < 5 segundos

"Vejo que seu computador não liga. Vamos resolver! 🔧

Siga estes passos:
1. Verifique se o cabo de energia está conectado
2. Teste a tomada com outro equipamento
3. Pressione o botão power por 5 segundos
4. Verifique se o LED da fonte acende

❓ Isso resolveu seu problema?
Digite *sim* se resolveu ou *não* se ainda precisa de um técnico."
```

**Se responder "sim":**
```
🎉 Que ótimo!
Fico feliz que consegui ajudar!

Se precisar de mais alguma coisa, é só enviar *oi* a qualquer momento. 😊
```
✅ Ticket **NÃO** é criado (resolvido pelo Captain)

**Se responder "não":**
```
Entendo! Vou criar um chamado para que um técnico possa te ajudar. 👨‍💻

Por favor, me informe o *local* onde está o problema:
```
✅ Ticket **É** criado normalmente

---

### **Teste 2: Problema Complexo (Captain deve escalar)**

Envie no WhatsApp:
```
Preciso falar com um técnico urgente
```

**Resultado esperado:**
```
🤖 Captain detecta intent "falar_tecnico"
❌ NÃO tenta auto-resolver (escala direto)
✅ Continua fluxo normal de criação de ticket
```

---

### **Teste 3: Problema Elétrico (Captain deve escalar)**

Envie no WhatsApp:
```
A tomada não está funcionando
```

**Resultado esperado:**
```
🤖 Captain detecta intent "abrir_ticket_eletrica"
❌ NÃO tenta auto-resolver (risco de segurança)
✅ Cria ticket de elétrica para técnico especializado
```

---

## 📊 Passo 6: Monitorar Performance

### **6.1. Logs do Bot**

Acompanhe Terminal 2 (bot):

```bash
🧠 Intenção classificada: abrir_ticket_ti (92%)
🤖 Captain Assistant tentando resolver: "Meu computador não liga..."
✅ Captain AUTO-RESOLVEU (85%)
```

Ou:

```bash
🧠 Intenção classificada: abrir_ticket_ti (75%)
🤖 Captain Assistant tentando resolver: "Sistema dando erro..."
⚠️ Captain escalou para humano (confidence: 0.65)
✨ SKIP MENU - Criando ticket direto
```

### **6.2. Logs do Backend**

Acompanhe Terminal 1 (backend):

```bash
🤖 Captain tentando resolver: "Meu computador não liga..."
📚 RAG: 3 conversas similares encontradas
📖 Knowledge: "Computador não liga" (relevância: 95%)
🧠 LLM: MiniMax respondeu em 1.2s
✅ Can auto-resolve: true (confidence: 0.85)
```

### **6.3. Métricas (Endpoint)**

```bash
curl http://localhost:3000/api/captain/performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAttempts": 47,
    "autoResolved": 28,
    "escalated": 19,
    "avgConfidence": 0.82,
    "successRate": 0.596,
    "avgResolutionTime": 2300
  }
}
```

---

## 🎨 Customizar Respostas

### **Ajustar Prompts**

Edite: `backend/src/infrastructure/ai/captain-assistant.service.ts`

Método: `buildPrompt()` (linha ~180)

```typescript
private buildPrompt(userMessage: string, context: string, intent: string): string {
  return `Você é o Captain Assistant, um assistente de suporte técnico da EMPRESA XYZ.

**Tom de Voz:** Amigável, profissional, direto
**Estilo:** Use emojis, bullets, passos numerados

**Contexto Disponível:**
${context || 'Nenhum contexto relevante encontrado'}

// ... resto do prompt
`;
}
```

### **Adicionar Mais Conhecimento**

Edite: `backend/src/infrastructure/ai/knowledge-base.service.ts`

Método: `seedInitialKnowledge()` (linha ~39)

Adicione novos documentos:

```typescript
{
  nodeType: 'problem',
  title: 'Sistema ERP lento',
  description: 'Sistema ERP/Totvs apresenta lentidão',
  content: {
    diagnostic: [
      'Verificar carga do servidor',
      'Verificar latência de rede',
      'Verificar queries lentas no banco'
    ],
    solutions: [
      'Reiniciar serviço TOTVS',
      'Limpar cache do navegador',
      'Verificar com time de infraestrutura'
    ],
    avgResolutionTime: '20-40 minutos',
    category: 'Software',
    urgency: 'Média'
  },
  tags: ['erp', 'totvs', 'lento', 'performance', 'sistema'],
},
```

Depois reinicie backend.

---

## 🐛 Troubleshooting Rápido

### **Captain não responde**
```bash
# 1. Verificar se backend está rodando
curl http://localhost:3000/health
# Deve retornar: {"status":"ok"}

# 2. Verificar se Captain está ativo
curl -X POST http://localhost:3000/api/captain/assist \
  -H "Content-Type: application/json" \
  -d '{"message":"teste","phoneNumber":"123","intent":"abrir_ticket_ti"}'

# 3. Verificar logs do bot (Terminal 2)
# Procurar por linhas com "Captain"
```

### **Erro 401/403**
```bash
# Verificar .env
grep MINIMAX_API_KEY .env
grep ANTHROPIC_API_KEY .env

# Testar credenciais
cd backend && npx tsx scripts/test-minimax.ts
```

### **Latência muito alta (>10s)**
```bash
# Opção 1: Reduzir max_tokens
# Editar captain-assistant.service.ts
# max_tokens: 800 → 400

# Opção 2: Usar provider mais rápido
# .env: ANTHROPIC_MODEL=claude-3-5-haiku-20241022

# Opção 3: Adicionar cache
# (Implementação futura)
```

### **Taxa de auto-resolução baixa (<30%)**
```bash
# Opção 1: Reduzir threshold de confidence
# Editar captain-assistant.service.ts:shouldAutoResolve()
# if (response.confidence < 0.7) → 0.6

# Opção 2: Adicionar mais documentos
# Editar knowledge-base.service.ts:seedInitialKnowledge()

# Opção 3: Melhorar prompts
# Editar captain-assistant.service.ts:buildPrompt()
```

---

## 📚 Documentação Completa

- 📖 **Documentação Técnica:** `CAPTAIN_AI.md`
- 📋 **Resumo Implementação:** `IMPLEMENTACAO_RESUMO.md`
- ⚡ **Quick Start:** `QUICK_START_CAPTAIN.md` (este arquivo)

---

## 💬 Suporte

Em caso de dúvidas:

1. Leia `CAPTAIN_AI.md` (documentação completa)
2. Verifique logs do backend e bot
3. Teste endpoint manualmente com `curl`
4. Verifique se credenciais estão corretas

---

**🎉 Pronto! Captain AI está ativo e economizando tempo dos técnicos!**

**Métricas esperadas:**
- ⚡ 40-60% dos tickets tier-1 resolvidos automaticamente
- ⏰ Resposta em <30 segundos (vs 5-10 minutos manual)
- 📉 40% de redução na carga de trabalho dos técnicos
- 😊 15% de aumento na satisfação do cliente
