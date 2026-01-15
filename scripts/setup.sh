#!/bin/bash

# =============================================================================
# Helpdesk WhatsApp + GLPI - Script de Inicialização
# =============================================================================
# Uso:
#   ./scripts/setup.sh dev      - Modo desenvolvimento (com logs em tempo real)
#   ./scripts/setup.sh start    - Modo produção (background)
#   ./scripts/setup.sh stop     - Parar todos os containers
#   ./scripts/setup.sh restart  - Reiniciar containers
#   ./scripts/setup.sh status   - Ver status dos serviços
#   ./scripts/setup.sh logs     - Ver logs em tempo real
#   ./scripts/setup.sh backup   - Fazer backup do banco de dados
#   ./scripts/setup.sh infra    - Subir apenas infraestrutura (DB, Redis, RabbitMQ, GLPI)
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# =============================================================================
# Funções de utilidade
# =============================================================================

print_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}  🎫 Helpdesk WhatsApp + GLPI${NC}"
    echo -e "${CYAN}========================================${NC}\n"
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

# =============================================================================
# Verificação de dependências
# =============================================================================

check_dependencies() {
    print_info "Verificando dependências..."
    
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
    
    # Verificar Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | cut -d ' ' -f3)
        print_success "Git instalado (v$GIT_VERSION)"
    else
        print_warning "Git não encontrado (opcional)"
    fi
    
    # Verificar curl
    if command -v curl &> /dev/null; then
        print_success "curl instalado"
    else
        print_warning "curl não encontrado (recomendado para health checks)"
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
    print_info "Configurando ambiente..."
    
    # Criar diretórios necessários
    mkdir -p "$PROJECT_DIR/backups"
    print_success "Diretório de backups criado"
    
    # Verificar se .env existe, se não, copiar do exemplo
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        if [ -f "$PROJECT_DIR/.env.example" ]; then
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
            print_success "Arquivo .env criado a partir do .env.example"
            print_warning "Revise as configurações no arquivo .env antes de continuar!"
        else
            print_error "Arquivo .env.example não encontrado"
            exit 1
        fi
    else
        print_success "Arquivo .env encontrado"
    fi
    
    # Verificar se docker-compose.yml existe
    if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
        print_error "docker-compose.yml não encontrado"
        exit 1
    fi
    print_success "docker-compose.yml encontrado"
    
    # Verificar Dockerfiles
    local dockerfiles=("backend/Dockerfile" "bot/Dockerfile" "frontend/Dockerfile")
    for dockerfile in "${dockerfiles[@]}"; do
        if [ -f "$PROJECT_DIR/$dockerfile" ]; then
            print_success "$dockerfile encontrado"
        else
            print_warning "$dockerfile não encontrado (pode ser construído depois)"
        fi
    done
    
    echo ""
}

# =============================================================================
# Verificação de configuração de produção
# =============================================================================

check_production_config() {
    print_info "Verificando configuração de produção..."
    
    local warnings=0
    
    # Verificar se .env existe
    if [ -f "$PROJECT_DIR/.env" ]; then
        # Verificar JWT_SECRET
        if grep -q "sua-chave-secreta-jwt-altere-em-producao" "$PROJECT_DIR/.env"; then
            print_warning "JWT_SECRET padrão detectado!"
            echo "  Altere JWT_SECRET no arquivo .env"
            warnings=1
        fi
        
        # Verificar GLPI tokens
        if grep -q "seu_app_token_aqui" "$PROJECT_DIR/.env"; then
            print_warning "GLPI_APP_TOKEN não configurado!"
            echo "  Configure os tokens do GLPI no arquivo .env"
            warnings=1
        fi
    fi
    
    if [ $warnings -eq 0 ]; then
        print_success "Configuração de produção OK"
    else
        echo ""
        read -p "Deseja continuar mesmo assim? (s/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
    
    echo ""
}

# =============================================================================
# Comandos Docker Compose
# =============================================================================

# Definir comando compose (compatibilidade)
COMPOSE_CMD="${COMPOSE_CMD:-docker compose}"

build_containers() {
    print_info "Construindo containers..."
    $COMPOSE_CMD build
    print_success "Build concluído"
}

start_infra() {
    print_header
    check_dependencies
    setup_environment
    
    print_info "Iniciando apenas INFRAESTRUTURA (DB, Redis, RabbitMQ, GLPI)..."
    
    $COMPOSE_CMD up -d postgres redis rabbitmq mysql glpi
    
    print_success "Infraestrutura iniciada"
    echo ""
    
    # Aguardar serviços ficarem prontos
    wait_for_infra
    
    show_infra_status
}

start_dev() {
    print_header
    check_dependencies
    setup_environment
    
    print_info "Iniciando em modo DESENVOLVIMENTO..."
    print_info "Os logs serão exibidos em tempo real"
    print_info "Pressione Ctrl+C para parar\n"
    
    $COMPOSE_CMD up --build
}

start_production() {
    print_header
    check_dependencies
    setup_environment
    check_production_config
    
    print_info "Iniciando em modo PRODUÇÃO..."
    
    # Build e start em background
    $COMPOSE_CMD up -d --build
    
    print_success "Containers iniciados em background"
    echo ""
    
    # Aguardar serviços ficarem prontos
    wait_for_services
    
    show_status
}

stop_containers() {
    print_info "Parando containers..."
    $COMPOSE_CMD down
    print_success "Containers parados"
}

restart_containers() {
    print_info "Reiniciando containers..."
    $COMPOSE_CMD restart
    print_success "Containers reiniciados"
    show_status
}

show_logs() {
    print_info "Exibindo logs (Ctrl+C para sair)..."
    $COMPOSE_CMD logs -f
}

# =============================================================================
# Status e Health Checks
# =============================================================================

wait_for_infra() {
    print_info "Aguardando infraestrutura ficar pronta..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo -ne "\r  Tentativa $attempt/$max_attempts..."
        
        # Verificar PostgreSQL
        if docker exec helpdesk_postgres pg_isready -U helpdesk &> /dev/null; then
            echo ""
            print_success "PostgreSQL pronto!"
            break
        fi
        
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo ""
        print_warning "Timeout aguardando PostgreSQL. Verifique os logs."
    fi
}

wait_for_services() {
    print_info "Aguardando serviços ficarem prontos..."
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo -ne "\r  Tentativa $attempt/$max_attempts..."
        
        # Verificar se todos os containers estão rodando
        if $COMPOSE_CMD ps | grep -q "Up"; then
            # Tentar health check do backend
            if curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null | grep -q "200"; then
                echo ""
                print_success "Todos os serviços estão prontos!"
                return 0
            fi
        fi
        
        sleep 3
        ((attempt++))
    done
    
    echo ""
    print_warning "Timeout aguardando serviços. Verifique os logs."
}

show_infra_status() {
    echo ""
    print_info "Status da infraestrutura:"
    echo ""
    $COMPOSE_CMD ps postgres redis rabbitmq mysql glpi
    echo ""
    
    print_info "URLs disponíveis:"
    echo -e "  ${CYAN}PostgreSQL:${NC} localhost:5432"
    echo -e "  ${CYAN}Redis:${NC}      localhost:6379"
    echo -e "  ${CYAN}RabbitMQ:${NC}   http://localhost:15672 (helpdesk/helpdesk123)"
    echo -e "  ${CYAN}GLPI:${NC}       http://localhost:8080"
    echo ""
}

show_status() {
    echo ""
    print_info "Status dos serviços:"
    echo ""
    $COMPOSE_CMD ps
    echo ""
    
    # Health checks
    print_info "Health Checks:"
    
    # Backend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null | grep -q "200"; then
        print_success "Backend: http://localhost:4000 ✓"
    else
        print_error "Backend: http://localhost:4000 ✗"
    fi
    
    # Frontend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:4001 2>/dev/null | grep -q "200"; then
        print_success "Frontend: http://localhost:4001 ✓"
    else
        print_error "Frontend: http://localhost:4001 ✗"
    fi
    
    # GLPI
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null | grep -q "200\|302"; then
        print_success "GLPI: http://localhost:8080 ✓"
    else
        print_error "GLPI: http://localhost:8080 ✗"
    fi
    
    # RabbitMQ Management
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:15672 2>/dev/null | grep -q "200\|301"; then
        print_success "RabbitMQ: http://localhost:15672 ✓"
    else
        print_error "RabbitMQ: http://localhost:15672 ✗"
    fi
    
    echo ""
    print_info "URLs de acesso:"
    echo -e "  ${CYAN}Frontend:${NC}  http://localhost:4001"
    echo -e "  ${CYAN}Backend:${NC}   http://localhost:4000"
    echo -e "  ${CYAN}GLPI:${NC}      http://localhost:8080"
    echo -e "  ${CYAN}RabbitMQ:${NC}  http://localhost:15672"
    echo ""
}

# =============================================================================
# Backup
# =============================================================================

create_backup() {
    print_info "Criando backup dos bancos de dados..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    # Verificar se o container do PostgreSQL está rodando
    if ! $COMPOSE_CMD ps postgres | grep -q "Up"; then
        print_error "Container do PostgreSQL não está rodando"
        exit 1
    fi
    
    # Backup PostgreSQL (helpdesk)
    local pg_backup="$PROJECT_DIR/backups/helpdesk_postgres_$timestamp.sql.gz"
    docker exec helpdesk_postgres pg_dump -U helpdesk helpdesk | gzip > "$pg_backup"
    
    if [ -f "$pg_backup" ]; then
        local size=$(du -h "$pg_backup" | cut -f1)
        print_success "Backup PostgreSQL: $pg_backup ($size)"
    else
        print_error "Falha ao criar backup PostgreSQL"
    fi
    
    # Backup MySQL (GLPI) se estiver rodando
    if $COMPOSE_CMD ps mysql | grep -q "Up"; then
        local mysql_backup="$PROJECT_DIR/backups/glpi_mysql_$timestamp.sql.gz"
        docker exec helpdesk_mysql mysqldump -u glpi -pglpi123 glpi | gzip > "$mysql_backup"
        
        if [ -f "$mysql_backup" ]; then
            local size=$(du -h "$mysql_backup" | cut -f1)
            print_success "Backup MySQL (GLPI): $mysql_backup ($size)"
        fi
    fi
    
    # Limpar backups antigos (manter últimos 7)
    print_info "Limpando backups antigos (mantendo últimos 7)..."
    ls -t "$PROJECT_DIR/backups/"*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm
    print_success "Limpeza concluída"
}

# =============================================================================
# Help
# =============================================================================

show_help() {
    echo "🎫 Helpdesk WhatsApp + GLPI - Script de Inicialização"
    echo ""
    echo "Uso: $0 <comando>"
    echo ""
    echo "Comandos disponíveis:"
    echo "  dev       Inicia em modo desenvolvimento (logs em tempo real)"
    echo "  start     Inicia em modo produção (background)"
    echo "  infra     Inicia apenas infraestrutura (DB, Redis, RabbitMQ, GLPI)"
    echo "  stop      Para todos os containers"
    echo "  restart   Reinicia os containers"
    echo "  status    Mostra status dos serviços"
    echo "  logs      Exibe logs em tempo real"
    echo "  backup    Cria backup dos bancos de dados"
    echo "  build     Apenas faz build dos containers"
    echo "  help      Exibe esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 dev        # Desenvolvimento local com logs"
    echo "  $0 infra      # Subir apenas DB, Redis, RabbitMQ, GLPI"
    echo "  $0 start      # Deploy em produção (background)"
    echo "  $0 backup     # Backup antes de atualização"
    echo ""
    echo "Portas utilizadas:"
    echo "  4000  - Backend NestJS"
    echo "  4001  - Frontend Next.js"
    echo "  5432  - PostgreSQL"
    echo "  3306  - MySQL (GLPI)"
    echo "  6379  - Redis"
    echo "  5672  - RabbitMQ"
    echo "  15672 - RabbitMQ Management"
    echo "  8080  - GLPI"
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
    infra|infrastructure)
        start_infra
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
    build)
        check_dependencies
        build_containers
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_header
        show_help
        exit 1
        ;;
esac
