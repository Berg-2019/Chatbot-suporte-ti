#!/bin/bash

# ============================================
# Bot WhatsApp Atendimento - Script de Inicialização
# ============================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="$PROJECT_DIR/bot-whatsapp"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Bot WhatsApp Atendimento - Inicialização${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para verificar se um serviço está rodando em uma porta
check_port() {
    lsof -i :$1 >/dev/null 2>&1
}

# Função para verificar Ollama
check_ollama() {
    echo -e "${YELLOW}🔍 Verificando Ollama...${NC}"
    
    if ! command_exists ollama; then
        echo -e "${RED}❌ Ollama não está instalado${NC}"
        echo -e "${YELLOW}   Instale com: curl -fsSL https://ollama.ai/install.sh | sh${NC}"
        return 1
    fi
    
    # Verificar se Ollama está rodando
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Ollama está rodando${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Ollama instalado mas não está rodando${NC}"
        echo -e "${YELLOW}   Iniciando Ollama em background...${NC}"
        nohup ollama serve > /tmp/ollama.log 2>&1 &
        sleep 3
        
        if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Ollama iniciado com sucesso${NC}"
            return 0
        else
            echo -e "${RED}❌ Falha ao iniciar Ollama${NC}"
            return 1
        fi
    fi
}

# Função para verificar se o modelo está disponível
check_ollama_model() {
    local model="llama3.2:3b"
    echo -e "${YELLOW}🔍 Verificando modelo $model...${NC}"
    
    if ollama list 2>/dev/null | grep -q "$model"; then
        echo -e "${GREEN}✅ Modelo $model disponível${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Modelo $model não encontrado${NC}"
        echo -e "${YELLOW}   Baixando modelo (pode demorar alguns minutos)...${NC}"
        ollama pull $model
        return 0
    fi
}

# Função para verificar dependências Node.js
check_dependencies() {
    echo -e "${YELLOW}🔍 Verificando dependências...${NC}"
    
    if ! command_exists node; then
        echo -e "${RED}❌ Node.js não está instalado${NC}"
        return 1
    fi
    
    if ! command_exists npm; then
        echo -e "${RED}❌ npm não está instalado${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Node.js $(node -v) e npm $(npm -v) instalados${NC}"
    
    # Verificar se node_modules existe
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        echo -e "${YELLOW}⚠️  Instalando dependências do projeto web...${NC}"
        cd "$PROJECT_DIR" && npm install
    fi
    
    if [ ! -d "$BOT_DIR/node_modules" ]; then
        echo -e "${YELLOW}⚠️  Instalando dependências do bot...${NC}"
        cd "$BOT_DIR" && npm install
    fi
    
    echo -e "${GREEN}✅ Dependências verificadas${NC}"
    return 0
}

# Função para iniciar serviços
start_services() {
    echo ""
    echo -e "${BLUE}🚀 Iniciando serviços...${NC}"
    echo ""
    
    cd "$PROJECT_DIR"
    
    echo -e "${GREEN}📱 Iniciando Bot WhatsApp e Interface Web...${NC}"
    echo -e "${YELLOW}   Bot: porta do WhatsApp${NC}"
    echo -e "${YELLOW}   Web: http://localhost:8000${NC}"
    echo ""
    echo -e "${YELLOW}Pressione Ctrl+C para parar todos os serviços${NC}"
    echo ""
    
    npm run start:all
}

# Main
main() {
    # Verificar Node.js e dependências
    if ! check_dependencies; then
        echo -e "${RED}❌ Falha na verificação de dependências${NC}"
        exit 1
    fi
    
    echo ""
    
    # Verificar Ollama (opcional - não bloqueia se falhar)
    if check_ollama; then
        check_ollama_model
    else
        echo -e "${YELLOW}⚠️  Continuando sem Ollama (IA desabilitada)${NC}"
    fi
    
    echo ""
    
    # Iniciar serviços
    start_services
}

# Executar
main "$@"
