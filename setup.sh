#!/bin/bash
# ==============================================================================
# 🎫 HELPDESK WHATSAPP + GLPI
# Script de Inicialização
# ==============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Banner
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║   🎫 HELPDESK - Sistema de Atendimento Técnico                ║"
    echo "║                                                                ║"
    echo "║                                 ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Log
log() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Verificar dependências
check_dependencies() {
    echo -e "\n${PURPLE}═══ Verificando dependências ═══${NC}\n"
    
    local missing=0
    
    if command -v docker &> /dev/null; then
        log "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    else
        error "Docker não encontrado"
        missing=1
    fi
    
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        log "Docker Compose: disponível"
    else
        error "Docker Compose não encontrado"
        missing=1
    fi
    
    if command -v node &> /dev/null; then
        log "Node.js: $(node --version)"
    else
        error "Node.js não encontrado"
        missing=1
    fi
    
    if command -v npm &> /dev/null; then
        log "NPM: $(npm --version)"
    else
        error "NPM não encontrado"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        error "Instale as dependências faltantes e execute novamente"
        exit 1
    fi
    
    log "Todas as dependências OK!"
}

# Configurar .env
setup_env() {
    echo -e "\n${PURPLE}═══ Configurando ambiente ═══${NC}\n"
    
    if [ -f "$PROJECT_DIR/.env" ]; then
        warn "Arquivo .env já existe. Deseja sobrescrever? (s/N)"
        read -r response
        if [[ ! "$response" =~ ^[Ss]$ ]]; then
            log "Mantendo .env existente"
            return
        fi
    fi
    
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    
    # Gerar JWT_SECRET aleatório
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$PROJECT_DIR/.env"
    
    log "Arquivo .env criado com JWT_SECRET gerado"
    
    # Backend .env
    if [ -f "$PROJECT_DIR/backend/.env.example" ]; then
        cp "$PROJECT_DIR/backend/.env.example" "$PROJECT_DIR/backend/.env"
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$PROJECT_DIR/backend/.env"
        log "Backend .env configurado"
    fi
}

# Subir infraestrutura Docker
start_infrastructure() {
    echo -e "\n${PURPLE}═══ Subindo infraestrutura Docker ═══${NC}\n"
    
    cd "$PROJECT_DIR"
    
    info "Subindo PostgreSQL, Redis, RabbitMQ, GLPI..."
    docker compose up -d postgres redis rabbitmq glpi
    
    log "Containers iniciados"
    
    # Aguardar serviços
    info "Aguardando serviços ficarem prontos..."
    
    # PostgreSQL
    echo -n "  PostgreSQL: "
    for i in {1..30}; do
        if docker compose exec -T postgres pg_isready -U helpdesk &> /dev/null; then
            echo -e "${GREEN}OK${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Redis
    echo -n "  Redis: "
    for i in {1..15}; do
        if docker compose exec -T redis redis-cli ping &> /dev/null; then
            echo -e "${GREEN}OK${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # RabbitMQ
    echo -n "  RabbitMQ: "
    for i in {1..30}; do
        if docker compose exec -T rabbitmq rabbitmq-diagnostics -q ping &> /dev/null; then
            echo -e "${GREEN}OK${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # GLPI
    echo -n "  GLPI: "
    for i in {1..45}; do
        if curl -s http://localhost:8080 &> /dev/null; then
            echo -e "${GREEN}OK${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    log "Infraestrutura pronta!"
}

# Instalar dependências do backend
setup_backend() {
    echo -e "\n${PURPLE}═══ Configurando Backend ═══${NC}\n"
    
    cd "$PROJECT_DIR/backend"
    
    info "Instalando dependências..."
    npm install
    
    info "Gerando Prisma Client..."
    npx prisma generate
    
    info "Executando migrações..."
    npx prisma migrate dev --name init 2>/dev/null || npx prisma migrate deploy
    
    log "Backend configurado!"
}

# Instalar dependências do frontend
setup_frontend() {
    echo -e "\n${PURPLE}═══ Configurando Frontend ═══${NC}\n"
    
    cd "$PROJECT_DIR/frontend"
    
    info "Instalando dependências..."
    npm install
    
    log "Frontend configurado!"
}

# Instalar dependências do bot
setup_bot() {
    echo -e "\n${PURPLE}═══ Configurando Bot ═══${NC}\n"
    
    cd "$PROJECT_DIR/bot"
    
    info "Instalando dependências..."
    npm install
    
    log "Bot configurado!"
}

# Mostrar instruções GLPI
show_glpi_instructions() {
    echo -e "\n${PURPLE}═══ Configuração do GLPI ═══${NC}\n"
    
    echo -e "${YELLOW}O GLPI precisa de configuração manual inicial:${NC}"
    echo ""
    echo "1. Acesse: ${CYAN}http://localhost:8080${NC}"
    echo ""
    echo "2. Complete a instalação web:"
    echo "   - Idioma: Português (Brasil)"
    echo "   - Aceite a licença"
    echo "   - Banco de dados:"
    echo "     • Servidor: ${CYAN}postgres${NC}"
    echo "     • Usuário: ${CYAN}helpdesk${NC}"
    echo "     • Senha: ${CYAN}helpdesk123${NC} (ou sua senha do .env)"
    echo "     • Banco: ${CYAN}glpi${NC} (criar novo)"
    echo ""
    echo "3. Após instalação, faça login:"
    echo "   • Usuário: ${CYAN}glpi${NC}"
    echo "   • Senha: ${CYAN}glpi${NC}"
    echo ""
    echo "4. Habilite a API REST:"
    echo "   • Vá em: Configurar > Geral > API"
    echo "   • Ative: ${CYAN}Habilitar API REST${NC}"
    echo "   • Gere um ${CYAN}App-Token${NC}"
    echo "   • Gere um ${CYAN}User Token${NC} (API Token do usuário)"
    echo ""
    echo "5. Atualize o arquivo ${CYAN}.env${NC} com os tokens:"
    echo "   GLPI_APP_TOKEN=seu_app_token"
    echo "   GLPI_USER_TOKEN=seu_user_token"
    echo ""
}

# Iniciar desenvolvimento
start_dev() {
    echo -e "\n${PURPLE}═══ Iniciando em modo desenvolvimento ═══${NC}\n"
    
    info "Abrindo 3 terminais para:"
    echo "  • Backend (porta 3000)"
    echo "  • Frontend (porta 3001)"
    echo "  • Bot (WhatsApp)"
    echo ""
    
    # Verificar se gnome-terminal está disponível
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --tab --title="Backend" -- bash -c "cd $PROJECT_DIR/backend && npm run start:dev; exec bash"
        gnome-terminal --tab --title="Frontend" -- bash -c "cd $PROJECT_DIR/frontend && npm run dev; exec bash"
        gnome-terminal --tab --title="Bot" -- bash -c "cd $PROJECT_DIR/bot && node src/index.js; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -title "Backend" -e "cd $PROJECT_DIR/backend && npm run start:dev" &
        xterm -title "Frontend" -e "cd $PROJECT_DIR/frontend && npm run dev" &
        xterm -title "Bot" -e "cd $PROJECT_DIR/bot && node src/index.js" &
    else
        warn "Não foi possível abrir terminais automaticamente."
        echo ""
        echo "Execute manualmente em 3 terminais:"
        echo "  Terminal 1: cd $PROJECT_DIR/backend && npm run start:dev"
        echo "  Terminal 2: cd $PROJECT_DIR/frontend && npm run dev"  
        echo "  Terminal 3: cd $PROJECT_DIR/bot && node src/index.js"
    fi
    
    log "Serviços de desenvolvimento iniciados!"
}

# Mostrar status
show_status() {
    echo -e "\n${PURPLE}═══ Status dos Serviços ═══${NC}\n"
    
    docker compose ps
    
    echo ""
    echo -e "${CYAN}URLs de acesso:${NC}"
    echo "  • Frontend: http://localhost:3001"
    echo "  • Backend API: http://localhost:3000"
    echo "  • GLPI: http://localhost:8080"
    echo "  • RabbitMQ: http://localhost:15672 (helpdesk/helpdesk123)"
    echo ""
    echo -e "${CYAN}Login padrão:${NC}"
    echo "  • Email: admin@empresa.com"
    echo "  • Senha: admin123"
}

# Menu principal
main_menu() {
    while true; do
        show_banner
        
        echo -e "${CYAN}Escolha uma opção:${NC}\n"
        echo "  1) 🚀 Setup completo (primeira vez)"
        echo "  2) 🐳 Apenas subir infraestrutura Docker"
        echo "  3) 📦 Instalar dependências (npm install)"
        echo "  4) 🔧 Iniciar desenvolvimento"
        echo "  5) 📊 Ver status dos serviços"
        echo "  6) 🛑 Parar todos os containers"
        echo "  7) 🗑️  Limpar tudo (containers + volumes)"
        echo "  8) ❓ Instruções GLPI"
        echo "  0) Sair"
        echo ""
        echo -n "Opção: "
        read -r choice
        
        case $choice in
            1)
                check_dependencies
                setup_env
                start_infrastructure
                setup_backend
                setup_frontend
                setup_bot
                show_glpi_instructions
                show_status
                echo ""
                read -p "Pressione ENTER para continuar..."
                ;;
            2)
                start_infrastructure
                show_status
                read -p "Pressione ENTER para continuar..."
                ;;
            3)
                setup_backend
                setup_frontend
                setup_bot
                read -p "Pressione ENTER para continuar..."
                ;;
            4)
                start_dev
                read -p "Pressione ENTER para continuar..."
                ;;
            5)
                show_status
                read -p "Pressione ENTER para continuar..."
                ;;
            6)
                cd "$PROJECT_DIR"
                docker compose stop
                log "Containers parados"
                read -p "Pressione ENTER para continuar..."
                ;;
            7)
                warn "Isso vai remover todos os dados do banco e GLPI!"
                echo -n "Tem certeza? (digite 'sim' para confirmar): "
                read -r confirm
                if [ "$confirm" = "sim" ]; then
                    cd "$PROJECT_DIR"
                    docker compose down -v
                    log "Containers e volumes removidos"
                fi
                read -p "Pressione ENTER para continuar..."
                ;;
            8)
                show_glpi_instructions
                read -p "Pressione ENTER para continuar..."
                ;;
            0)
                echo -e "\n${GREEN}Até mais! 👋${NC}\n"
                exit 0
                ;;
            *)
                error "Opção inválida"
                sleep 1
                ;;
        esac
    done
}

# Execução
main_menu
