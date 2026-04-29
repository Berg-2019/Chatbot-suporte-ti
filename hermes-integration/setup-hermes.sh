#!/bin/bash
# =============================================================================
# Hermes Agent Setup for Helpdesk Integration
# =============================================================================
# Este script configura o Hermes Agent com as skills de helpdesk
# Rodar na primeira vez ou quando reinicializar o container
# =============================================================================

set -e

echo "=========================================="
echo "  Hermes Helpdesk Setup"
echo "=========================================="
echo ""

# Setup directories
export HERMES_HOME="${HERMES_HOME:-/opt/data}"
SKILLS_SOURCE="/opt/hermes/skills/helpdesk-conversation"
SKILLS_TARGET="$HERMES_HOME/skills"

echo "📁 HERMES_HOME: $HERMES_HOME"
echo "📁 Skills source: $SKILLS_SOURCE"
echo "📁 Skills target: $SKILLS_TARGET"
echo ""

# Create skills directory
mkdir -p "$SKILLS_TARGET"

# Copy helpdesk skills
if [ -d "$SKILLS_SOURCE" ]; then
    echo "📋 Copiando skills de helpdesk..."
    cp -r "$SKILLS_SOURCE" "$SKILLS_TARGET/"
    echo "✅ Skills copiadas com sucesso!"
else
    echo "⚠️ Skills source não encontrada em $SKILLS_SOURCE"
    echo "   As skills precisarão ser configuradas manualmente"
fi

# Check if WhatsApp session exists
WHATSAPP_SESSION="$HERMES_HOME/platforms/whatsapp/session"
if [ -d "$WHATSAPP_SESSION" ] && [ -n "$(ls -A "$WHATSAPP_SESSION" 2>/dev/null)" ]; then
    echo ""
    echo "📱 WhatsApp session encontrada!"
    echo "   Session dir: $WHATSAPP_SESSION"
else
    echo ""
    echo "📱 WhatsApp session não encontrada."
    echo "   Será necessário escanear o QR code na primeira conexão."
    echo "   Session dir: $WHATSAPP_SESSION"
fi

# Check API keys
echo ""
echo "🔑 Verificando configuração de API keys..."

if [ -n "$MINIMAX_API_KEY" ]; then
    echo "   ✅ MINIMAX_API_KEY configurada"
else
    echo "   ⚠️ MINIMAX_API_KEY não configurada"
fi

if [ -n "$OPENROUTER_API_KEY" ]; then
    echo "   ✅ OPENROUTER_API_KEY configurada"
else
    echo "   ⚠️ OPENROUTER_API_KEY não configurada (fallback)"
fi

echo ""
echo "=========================================="
echo "  Setup concluído!"
echo "=========================================="
echo ""
echo "Para iniciar o gateway:"
echo "  hermes gateway start"
echo ""
echo "Para escanear QR code do WhatsApp:"
echo "  hermes whatsapp"
echo ""
