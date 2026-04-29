# =============================================================================
# PROMPT COMPLETO: Configurar Hermes Agent + Helpdesk
# =============================================================================
# Copie e cole este texto para o Claude Code na VM de teste
# =============================================================================

## Contexto

Você está configurando o Hermes Agent como brain conversacional de um sistema de helpdesk de TI.
O sistema tem:
- Backend NestJS rodando na porta 3000
- WhatsApp como canal de mensagens
- GLPI para gerenciamento de tickets
- MiniMax como provedor de IA

## Tarefas a Executar

### 1. VERIFICAR INSTALAÇÃO DO HERMES

```bash
hermes --version
hermes doctor
```

### 2. CONFIGURAR ARQUIVOS

Crie o arquivo de skills:

```bash
mkdir -p ~/.hermes/skills
```

**helpdesk-create-ticket.md:**
```markdown
# Helpdesk Create Ticket

Cria tickets de suporte via conversa natural.

## Trigger
- "abrir chamado", "criar ticket", "preciso de ajuda"

## Fluxo
1. Cumprimente o usuário
2. Colecione: descrição, área (TI/Elétrica), setor, localização, nome
3. Confirme os dados
4. Chame API

## API
POST http://localhost:3000/api/hermes/tickets
Body: {title, description, area, sector, location, requesterName, phone}
```

**helpdesk-faq.md:**
```markdown
# Helpdesk FAQ

Busca na base de conhecimento.

## Trigger
- "como fazer", "faq", "tenho dúvida"

## API
GET http://localhost:3000/api/hermes/faq/search?q={pergunta}
```

**helpdesk-escalate.md:**
```markdown
# Helpdesk Escalate

Escala para atendente humano.

## Trigger
- "falar com atendente", "preciso de técnico"

## API
POST http://localhost:3000/api/hermes/escalate
Body: {phone, problemSummary, urgency, area}
```

### 3. CONFIGURAR HERMES

```bash
nano ~/.hermes/.env
```

Conteúdo:
```
BACKEND_URL=http://localhost:3000
BACKEND_API_KEY=helpdesk_api_key_2024
WHATSAPP_ENABLED=true
WHATSAPP_ALLOWED_USERS=*
```

```bash
nano ~/.hermes/config.yaml
```

Conteúdo:
```yaml
model: openrouter/anthropic/claude-3-5-sonnet-latest

display:
  tool_progress: new
  streaming: true

whatsapp:
  enabled: true
  mode: bot
  unauthorized_dm_behavior: ignore
  reply_prefix: ""
```

### 4. CONFIGURAR MODEL (MiniMax)

```bash
hermes model
```

Escolha:
1. OpenRouter ou Custom (depende de como quer usar MiniMax)
2. Se usar MiniMax direto: Custom OpenAI-compatible
   - Base URL: https://api.minimax.io/v1
   - API Key: sua_chave_minimax
   - Model: MiniMax-M2

### 5. INICIAR GATEWAY

```bash
hermes gateway start
```

### 6. TESTAR

Envie uma mensagem no WhatsApp:
```
Olá, preciso de ajuda com meu computador
```

O Hermes deve:
1. Cumprimentear
2. Perguntar sobre o problema
3. Coletar informações
4. Criar ticket no backend

### 7. VERIFICAR TICKET NO BACKEND

```bash
curl http://localhost:3000/api/hermes/tickets/by-phone/SEU_NUMERO
```

---

## ENDPOINTS DO BACKEND

O backend (NestJS) deve ter estes endpoints públicos em `/api/hermes/`:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/hermes/tickets | Criar ticket |
| GET | /api/hermes/tickets/:id | Ver ticket |
| GET | /api/hermes/tickets/by-phone/:phone | Tickets por telefone |
| GET | /api/hermes/faq/search?q= | Buscar FAQ |
| POST | /api/hermes/escalate | Escalação |
| GET | /api/hermes/agents/status | Status agentes |

---

## TROUBLESHOOTING

**Hermes não conecta no backend:**
- Verifique se backend está rodando: `curl http://localhost:3000/api/health`
- Verifique IP/porta no BACKEND_URL

**WhatsApp não responde:**
- Verifique `hermes gateway status`
- Verifique `WHATSAPP_ENABLED=true` no .env

**Skills não funcionam:**
- Verifique se estão em `~/.hermes/skills/`
- Liste com `ls -la ~/.hermes/skills/`

---

## RESULTADO ESPERADO

Após configuração completa:
1. WhatsApp recebe mensagens
2. Hermes responde com IA conversacional
3. Tickets são criados no backend
4. FAQ é buscado automaticamente
5. Escalação funciona quando necessário
