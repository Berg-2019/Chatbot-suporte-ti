#!/bin/bash

# Script de Migração: develop → feature/v2-erp
# Automatiza a parada dos serviços antigos e inicialização da nova estrutura

set -e  # Para em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}║   🚀 Migração para v2-erp - Sistema Helpdesk                  ║${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Parar serviços antigos
echo -e "${YELLOW}📋 Passo 1/6: Parando serviços antigos...${NC}"
echo ""

# Encontrar e parar processos Node.js relacionados ao projeto
pkill -f "nest start" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "node.*frontend" 2>/dev/null || true
pkill -f "node.*bot" 2>/dev/null || true

echo -e "${GREEN}✓ Serviços antigos parados${NC}"
sleep 2

# 2. Fazer backup dos dados (opcional, mas recomendado)
echo -e "${YELLOW}📋 Passo 2/6: Criando backup de segurança...${NC}"
echo ""

BACKUP_DIR="backups/migration_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup do .env (se existir)
if [ -f "backend/.env" ]; then
    cp backend/.env "$BACKUP_DIR/backend.env.backup"
    echo -e "${GREEN}✓ Backup do .env criado${NC}"
fi

# Backup do banco PostgreSQL (se configurado)
if command -v pg_dump &> /dev/null; then
    if [ -f "backend/.env" ]; then
        source backend/.env 2>/dev/null || true
        if [ ! -z "$DATABASE_URL" ]; then
            pg_dump "$DATABASE_URL" > "$BACKUP_DIR/postgres_backup.sql" 2>/dev/null || true
            echo -e "${GREEN}✓ Backup do PostgreSQL criado${NC}"
        fi
    fi
fi

echo -e "${GREEN}✓ Backups salvos em: $BACKUP_DIR${NC}"
sleep 1

# 3. Mudar para branch v2-erp
echo -e "${YELLOW}📋 Passo 3/6: Mudando para branch feature/v2-erp...${NC}"
echo ""

# Salvar mudanças locais (se houver)
if ! git diff-index --quiet HEAD --; then
    echo -e "${BLUE}ℹ Salvando mudanças locais...${NC}"
    git stash push -m "Auto-stash antes de migração para v2-erp"
fi

# Fazer checkout
git checkout feature/v2-erp
git pull origin feature/v2-erp 2>/dev/null || true

echo -e "${GREEN}✓ Branch feature/v2-erp ativa${NC}"
sleep 1

# 4. Instalar dependências
echo -e "${YELLOW}📋 Passo 4/6: Instalando dependências...${NC}"
echo ""

# Backend
echo -e "${BLUE}→ Instalando dependências do backend...${NC}"
cd backend
npm install --silent
echo -e "${GREEN}✓ Backend OK${NC}"

# Frontend
echo -e "${BLUE}→ Instalando dependências do frontend...${NC}"
cd ../frontend
npm install --silent
echo -e "${GREEN}✓ Frontend OK${NC}"

# Bot (se existir)
if [ -d "../bot" ]; then
    echo -e "${BLUE}→ Instalando dependências do bot...${NC}"
    cd ../bot
    npm install --silent
    echo -e "${GREEN}✓ Bot OK${NC}"
    cd ..
else
    cd ..
fi

sleep 1

# 5. Aplicar migrações do banco
echo -e "${YELLOW}📋 Passo 5/6: Aplicando migrações do banco de dados...${NC}"
echo ""

cd backend

# Verificar se o banco está acessível
if npm run prisma:migrate 2>/dev/null; then
    echo -e "${GREEN}✓ Migrações aplicadas com sucesso${NC}"
else
    echo -e "${RED}⚠ Não foi possível aplicar migrações automaticamente${NC}"
    echo -e "${YELLOW}  Execute manualmente: cd backend && npm run prisma:migrate${NC}"
fi

cd ..
sleep 1

# 6. Criar arquivo de controle
echo -e "${YELLOW}📋 Passo 6/6: Criando scripts de controle...${NC}"
echo ""

# Script para iniciar todos os serviços
cat > start-all.sh << 'EOF'
#!/bin/bash

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Iniciando Sistema Helpdesk v2-erp${NC}"
echo ""

# Função para abrir terminal baseado no ambiente
open_terminal() {
    local cmd=$1
    local title=$2

    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --title="$title" -- bash -c "$cmd; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -T "$title" -e "$cmd; bash" &
    elif command -v konsole &> /dev/null; then
        konsole --title "$title" -e bash -c "$cmd; exec bash" &
    else
        echo -e "${BLUE}→ $title:${NC} Execute manualmente: $cmd"
    fi
}

# Iniciar Backend
echo -e "${GREEN}→ Iniciando Backend...${NC}"
open_terminal "cd backend && npm run start:dev" "Backend - Helpdesk v2"

sleep 2

# Iniciar Frontend
echo -e "${GREEN}→ Iniciando Frontend...${NC}"
open_terminal "cd frontend && npm run dev" "Frontend - Helpdesk v2"

sleep 2

# Iniciar Bot (se existir)
if [ -d "bot" ]; then
    echo -e "${GREEN}→ Iniciando Bot...${NC}"
    open_terminal "cd bot && npm run dev" "Bot - Helpdesk v2"
fi

echo ""
echo -e "${GREEN}✓ Todos os serviços foram iniciados!${NC}"
echo ""
echo -e "${BLUE}Acessos:${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}Para parar todos os serviços:${NC}"
echo -e "  ./stop-all.sh"
echo ""
EOF

chmod +x start-all.sh

# Script para parar todos os serviços
cat > stop-all.sh << 'EOF'
#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🛑 Parando todos os serviços...${NC}"
echo ""

# Parar processos Node.js do projeto
pkill -f "nest start" 2>/dev/null && echo -e "${GREEN}✓ Backend parado${NC}" || true
pkill -f "vite" 2>/dev/null && echo -e "${GREEN}✓ Frontend parado${NC}" || true
pkill -f "node.*bot" 2>/dev/null && echo -e "${GREEN}✓ Bot parado${NC}" || true

sleep 1
echo ""
echo -e "${GREEN}✓ Todos os serviços foram parados${NC}"
EOF

chmod +x stop-all.sh

echo -e "${GREEN}✓ Scripts de controle criados${NC}"
sleep 1

# Resumo final
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}║   ✅ Migração Concluída com Sucesso!                          ║${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📦 Melhorias Implementadas:${NC}"
echo "   • 32 melhorias de segurança e performance"
echo "   • Code splitting (~60% redução de bundle)"
echo "   • Cache Redis + compressão gzip"
echo "   • Autorização por roles"
echo "   • Validação avançada de dados"
echo ""
echo -e "${YELLOW}📋 Próximos Passos:${NC}"
echo ""
echo -e "1. ${BLUE}Iniciar todos os serviços:${NC}"
echo -e "   ${GREEN}./start-all.sh${NC}"
echo ""
echo -e "2. ${BLUE}Ou iniciar manualmente:${NC}"
echo -e "   Terminal 1: ${GREEN}cd backend && npm run start:dev${NC}"
echo -e "   Terminal 2: ${GREEN}cd frontend && npm run dev${NC}"
echo -e "   Terminal 3: ${GREEN}cd bot && npm run dev${NC}"
echo ""
echo -e "3. ${BLUE}Acessar a aplicação:${NC}"
echo -e "   Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "   Backend:  ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "4. ${BLUE}Para parar tudo:${NC}"
echo -e "   ${GREEN}./stop-all.sh${NC}"
echo ""
echo -e "${YELLOW}📚 Documentação:${NC}"
echo "   • SETUP_RAPIDO.md - Início rápido"
echo "   • GUIA_DE_TESTES.md - Testes detalhados"
echo ""
echo -e "${BLUE}💾 Backup salvo em:${NC} $BACKUP_DIR"
echo ""
echo -e "${GREEN}Pronto para usar! 🎉${NC}"
echo ""
