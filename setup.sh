#!/bin/bash
# =============================================================================
# Helpdesk - Script de Gerenciamento
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║                       🎫 HELPDESK                              ║"
    echo "║                                                                ║"
    echo "║                Sistema de Atendimento Técnico                  ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

show_usage() {
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos:"
    echo "  dev       Iniciar em modo desenvolvimento (local)"
    echo "  prod      Iniciar em modo produção (Docker)"
    echo "  stop      Parar todos os serviços"
    echo "  logs      Ver logs dos containers"
    echo "  status    Ver status dos containers"
    echo ""
}

start_dev() {
    echo -e "${YELLOW}🔧 Iniciando em modo DESENVOLVIMENTO...${NC}"
    echo ""
    
    # Verificar dependências
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js não encontrado!${NC}"
        exit 1
    fi

    echo -e "${BLUE}[1/3] Iniciando Backend...${NC}"
    cd "$SCRIPT_DIR/backend"
    npm run start:dev &
    BACKEND_PID=$!
    sleep 3
    
    echo -e "${BLUE}[2/3] Iniciando Frontend...${NC}"
    cd "$SCRIPT_DIR/frontend"
    npm run dev &
    FRONTEND_PID=$!
    sleep 2
    
    echo -e "${BLUE}[3/3] Iniciando Bot...${NC}"
    cd "$SCRIPT_DIR/bot"
    node src/index.js &
    BOT_PID=$!
    
    cd "$SCRIPT_DIR"
    
    echo ""
    echo -e "${GREEN}✅ Serviços iniciados em modo desenvolvimento!${NC}"
    echo ""
    echo -e "   Backend:  ${BLUE}http://localhost:3000${NC} (PID: $BACKEND_PID)"
    echo -e "   Frontend: ${BLUE}http://localhost:3001${NC} (PID: $FRONTEND_PID)"
    echo -e "   Bot:      PID: $BOT_PID"
    echo ""
    echo -e "   Pressione ${YELLOW}Ctrl+C${NC} para parar todos os serviços"
    
    # Aguardar até Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID $BOT_PID 2>/dev/null; echo -e '\n${YELLOW}Serviços parados${NC}'; exit" SIGINT SIGTERM
    wait
}

start_prod() {
    echo -e "${GREEN}🚀 Iniciando em modo PRODUÇÃO (Docker)...${NC}"
    echo ""
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker não encontrado!${NC}"
        exit 1
    fi
    
    # Verificar .env
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  Arquivo .env não encontrado${NC}"
        if [ -f ".env.example" ]; then
            echo -e "${YELLOW}   Criando a partir de .env.example...${NC}"
            cp .env.example .env
            echo -e "${GREEN}   ✅ .env criado. Configure suas variáveis!${NC}"
        fi
    fi
    
    echo -e "${BLUE}📦 Construindo imagens...${NC}"
    docker-compose -f docker-compose.prod.yml build
    
    echo ""
    echo -e "${BLUE}🔄 Iniciando containers...${NC}"
    docker-compose -f docker-compose.prod.yml up -d
    
    echo ""
    echo -e "${GREEN}✅ Serviços iniciados em modo produção!${NC}"
    echo ""
    echo -e "   Backend:  ${BLUE}http://localhost:4000${NC}"
    echo -e "   Frontend: ${BLUE}http://localhost:4001${NC}"
    echo ""
    echo -e "   Use ${YELLOW}$0 logs${NC} para ver logs"
    echo -e "   Use ${YELLOW}$0 stop${NC} para parar"
}

stop_services() {
    echo -e "${YELLOW}🛑 Parando serviços...${NC}"
    echo ""
    
    # Parar Docker
    if docker-compose -f docker-compose.prod.yml ps -q 2>/dev/null | grep -q .; then
        echo -e "${BLUE}Parando containers Docker...${NC}"
        docker-compose -f docker-compose.prod.yml down
    fi
    
    # Matar processos locais se existirem
    pkill -f "npm run start:dev" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "node src/index.js" 2>/dev/null || true
    
    echo ""
    echo -e "${GREEN}✅ Serviços parados!${NC}"
}

show_logs() {
    echo -e "${BLUE}📋 Logs dos containers...${NC}"
    echo ""
    docker-compose -f docker-compose.prod.yml logs -f --tail=100
}

show_status() {
    echo -e "${BLUE}📊 Status dos serviços...${NC}"
    echo ""
    
    if docker-compose -f docker-compose.prod.yml ps -q 2>/dev/null | grep -q .; then
        echo -e "${GREEN}Docker (Produção):${NC}"
        docker-compose -f docker-compose.prod.yml ps
    else
        echo -e "${YELLOW}Nenhum container de produção rodando${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}Processos Node.js:${NC}"
    pgrep -a node 2>/dev/null | grep -E "(backend|frontend|bot)" || echo "Nenhum processo local encontrado"
}

# =============================================================================
# Main
# =============================================================================

show_banner

case "${1:-}" in
    dev)
        start_dev
        ;;
    prod|production)
        start_prod
        ;;
    stop)
        stop_services
        ;;
    logs|log)
        show_logs
        ;;
    status)
        show_status
        ;;
    *)
        show_usage
        ;;
esac
