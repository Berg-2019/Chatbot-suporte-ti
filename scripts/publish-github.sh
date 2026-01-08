#!/bin/bash

# Script para publicar o projeto no GitHub
# Uso: ./scripts/publish-github.sh

echo "🚀 Preparando projeto para publicação no GitHub..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se git está instalado
if ! command -v git &> /dev/null; then
    print_error "Git não está instalado. Por favor, instale o Git primeiro."
    exit 1
fi

# Verificar se estamos em um repositório git
if [ ! -d ".git" ]; then
    print_status "Inicializando repositório Git..."
    git init
    print_success "Repositório Git inicializado"
else
    print_status "Repositório Git já existe"
fi

# Criar arquivo .env.example se não existir
if [ ! -f "bot-whatsapp/.env.example" ]; then
    print_warning "Arquivo .env.example não encontrado. Criando..."
    cp bot-whatsapp/.env bot-whatsapp/.env.example 2>/dev/null || echo "# Configure suas variáveis de ambiente aqui" > bot-whatsapp/.env.example
fi

# Verificar se há arquivos sensíveis
print_status "Verificando arquivos sensíveis..."

sensitive_files=(
    "bot-whatsapp/.env"
    "bot-whatsapp/db/atendimento.db"
    "bot-whatsapp/auth_info_baileys"
    "bot-whatsapp/logs"
)

for file in "${sensitive_files[@]}"; do
    if [ -e "$file" ]; then
        print_warning "Arquivo sensível encontrado: $file (será ignorado pelo .gitignore)"
    fi
done

# Adicionar todos os arquivos
print_status "Adicionando arquivos ao Git..."
git add .

# Verificar se há mudanças para commit
if git diff --staged --quiet; then
    print_warning "Nenhuma mudança para commit"
else
    # Fazer commit
    print_status "Fazendo commit das mudanças..."
    git commit -m "feat: implementa sistema completo de atendimento WhatsApp

- ✅ Bot WhatsApp com Baileys
- ✅ Sistema de comandos hierárquico
- ✅ Painel administrativo web
- ✅ API REST completa
- ✅ Banco de dados SQLite
- ✅ Sistema de logs
- ✅ Documentação completa
- ✅ Dados de exemplo
- ✅ CI/CD com GitHub Actions"
    
    print_success "Commit realizado com sucesso"
fi

# Verificar se há remote origin
if git remote get-url origin &> /dev/null; then
    print_status "Remote origin já configurado: $(git remote get-url origin)"
    
    # Perguntar se quer fazer push
    echo ""
    read -p "Deseja fazer push para o GitHub? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Fazendo push para o GitHub..."
        
        # Verificar se a branch main existe
        if git show-ref --verify --quiet refs/heads/main; then
            git push -u origin main
        else
            # Renomear branch master para main se necessário
            if git show-ref --verify --quiet refs/heads/master; then
                print_status "Renomeando branch master para main..."
                git branch -m master main
            fi
            git push -u origin main
        fi
        
        print_success "Push realizado com sucesso!"
    fi
else
    print_warning "Remote origin não configurado"
    echo ""
    echo "Para configurar o remote origin, execute:"
echo "git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git"
echo "git push -u origin main"
fi

echo ""
print_success "✅ Projeto preparado para GitHub!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verifique se tem acesso ao repositório: https://github.com/Betaberg/bot-whatsapp-atendimento"
echo "2. Configure o remote origin (se ainda não fez):"
echo "   git remote set-url origin https://github.com/Betaberg/bot-whatsapp-atendimento.git"
echo "3. Faça o push:"
echo "   git push -u origin main"
echo ""
echo "📚 Documentação:"
echo "- README.md: Documentação principal"
echo "- CONTRIBUTING.md: Guia para contribuidores"
echo "- bot-whatsapp/docs/README.md: Documentação técnica detalhada"
echo ""
echo "🔧 Configuração:"
echo "- Copie bot-whatsapp/.env.example para bot-whatsapp/.env"
echo "- Configure suas variáveis de ambiente"
echo "- Execute: cd bot-whatsapp && node init-db.js"
echo ""
echo "📁 Mais detalhes em: GITHUB_SETUP.md"
echo ""
print_success "🎉 Pronto para usar!"
