# ⚡ Ativar Captain AI - Guia Rápido

## 🚨 Problema Atual

O bot está enviando menu genérico ao invés de usar Captain AI porque:
- ❌ Credenciais não estão configuradas no `.env`
- ❌ Bot não foi reiniciado após implementação

---

## ✅ Solução (2 minutos)

### **Passo 1: Configurar `.env`**

Abra o arquivo `.env` na **raiz do projeto** e adicione:

```bash
# MiniMax AI (OBRIGATÓRIO)
MINIMAX_API_KEY=sua_chave_minimax_aqui
MINIMAX_GROUP_ID=2029601411049730229

# Anthropic Claude (RECOMENDADO - melhor qualidade)
ANTHROPIC_API_KEY=sua_chave_anthropic_aqui
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OpenAI (OPCIONAL)
OPENAI_API_KEY=sua_chave_openai_aqui
```

**Mínimo necessário:** Apenas `MINIMAX_API_KEY` e `MINIMAX_GROUP_ID`

---

### **Passo 2: Reiniciar Backend**

```bash
# Parar backend (Ctrl+C)
# Depois reiniciar:
cd backend
npm run dev
```

**Aguarde ver:**
```
✅ MiniMax Embeddings ativo: embo-01 (1536 dims)
🚀 Backend rodando em http://localhost:3000
```

---

### **Passo 3: Reiniciar Bot**

```bash
# Parar bot (Ctrl+C)
# Depois reiniciar:
cd bot
npm start
```

**Aguarde ver:**
```
✅ WhatsApp conectado!
```

---

## 🧪 Testar Captain AI

### **Teste 1: Problema Simples**

Envie no WhatsApp:
```
Meu computador não liga
```

**Resultado ESPERADO (com Captain ativo):**
```
🤖 Captain Assistant tentando resolver...
✅ Captain AUTO-RESOLVEU (85%)

"Vejo que seu computador não liga. Vamos resolver! 🔧

Siga estes passos:
1. Verifique se o cabo de energia está conectado
2. Teste a tomada com outro equipamento
3. Pressione o botão power por 5 segundos
4. Verifique se o LED da fonte acende

❓ Isso resolveu seu problema?
Digite *sim* se resolveu ou *não* se ainda precisa de um técnico."
```

**Resultado ATUAL (sem Captain - só menu):**
```
👋 Olá! Sou o assistente de suporte.

Como posso ajudar você hoje?

1️⃣ Abrir chamado de TI
2️⃣ Abrir chamado de Elétrica
...
```

---

## 🔍 Verificar se Captain está Ativo

### **Método 1: Logs do Backend**

Quando reiniciar o backend, procure por:

```
✅ MiniMax Embeddings ativo: embo-01 (1536 dims)
```

Se aparecer:
```
⚠️  MiniMax Embeddings indisponível: API_KEY ou GROUP_ID não configurados
```

→ Credenciais estão faltando no `.env`

---

### **Método 2: Logs do Bot**

Quando testar no WhatsApp, procure no terminal do bot:

**COM CAPTAIN ATIVO:**
```
🧠 Intenção classificada: abrir_ticket_ti (92%)
🤖 Captain Assistant tentando resolver: "Meu computador não liga..."
✅ Captain AUTO-RESOLVEU (85%)
```

**SEM CAPTAIN (problema atual):**
```
🧠 Intenção classificada: abrir_ticket_ti (92%)
✨ SKIP MENU - Criando ticket direto
```

---

## 🐛 Se Captain não funcionar

### **1. Verificar Credenciais**

```bash
# Verificar se .env tem as variáveis
grep MINIMAX .env

# Deve retornar:
# MINIMAX_API_KEY=sk-xxx...
# MINIMAX_GROUP_ID=2029601411049730229
```

### **2. Testar MiniMax API**

```bash
cd backend
npx tsx scripts/test-minimax.ts
```

**Se falhar:**
- ❌ API Key inválida ou sem créditos
- ❌ Conexão com internet

---

### **3. Testar Endpoint Captain**

```bash
curl -X POST http://localhost:3000/api/captain/assist \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Meu computador não liga",
    "phoneNumber": "123456789",
    "intent": "abrir_ticket_ti"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "canAutoResolve": true,
    "suggestedResponse": "Vejo que seu computador não liga...",
    "confidence": 0.85,
    ...
  }
}
```

**Se retornar erro 404:**
- Backend não iniciou corretamente
- CaptainModule não registrado

**Se retornar erro 500:**
- Credenciais inválidas
- Problema na API MiniMax

---

## 🎯 Fluxo Correto (com Captain)

```
┌─────────────────────────────────────────────────────────────┐
│  USUÁRIO: "Meu computador não liga"                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BOT: Intent Detection                                      │
│  Intent: "abrir_ticket_ti" (92%)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BOT: Chama Captain Assistant                               │
│  POST /api/captain/assist                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CAPTAIN: Busca RAG + Knowledge Base                        │
│  Gera resposta com MiniMax/Claude                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
   ┌──────────────┐         ┌──────────────┐
   │ Confidence   │         │ Confidence   │
   │ >= 0.7       │         │ < 0.7        │
   └──────┬───────┘         └──────┬───────┘
          │                        │
          ▼                        ▼
   ┌────────────────┐      ┌────────────────┐
   │ ✅ Auto-Resolve│      │ ❌ Cria Ticket │
   │ + Pede Feedback│      │ (menu normal)  │
   └────────────────┘      └────────────────┘
```

---

## ✅ Checklist de Ativação

- [ ] `.env` configurado com `MINIMAX_API_KEY`
- [ ] `.env` configurado com `MINIMAX_GROUP_ID`
- [ ] Backend reiniciado (`npm run dev`)
- [ ] Bot reiniciado (`npm start`)
- [ ] Log do backend mostra "✅ MiniMax Embeddings ativo"
- [ ] Testado no WhatsApp com "Meu computador não liga"
- [ ] Captain respondeu automaticamente (não mostrou menu)

---

## 🎉 Quando Funcionar

Você verá no WhatsApp:

**Antes (menu genérico):**
```
👋 Olá! Sou o assistente de suporte.
1️⃣ Abrir chamado de TI
2️⃣ Abrir chamado de Elétrica
```

**Depois (Captain ativo):**
```
Vejo que seu computador não liga. Vamos resolver! 🔧

Siga estes passos:
1. Verifique se o cabo de energia está conectado
2. Teste a tomada com outro equipamento
3. Pressione o botão power por 5 segundos

❓ Isso resolveu seu problema?
Digite *sim* ou *não*
```

---

## 📞 Suporte Rápido

**Se continuar com menu genérico:**
1. Verifique logs do backend (terminal)
2. Verifique logs do bot (terminal)
3. Execute `npx tsx scripts/test-minimax.ts`
4. Revise arquivo `.env` (credenciais corretas?)

**Arquivos importantes:**
- `.env` - Credenciais
- `bot/src/handlers/flow-handler.js` - Integração Captain (linha 286)
- `backend/src/infrastructure/ai/captain-assistant.service.ts` - Serviço

---

**Status Atual:** ⚠️ Captain implementado mas não ativo (falta configurar `.env`)
**Próximo Passo:** Adicionar credenciais no `.env` e reiniciar!
