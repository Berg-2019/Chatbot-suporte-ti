#!/bin/bash

echo "🔄 Reiniciando ambiente de desenvolvimento..."

cd "/home/helpdesk/Projeto chatbot/Chatbot-suporte-ti"

# Parar containers
echo "⏸️  Parando containers..."
docker compose -f docker-compose.dev.yml stop frontend backend

# Limpar cache do Vite
echo "🧹 Limpando cache..."
rm -rf frontend/node_modules/.vite
rm -rf frontend/dist

# Reiniciar containers
echo "🚀 Iniciando containers..."
docker compose -f docker-compose.dev.yml up -d backend frontend

# Aguardar
echo "⏳ Aguardando inicialização..."
sleep 10

# Status
echo ""
echo "✅ Ambiente reiniciado!"
echo ""
echo "📡 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000"
echo ""
echo "🔐 Credenciais:"
echo "   Email: admin@helpdesk.com"
echo "   Senha: admin123"
echo ""
echo "💡 Se ainda não funcionar:"
echo "   1. Abra http://localhost:5173"
echo "   2. Pressione Ctrl+Shift+R (hard refresh)"
echo "   3. Pressione F12 e veja o console"
echo ""
