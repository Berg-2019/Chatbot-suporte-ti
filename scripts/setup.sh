#!/bin/bash

# =============================================================================
# Bot WhatsApp Atendimento - Script de Inicialização
# =============================================================================
# Uso:
#   ./scripts/setup.sh dev      - Modo desenvolvimento (com logs em tempo real)
#   ./scripts/setup.sh start    - Modo produção (background)
#   ./scripts/setup.sh stop     - Parar containers
#   ./scripts/setup.sh restart  - Reiniciar containers
#   ./scripts/setup.sh status   - Ver status dos serviços
#   ./scripts/setup.sh logs     - Ver logs em tempo real
#   ./scripts/setup.sh backup   - Fazer backup do banco de dados
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# =============================================================================
# Funções de utilidade
# =============================================================================

print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║     🤖 Bot WhatsApp - Atendimento Técnico                    ║"
    echo "║                                                               ║"
    echo "║     Sistema de Ordens de Serviço via WhatsApp                ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_step() {
    echo -e "${PURPLE}➤ $1${NC}"
}

# =============================================================================
# Verificação de dependências
# =============================================================================

check_dependencies() {
    print_step "Verificando dependências..."
    echo ""
    
    local missing_deps=0
    
    # Verificar Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | tr -d ',')
        print_success "Docker instalado (v$DOCKER_VERSION)"
    else
        print_error "Docker não encontrado"
        echo "  Instale em: https://docs.docker.com/engine/install/"
        missing_deps=1
    fi
    
    # Verificar Docker Compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d ' ' -f4 | tr -d ',')
        print_success "Docker Compose instalado (v$COMPOSE_VERSION)"
    elif docker compose version &> /dev/null 2>&1; then
        COMPOSE_VERSION=$(docker compose version | cut -d ' ' -f4)
        print_success "Docker Compose (plugin) instalado (v$COMPOSE_VERSION)"
        COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose não encontrado"
        echo "  Instale em: https://docs.docker.com/compose/install/"
        missing_deps=1
    fi
    
    # Verificar se Docker está rodando
    if docker info &> /dev/null 2>&1; then
        print_success "Docker daemon está rodando"
    else
        print_error "Docker daemon não está rodando"
        echo "  Execute: sudo systemctl start docker"
        missing_deps=1
    fi
    
    if [ $missing_deps -eq 1 ]; then
        print_error "Dependências faltando. Instale-as e tente novamente."
        exit 1
    fi
    
    echo ""
}

# =============================================================================
# Configuração do ambiente
# =============================================================================

setup_environment() {
    print_step "Configurando ambiente..."
    
    # Criar diretórios necessários
    mkdir -p "$PROJECT_DIR/backups"
    mkdir -p "$PROJECT_DIR/bot-whatsapp/logs"
    print_success "Diretórios criados"
    
    # Verificar se docker-compose.yml existe
    if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
        print_error "docker-compose.yml não encontrado"
        exit 1
    fi
    print_success "docker-compose.yml encontrado"
    
    # Verificar Dockerfile
    if [ ! -f "$PROJECT_DIR/Dockerfile" ]; then
        print_error "Dockerfile não encontrado"
        exit 1
    fi
    print_success "Dockerfile encontrado"
    
    # Verificar/criar .env
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        if [ -f "$PROJECT_DIR/.env.example" ]; then
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
            print_warning "Arquivo .env criado a partir do .env.example"
            print_warning "Configure as variáveis de ambiente antes de iniciar!"
        else
            print_warning "Arquivo .env não encontrado, usando valores padrão"
        fi
    else
        print_success "Arquivo .env encontrado"
    fi
    
    echo ""
}

# =============================================================================
# Comandos Docker Compose
# =============================================================================

# Definir comando compose (compatibilidade)
COMPOSE_CMD="${COMPOSE_CMD:-docker-compose}"

build_containers() {
    print_step "Construindo containers..."
    $COMPOSE_CMD build
    print_success "Build concluído"
}

start_dev() {
    print_banner
    check_dependencies
    setup_environment
    
    print_step "Iniciando em modo DESENVOLVIMENTO..."
    print_info "Os logs serão exibidos em tempo real"
    print_info "Pressione Ctrl+C para parar"
    echo ""
    
    $COMPOSE_CMD up --build
}

start_production() {
    print_banner
    check_dependencies
    setup_environment
    
    print_step "Iniciando em modo PRODUÇÃO..."
    
    # Build e start em background
    $COMPOSE_CMD up -d --build
    
    print_success "Container iniciado em background"
    echo ""
    
    # Aguardar serviço ficar pronto
    wait_for_services
    
    show_status
}

stop_containers() {
    print_step "Parando containers..."
    $COMPOSE_CMD down
    print_success "Containers parados"
}

restart_containers() {
    print_step "Reiniciando containers..."
    $COMPOSE_CMD restart
    print_success "Containers reiniciados"
    show_status
}

show_logs() {
    print_step "Exibindo logs (Ctrl+C para sair)..."
    $COMPOSE_CMD logs -f
}

# =============================================================================
# Status e Health Checks
# =============================================================================

wait_for_services() {
    print_step "Aguardando serviço ficar pronto..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo -ne "\r  Tentativa $attempt/$max_attempts..."
        
        # Verificar se o container está rodando
        if $COMPOSE_CMD ps bot 2>/dev/null | grep -q "Up\|running"; then
            echo ""
            print_success "Serviço pronto!"
            return 0
        fi
        
        sleep 2
        ((attempt++))
    done
    
    echo ""
    print_warning "Timeout aguardando serviço. Verifique os logs com: $0 logs"
}

show_status() {
    echo ""
    print_step "Status dos serviços:"
    echo ""
    $COMPOSE_CMD ps -a
    echo ""
}

# =============================================================================
# Backup
# =============================================================================

create_backup() {
    print_step "Criando backup do banco de dados..."
    
    local backup_dir="$PROJECT_DIR/backups"
    local backup_file="$backup_dir/bot_atendimento_$(date +%Y%m%d_%H%M%S).db"
    
    mkdir -p "$backup_dir"
    
    # Verificar se o container está rodando
    if ! $COMPOSE_CMD ps bot 2>/dev/null | grep -q "Up\|running"; then
        print_error "Container do bot não está rodando"
        exit 1
    fi
    
    # Copiar banco de dados SQLite
    docker cp bot-whatsapp-atendimento:/app/db/atendimento.db "$backup_file"
    
    if [ -f "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "Backup criado: $backup_file ($size)"
    else
        print_error "Falha ao criar backup"
        exit 1
    fi
    
    # Limpar backups antigos (manter últimos 10)
    print_info "Limpando backups antigos (mantendo últimos 10)..."
    ls -t "$backup_dir/"*.db 2>/dev/null | tail -n +11 | xargs -r rm 2>/dev/null || true
    print_success "Limpeza concluída"
}

# =============================================================================
# Inicializar banco de dados
# =============================================================================

init_database() {
    print_step "Inicializando banco de dados..."
    
    if $COMPOSE_CMD ps bot 2>/dev/null | grep -q "Up\|running"; then
        docker exec bot-whatsapp-atendimento node init-db.js
        print_success "Banco de dados inicializado"
    else
        print_error "Container do bot não está rodando"
        echo "  Inicie primeiro com: $0 start"
        exit 1
    fi
}

# =============================================================================
# Conectar WhatsApp (exibir QR/código de pareamento)
# =============================================================================

connect_whatsapp() {
    print_step "Iniciando conexão com WhatsApp..."
    print_info "Acompanhe os logs para ver o código de pareamento"
    echo ""
    
    $COMPOSE_CMD logs -f bot
}

# =============================================================================
# Help
# =============================================================================

show_help() {
    echo "Bot WhatsApp Atendimento - Script de Gerenciamento"
    echo ""
    echo "Uso: $0 <comando>"
    echo ""
    echo "Comandos disponíveis:"
    echo ""
    echo "  ${GREEN}Inicialização:${NC}"
    echo "    dev         Inicia em modo desenvolvimento (logs em tempo real)"
    echo "    start       Inicia em modo produção (background)"
    echo ""
    echo "  ${YELLOW}Gerenciamento:${NC}"
    echo "    stop        Para o container"
    echo "    restart     Reinicia o container"
    echo "    status      Mostra status do serviço"
    echo "    logs        Exibe logs em tempo real"
    echo ""
    echo "  ${BLUE}Manutenção:${NC}"
    echo "    backup      Cria backup do banco de dados"
    echo "    init-db     Inicializa/reseta o banco de dados"
    echo "    connect     Exibe logs para conectar WhatsApp"
    echo "    build       Apenas faz build do container"
    echo ""
    echo "  ${PURPLE}Ajuda:${NC}"
    echo "    help        Exibe esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 dev        # Desenvolvimento local"
    echo "  $0 start      # Deploy em produção"
    echo "  $0 backup     # Backup antes de atualização"
    echo ""
}

# =============================================================================
# Main
# =============================================================================

case "${1:-}" in
    dev)
        start_dev
        ;;
    start|prod|production)
        start_production
        ;;
    stop)
        stop_containers
        ;;
    restart)
        restart_containers
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    backup)
        create_backup
        ;;
    init-db|initdb)
        init_database
        ;;
    connect)
        connect_whatsapp
        ;;
    build)
        check_dependencies
        build_containers
        ;;
    help|--help|-h)
        print_banner
        show_help
        ;;
    *)
        print_banner
        show_help
        exit 1
        ;;
esac
