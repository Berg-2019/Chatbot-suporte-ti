#!/bin/bash

# ============================================
# Bot WhatsApp Atendimento - Script de Parada
# ============================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Bot WhatsApp Atendimento - Parando${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Parar processos Node.js relacionados ao projeto
echo -e "${YELLOW}🛑 Parando serviços do bot...${NC}"

# Parar processos do Next.js (porta 8000)
if lsof -ti :8000 >/dev/null 2>&1; then
    lsof -ti :8000 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✅ Interface web parada${NC}"
else
    echo -e "${YELLOW}⚠️  Interface web já estava parada${NC}"
fi

# Parar processos do bot WhatsApp
pkill -f "node.*bot.js" 2>/dev/null && echo -e "${GREEN}✅ Bot WhatsApp parado${NC}" || echo -e "${YELLOW}⚠️  Bot já estava parado${NC}"

# Parar concurrently
pkill -f "concurrently" 2>/dev/null

echo ""
echo -e "${GREEN}✅ Todos os serviços parados${NC}"
