#!/bin/bash
# =============================================================================
# Helpdesk - Script Unificado de Gerenciamento
# =============================================================================
# Comandos:
#   install     - Instala dependências (npm install em todos os serviços)
#   build       - Constrói imagens Docker para produção
#   dev         - Inicia ambiente de desenvolvimento (hot-reload via Docker)
#   prod        - Inicia em produção
#   stop        - Para todos os containers
#   logs        - Mostra logs (opcional: nome do serviço)
#   status      - Status dos containers
#   migrate     - Executa migrações do Prisma
#   shell       - Acessa shell de um container
#   help        - Mostra esta ajuda
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

# Detectar docker compose
if docker compose version &>/dev/null; then
    DOCKER_COMPOSE="docker compose"
elif docker-compose --version &>/dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}❌ Docker Compose não encontrado!${NC}"
    exit 1
fi

# =============================================================================
# Funções de UI
# =============================================================================
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

show_help() {
    echo -e "${BLUE}Uso:${NC} $0 [comando] [opções]"
    echo ""
    echo -e "${YELLOW}Comandos disponíveis:${NC}"
    echo ""
    echo -e "  ${GREEN}install${NC}          Instala dependências npm em todos os serviços"
    echo -e "  ${GREEN}build${NC}            Constrói imagens Docker para produção"
    echo -e "  ${GREEN}dev${NC}              Inicia ambiente de desenvolvimento (hot-reload)"
    echo -e "  ${GREEN}prod${NC}             Inicia em modo produção"
    echo -e "  ${GREEN}stop${NC}             Para todos os containers"
    echo -e "  ${GREEN}logs${NC} [serviço]   Mostra logs (todos ou de um serviço específico)"
    echo -e "  ${GREEN}status${NC}           Mostra status dos containers"
    echo -e "  ${GREEN}migrate${NC}          Executa migrações do Prisma"
    echo -e "  ${GREEN}shell${NC} <serviço>  Acessa shell de um container"
    echo -e "  ${GREEN}help${NC}             Mostra esta mensagem"
    echo ""
    echo -e "${YELLOW}Exemplos:${NC}"
    echo "  $0 dev                # Inicia desenvolvimento"
    echo "  $0 prod               # Inicia produção"
    echo "  $0 logs backend       # Ver logs do backend"
    echo "  $0 shell backend      # Acessar shell do backend"
    echo ""
}

check_env() {
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  Arquivo .env não encontrado${NC}"
        if [ -f ".env.example" ]; then
            echo -e "${YELLOW}   Criando a partir de .env.example...${NC}"
            cp .env.example .env
            echo -e "${GREEN}   ✅ .env criado. Configure suas variáveis!${NC}"
        else
            echo -e "${RED}   ❌ .env.example também não existe!${NC}"
            exit 1
        fi
    fi
}

# =============================================================================
# Comandos
# =============================================================================
cmd_install() {
    echo -e "${BLUE}📦 Instalando dependências do backend...${NC}"
    echo ""

    cd "$SCRIPT_DIR/backend" && npm install
    npx prisma generate

    cd "$SCRIPT_DIR"
    echo ""
    echo -e "${GREEN}✅ Dependências instaladas!${NC}"
    echo -e "${YELLOW}ℹ️  Frontend: 'cd Frontend-chatbot && bun install' (gitignored, neste repo).${NC}"
}

cmd_build() {
    echo -e "${BLUE}🔨 Construindo imagens Docker para produção...${NC}"
    echo ""
    check_env
    
    $DOCKER_COMPOSE -f docker-compose.yml build
    
    echo ""
    echo -e "${GREEN}✅ Imagens construídas!${NC}"
}

cmd_dev() {
    echo -e "${YELLOW}🔧 Iniciando ambiente de DESENVOLVIMENTO...${NC}"
    echo ""
    check_env
    
    echo -e "${BLUE}🐳 Iniciando containers com hot-reload...${NC}"
    $DOCKER_COMPOSE -f docker-compose.dev.yml up -d
    
    echo ""
    echo -e "${BLUE}📦 Regenerando Prisma Client...${NC}"
    sleep 5  # Aguardar container inicializar
    docker exec helpdesk_backend_dev npx prisma generate 2>/dev/null || true
    
    echo ""
    echo -e "${GREEN}✅ Ambiente de desenvolvimento iniciado!${NC}"
    echo ""
    echo -e "   Backend:       ${BLUE}http://localhost:3000${NC} (debug: 9229)"
    echo -e "   Hermes Agent:  porta ${BLUE}3004${NC}"
    echo -e "   Hermes Tools:  porta ${BLUE}3003${NC}"
    echo -e "   RabbitMQ:      ${BLUE}http://localhost:15672${NC}"
    echo -e "   Frontend:      rode em ${BLUE}./Frontend-chatbot${NC} (bun run dev:all)"
    echo ""
    echo -e "   Use ${YELLOW}$0 logs${NC} para ver logs"
    echo -e "   Use ${YELLOW}$0 stop${NC} para parar"
}

cmd_prod() {
    echo -e "${GREEN}🚀 Iniciando em modo PRODUÇÃO...${NC}"
    echo ""
    check_env
    
    echo -e "${BLUE}📦 Construindo imagens...${NC}"
    $DOCKER_COMPOSE -f docker-compose.yml build
    
    echo ""
    echo -e "${BLUE}🔄 Iniciando containers...${NC}"
    $DOCKER_COMPOSE -f docker-compose.yml up -d
    
    echo ""
    echo -e "${GREEN}✅ Serviços iniciados em modo produção!${NC}"
    echo ""
    echo -e "   Backend:  ${BLUE}https://api.helpdeskmsm.com.br${NC}"
    echo -e "   Frontend: ${BLUE}https://ti.helpdeskmsm.com.br${NC} (servido por nginx, build estático)"
    echo -e "   RabbitMQ: ${BLUE}http://localhost:15672${NC}"
    echo ""
    echo -e "   Use ${YELLOW}$0 logs${NC} para ver logs"
    echo -e "   Use ${YELLOW}$0 stop${NC} para parar"
}

cmd_stop() {
    echo -e "${YELLOW}🛑 Parando serviços...${NC}"
    echo ""
    
    # Parar containers de dev
    if $DOCKER_COMPOSE -f docker-compose.dev.yml ps -q 2>/dev/null | grep -q .; then
        echo -e "${BLUE}Parando containers de desenvolvimento...${NC}"
        $DOCKER_COMPOSE -f docker-compose.dev.yml down
    fi
    
    # Parar containers de prod
    if $DOCKER_COMPOSE -f docker-compose.yml ps -q 2>/dev/null | grep -q .; then
        echo -e "${BLUE}Parando containers de produção...${NC}"
        $DOCKER_COMPOSE -f docker-compose.yml down
    fi
    
    echo ""
    echo -e "${GREEN}✅ Serviços parados!${NC}"
}

cmd_logs() {
    local service="$1"
    
    # Detectar qual compose está rodando
    if $DOCKER_COMPOSE -f docker-compose.dev.yml ps -q 2>/dev/null | grep -q .; then
        COMPOSE_FILE="docker-compose.dev.yml"
        echo -e "${BLUE}📋 Logs (desenvolvimento)...${NC}"
    else
        COMPOSE_FILE="docker-compose.yml"
        echo -e "${BLUE}📋 Logs (produção)...${NC}"
    fi
    
    echo ""
    if [ -n "$service" ]; then
        $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f --tail=100 "$service"
    else
        $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f --tail=100
    fi
}

cmd_status() {
    echo -e "${BLUE}📊 Status dos serviços...${NC}"
    echo ""
    
    # Dev containers
    if $DOCKER_COMPOSE -f docker-compose.dev.yml ps -q 2>/dev/null | grep -q .; then
        echo -e "${GREEN}Containers de DESENVOLVIMENTO:${NC}"
        $DOCKER_COMPOSE -f docker-compose.dev.yml ps
        echo ""
    fi
    
    # Prod containers
    if $DOCKER_COMPOSE -f docker-compose.yml ps -q 2>/dev/null | grep -q .; then
        echo -e "${GREEN}Containers de PRODUÇÃO:${NC}"
        $DOCKER_COMPOSE -f docker-compose.yml ps
        echo ""
    fi
    
    # Se nenhum está rodando
    if ! $DOCKER_COMPOSE -f docker-compose.dev.yml ps -q 2>/dev/null | grep -q . && \
       ! $DOCKER_COMPOSE -f docker-compose.yml ps -q 2>/dev/null | grep -q .; then
        echo -e "${YELLOW}Nenhum container rodando${NC}"
    fi
}

cmd_migrate() {
    echo -e "${BLUE}🗃️  Executando migrações do Prisma...${NC}"
    echo ""
    
    # Detectar qual compose está rodando
    if $DOCKER_COMPOSE -f docker-compose.dev.yml ps -q 2>/dev/null | grep -q .; then
        COMPOSE_FILE="docker-compose.dev.yml"
        CONTAINER="helpdesk_backend_dev"
    else
        COMPOSE_FILE="docker-compose.yml"
        CONTAINER="helpdesk_backend"
    fi
    
    docker exec -it $CONTAINER npx prisma migrate deploy
    
    echo ""
    echo -e "${GREEN}✅ Migrações executadas!${NC}"
}

cmd_shell() {
    local service="$1"
    
    if [ -z "$service" ]; then
        echo -e "${RED}❌ Especifique um serviço: $0 shell <serviço>${NC}"
        echo -e "   Serviços: backend, hermes, hermes-tools, postgres, redis, rabbitmq"
        exit 1
    fi
    
    # Detectar qual compose está rodando
    if $DOCKER_COMPOSE -f docker-compose.dev.yml ps -q 2>/dev/null | grep -q .; then
        COMPOSE_FILE="docker-compose.dev.yml"
    else
        COMPOSE_FILE="docker-compose.yml"
    fi
    
    echo -e "${BLUE}🐚 Acessando shell do serviço: $service${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_FILE exec "$service" sh
}

# =============================================================================
# Main
# =============================================================================
show_banner

case "${1:-help}" in
    install)
        cmd_install
        ;;
    build)
        cmd_build
        ;;
    dev|development)
        cmd_dev
        ;;
    prod|production)
        cmd_prod
        ;;
    stop)
        cmd_stop
        ;;
    logs|log)
        cmd_logs "$2"
        ;;
    status)
        cmd_status
        ;;
    migrate)
        cmd_migrate
        ;;
    shell|sh)
        cmd_shell "$2"
        ;;
    help|--help|-h|*)
        show_help
        ;;
esac
