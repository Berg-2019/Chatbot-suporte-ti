#!/bin/bash
# =============================================================================
# Helpdesk - Script de Inicialização
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║   🎫 HELPDESK - Sistema de Atendimento Técnico               ║"
echo "║                                                                ║"
echo "║   Iniciando serviços...                                       ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado${NC}"
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}   Criando a partir de .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}   ✅ .env criado. Edite com suas configurações.${NC}"
        echo ""
        echo -e "${RED}   IMPORTANTE: Configure o .env antes de continuar!${NC}"
        exit 1
    else
        echo -e "${RED}   ❌ .env.example também não existe!${NC}"
        exit 1
    fi
fi

# Carregar variáveis
source .env 2>/dev/null || true

# Modo de operação
MODE="${1:-prod}"

case "$MODE" in
    prod|production)
        echo -e "${GREEN}🚀 Modo: PRODUÇÃO (Docker)${NC}"
        echo ""
        
        # Build e start
        echo -e "${BLUE}📦 Construindo imagens...${NC}"
        docker-compose -f docker-compose.prod.yml build
        
        echo ""
        echo -e "${BLUE}🔄 Iniciando containers...${NC}"
        docker-compose -f docker-compose.prod.yml up -d
        
        echo ""
        echo -e "${GREEN}✅ Serviços iniciados!${NC}"
        echo ""
        echo -e "   Backend:  ${BLUE}http://localhost:4000${NC}"
        echo -e "   Frontend: ${BLUE}http://localhost:4001${NC}"
        echo ""
        echo -e "   Use ${YELLOW}./stop.sh${NC} para parar os serviços"
        echo -e "   Use ${YELLOW}docker-compose -f docker-compose.prod.yml logs -f${NC} para ver logs"
        ;;
        
    dev|development)
        echo -e "${YELLOW}🔧 Modo: DESENVOLVIMENTO (local)${NC}"
        echo ""
        echo "Iniciando em terminais separados..."
        echo ""
        
        # Backend
        gnome-terminal --tab --title="Backend" -- bash -c "cd backend && npm run start:dev; bash" 2>/dev/null || \
        xterm -title "Backend" -e "cd backend && npm run start:dev" &
        
        sleep 2
        
        # Frontend
        gnome-terminal --tab --title="Frontend" -- bash -c "cd frontend && npm run dev; bash" 2>/dev/null || \
        xterm -title "Frontend" -e "cd frontend && npm run dev" &
        
        sleep 2
        
        # Bot
        gnome-terminal --tab --title="Bot" -- bash -c "cd bot && node src/index.js; bash" 2>/dev/null || \
        xterm -title "Bot" -e "cd bot && node src/index.js" &
        
        echo -e "${GREEN}✅ Terminais abertos!${NC}"
        ;;
        
    full)
        echo -e "${BLUE}🔄 Modo: FULL (todos os serviços via Docker)${NC}"
        echo ""
        docker-compose up -d
        
        echo ""
        echo -e "${GREEN}✅ Todos os serviços iniciados!${NC}"
        ;;
        
    *)
        echo "Uso: $0 [prod|dev|full]"
        echo ""
        echo "  prod  - Produção: Backend, Frontend, Bot via Docker"
        echo "  dev   - Desenvolvimento: Scripts locais"
        echo "  full  - Full: Todos os serviços incluindo BD via Docker"
        exit 1
        ;;
esac

echo ""
