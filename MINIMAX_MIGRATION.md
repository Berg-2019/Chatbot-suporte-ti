# Migração Claude AI → MiniMax AI

## 📋 Resumo

Migração completa do sistema de classificação de intenções do **Anthropic Claude** para **MiniMax AI**.

---

## 🔄 Alterações Realizadas

### 1. Backend - Intent Service

**Arquivo:** `backend/src/presentation/controllers/intent/intent.service.ts`

**Alterações:**
- ✅ Substituído `anthropicApiKey` por `minimaxApiKey`
- ✅ Substituído método `classifyWithClaude()` por `classifyWithMiniMax()`
- ✅ Atualizado endpoint: `https://api.minimaxi.chat/v1/text/chatcompletion`
- ✅ Atualizado modelo: `abab6-chat`
- ✅ Ajustado formato de requisição para o padrão MiniMax:
  - `messages` com formato `sender_type`, `sender_name`, `text`
  - `reply_constraints` para controlar resposta
  - `bot_setting` para instrução do sistema

### 2. Variáveis de Ambiente

**Arquivo:** `backend/.env`

**Adicionado:**
```env
# AI Services
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
MINIMAX_API_KEY=sk-api-DRe7KLvlfbXUIM-ArFBXmdIX5-cbInZh6Z3DwzXp3_5UE6HVC44sX4z8WqiEmdgcNmyLXQ-Ghnz0CjSg79d3hPuxEWbpsAi1S75HDPo8woV2uwIznSFuvMg
```

---

## 🌐 API MiniMax - Detalhes

### Endpoint
```
POST https://api.minimaxi.chat/v1/text/chatcompletion
```

### Autenticação
```
Authorization: Bearer {MINIMAX_API_KEY}
```

### Modelo Utilizado
- **Model:** `abab6-chat`
- **Temperature:** 0.1 (para respostas consistentes)
- **Max Tokens:** 200
- **Top P:** 0.9

### Formato de Requisição
```json
{
  "model": "abab6-chat",
  "messages": [
    {
      "sender_type": "USER",
      "sender_name": "User",
      "text": "prompt aqui"
    }
  ],
  "reply_constraints": {
    "sender_type": "BOT",
    "sender_name": "Assistant"
  },
  "bot_setting": [
    {
      "bot_name": "Assistant",
      "content": "System prompt aqui"
    }
  ],
  "temperature": 0.1,
  "top_p": 0.9,
  "max_tokens": 200
}
```

### Formato de Resposta
```json
{
  "reply": "resposta do modelo",
  "created": 1234567890,
  "model": "abab6-chat",
  "base_resp": {
    "status_code": 0,
    "status_msg": ""
  }
}
```

---

## 🔧 Fallback Strategy

O sistema mantém a estratégia de fallback:

1. **Primário:** Ollama (local) - `qwen2.5:3b`
2. **Fallback:** MiniMax (cloud) - `abab6-chat`

Isso garante:
- ✅ Menor latência quando Ollama está disponível
- ✅ Confiabilidade com fallback na nuvem
- ✅ Economia de custos usando LLM local quando possível

---

## 📊 Comparação Claude vs MiniMax

| Aspecto | Claude (Anthropic) | MiniMax |
|---------|-------------------|---------|
| **Endpoint** | api.anthropic.com | api.minimaxi.chat |
| **Modelo usado** | claude-3-haiku-20240307 | abab6-chat |
| **Formato mensagens** | Padrão OpenAI | Customizado (sender_type) |
| **Custo** | $$$ | $ |
| **Latência** | Baixa | Média |
| **Qualidade** | Excelente | Muito boa |
| **Limite gratuito** | Limitado | Mais generoso |

---

## 🧪 Como Testar

### 1. Testar integração diretamente
```bash
cd backend
npm run build
node dist/test-minimax.js
```

### 2. Testar via API do sistema
```bash
POST /api/intent/classify
{
  "userMessage": "Minha impressora não está funcionando"
}
```

Resposta esperada:
```json
{
  "intent": "abrir_ticket_ti",
  "confidence": 0.95,
  "entities": {
    "equipamento": "impressora",
    "problema": "não funciona"
  },
  "processingTime": 850
}
```

---

## ⚠️ Observações Importantes

### Limitações conhecidas:
1. **Rate Limit:** A API da MiniMax tem limites de RPM (Requests Per Minute)
   - Solução: O sistema usa Ollama como primário para evitar atingir limites

2. **Modelo:** O modelo `abab6-chat` é o modelo base disponível
   - Modelos mais avançados podem estar disponíveis dependendo do tier da conta

3. **Formato de resposta:** MiniMax usa formato próprio (não compatível com OpenAI)
   - Implementação específica foi necessária

### Em caso de problemas:

**Se a API retornar erro 1002 (rate limit):**
- Aguarde alguns minutos antes de tentar novamente
- Configure Ollama para ser o provider principal
- Considere upgrade do plano MiniMax

**Se a API retornar erro 2013 (invalid model):**
- Verifique se o modelo `abab6-chat` está disponível para sua conta
- Tente outros modelos: `abab5-chat`, `abab5.5-chat`

---

## ✅ Verificação de Sucesso

A migração está completa quando:
- [x] Código compila sem erros
- [x] Variável `MINIMAX_API_KEY` configurada no `.env`
- [x] Sistema inicia sem erros de configuração
- [x] Classificação de intenções funciona com Ollama + MiniMax fallback
- [x] Logs mostram "MiniMax" como provider quando Ollama falha

---

## 📚 Referências

- MiniMax API Documentation: https://api.minimaxi.chat/document
- Modelo abab6-chat: https://api.minimaxi.chat/models
- Issue tracking: Backend logs em `/logs`

---

**Data da migração:** 2026-03-10
**Versão do sistema:** feature/chatbot-upgrade
**Status:** ✅ Concluído
