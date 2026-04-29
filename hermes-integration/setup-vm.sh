#!/bin/bash
# =============================================================================
# Hermes Agent - Setup Completo para Helpdesk Chatbot
# =============================================================================
# Execute este script NA VM DE TESTE onde o Hermes está instalado
# =============================================================================

set -e

echo "🤖 Hermes Helpdesk Setup - Iniciando..."
echo "================================================"

# =============================================================================
# CONFIGURAÇÃO - EDITE AQUI
# =============================================================================

# IP/Host do Backend (ajuste conforme necessário)
BACKEND_HOST="localhost"  # ou IP da VM se docker em outra máquina
BACKEND_PORT="3000"
BACKEND_URL="http://${BACKEND_HOST}:${BACKEND_PORT}"
BACKEND_API_KEY="helpdesk_api_key_2024"  # CHANGE THIS!

# Seu número de WhatsApp (para testes)
YOUR_WHATSAPP="69981020588"

# =============================================================================
# VERIFICAÇÕES INICIAIS
# =============================================================================

echo ""
echo "📋 Verificando instalação do Hermes..."

if ! command -v hermes &> /dev/null; then
    echo "❌ Hermes não encontrado!"
    echo "   Instale primeiro:"
    echo "   curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash"
    exit 1
fi

echo "✅ Hermes encontrado: $(hermes --version 2>/dev/null || echo 'CLI OK')"

# =============================================================================
# BACKEND - VERIFICAR CONEXÃO
# =============================================================================

echo ""
echo "🔗 Verificando conexão com Backend..."

if curl -s --connect-timeout 5 "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
    echo "✅ Backend acessível: ${BACKEND_URL}"
elif curl -s --connect-timeout 5 "http://localhost:${BACKEND_PORT}/api/health" > /dev/null 2>&1; then
    BACKEND_URL="http://localhost:${BACKEND_PORT}"
    echo "✅ Backend acessível: ${BACKEND_URL}"
else
    echo "⚠️  Backend não respondedou. Tentando outras opções..."
    # Tentar docker network
    BACKEND_IP=$(docker network inspect bridge 2>/dev/null | grep -oP '"Gateway": "\K[^"]+' | head -1)
    if [ -n "$BACKEND_IP" ]; then
        echo "   Docker Gateway: $BACKEND_IP"
    fi
    echo "   Continuando mesmo assim (verifique manualmente)..."
fi

# =============================================================================
# INSTALAR SKILLS
# =============================================================================

echo ""
echo "📦 Instalando Skills de Helpdesk..."

SKILLS_DIR="$HOME/.hermes/skills"
mkdir -p "$SKILLS_DIR"

# Skills básicas (criar localmente se não existirem)
cat > "$SKILLS_DIR/helpdesk-create-ticket.md" << 'SKILL_EOF'
# Helpdesk Create Ticket

Cria um novo ticket de suporte no sistema de helpdesk.

## Trigger
- "abrir chamado", "criar ticket", "preciso de ajuda", "tenho um problema"
- Intent: `abrir_ticket`, `solicitar_suporte`

## Comportamento

### Passo 1: Saudação e Coleta
Quando triggered, seja acolhedor e explique que vai ajudar a abrir o chamado.

### Passo 2: Coletar Informações
Colete de forma natural:
- **Descrição**: "Me conte o que está acontecendo?"
- **Área**: "É um problema de TI ou elétrico?"
- **Setor**: "Qual é o seu departamento?"
- **Localização**: "Onde está o equipamento?"
- **Nome**: "Qual é o seu nome?"

### Passo 3: Confirmar e Criar
Após coletar, confirme com o usuário e chame a API.

### Passo 4: Informar Resultado
Retorne o número do ticket criado.

## API Call
```
POST {BACKEND_URL}/api/hermes/tickets
{
  "title": "...",
  "description": "...",
  "area": "TI" | "ELECTRIC",
  "sector": "...",
  "location": "...",
  "requesterName": "...",
  "phone": "..."
}
```

## Response
```json
{
  "ticket_id": "string",
  "ticket_number": "string",
  "status": "NEW",
  "estimated_response": "Em até 8 horas úteis"
}
```
SKILL_EOF

cat > "$SKILLS_DIR/helpdesk-check-status.md" << 'SKILL_EOF'
# Helpdesk Check Status

Consulta o status de um ticket existente.

## Trigger
- "status do chamado", "andamento", "ticket #1234"
- Intent: `consultar_ticket`

## API Call
```
GET {BACKEND_URL}/api/hermes/tickets/{ticket_id}
```

## Response
Retorne status, técnico atribuído, histórico.
SKILL_EOF

cat > "$SKILLS_DIR/helpdesk-faq.md" << 'SKILL_EOF'
# Helpdesk FAQ

Busca respostas na base de conhecimento.

## Trigger
- "como fazer", "pergunta frequente", "faq", "tenho dúvida"

## API Call
```
GET {BACKEND_URL}/api/hermes/faq/search?q={pergunta}
```

## Response
```json
{
  "results": [
    {
      "id": "string",
      "title": "string",
      "content": "string"
    }
  ]
}
```
SKILL_EOF

cat > "$SKILLS_DIR/helpdesk-escalate.md" << 'SKILL_EOF'
# Helpdesk Escalate

Escala para um atendente humano.

## Trigger
- "falar com atendente", "preciso de técnico"
- Quando problema requer intervenção humana

## API Call
```
POST {BACKEND_URL}/api/hermes/escalate
{
  "phone": "...",
  "problemSummary": "...",
  "urgency": "LOW|MEDIUM|HIGH|CRITICAL",
  "area": "TI|ELECTRIC"
}
```
SKILL_EOF

echo "✅ Skills instaladas em $SKILLS_DIR"

# =============================================================================
# CONFIGURAR HERMES .ENV
# =============================================================================

echo ""
echo "⚙️  Configurando Hermes..."

cat > "$HOME/.hermes/.env" << EOF
# =============================================================================
# Hermes Agent - Helpdesk Configuration
# Gerado automaticamente
# =============================================================================

# Backend API
BACKEND_URL=${BACKEND_URL}
BACKEND_API_KEY=${BACKEND_API_KEY}

# WhatsApp
WHATSAPP_ENABLED=true
WHATSAPP_MODE=bot
WHATSAPP_ALLOWED_USERS=*

# Model - Configure via 'hermes model' interativo
# Recomendado: OpenRouter com MiniMax-M2 ou Claude
EOF

echo "✅ .env configurado"

# =============================================================================
# CONFIGURAR HERMES CONFIG.YAML
# =============================================================================

mkdir -p "$HOME/.hermes"

cat > "$HOME/.hermes/config.yaml" << 'EOF'
# Hermes Helpdesk Config

model: openrouter/anthropic/claude-3-5-sonnet-latest
# Alternativas:
# model: openai/gpt-4o-mini
# model: openrouter/nousresearch/noushermes-2-mistral

display:
  tool_progress: new
  streaming: true

whatsapp:
  enabled: true
  mode: bot
  unauthorized_dm_behavior: ignore
  reply_prefix: ""

memory:
  provider: sqlite
  embedding_model: all-MiniLM-L6-v2
EOF

echo "✅ config.yaml configurado"

# =============================================================================
# INICIAR GATEWAY
# =============================================================================

echo ""
echo "🚀 Iniciando Hermes Gateway..."
echo "================================================"
echo ""
echo "Para iniciar manualmente:"
echo "  hermes gateway start"
echo ""
echo "Para ver logs:"
echo "  hermes gateway status"
echo "  journalctl --user -u hermes-gateway -f"
echo ""
echo "Para testar localmente:"
echo "  hermes"
echo ""
echo "================================================"
echo "✅ Setup concluído!"
echo ""
echo "PRÓXIMOS PASSOS:"
echo "1. Execute 'hermes model' para configurar o LLM"
echo "2. Execute 'hermes gateway start' para iniciar"
echo "3. Envie uma mensagem no WhatsApp para testar"
echo ""
