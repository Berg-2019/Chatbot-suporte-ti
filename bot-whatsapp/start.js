#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🤖 Iniciando Bot de Atendimento WhatsApp...\n');

// Verificar se o arquivo .env existe
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  Arquivo .env não encontrado!');
  console.log('📝 Criando arquivo .env com configurações padrão...\n');
  
  const defaultEnv = `# Configurações do Bot WhatsApp
OPENAI_API_KEY=sua_chave_openai_aqui

# Números de telefone
BOT_NUMBER=69981248816
ROOT_NUMBERS=69981170027,6884268042

# Configurações do banco de dados
DB_PATH=./db/atendimento.db

# Configurações gerais
NODE_ENV=development
LOG_LEVEL=info

# Mensagens padrão
MENSAGEM_SAUDACAO=Olá! Sou o assistente técnico. Como posso ajudá-lo hoje?
MENSAGEM_FINAL=Atendimento finalizado. Obrigado por utilizar nossos serviços!

# Configurações de e-mail (opcional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=seu_email@gmail.com
# SMTP_PASS=sua_senha
# EMAIL_FROM=bot@empresa.com
# ADMIN_EMAILS=admin1@empresa.com,admin2@empresa.com
`;

  fs.writeFileSync(envPath, defaultEnv);
  console.log('✅ Arquivo .env criado com sucesso!');
  console.log('📝 Edite o arquivo .env para configurar suas credenciais\n');
}

// Verificar se os diretórios necessários existem
const dirs = ['./db', './logs', './auth_info_baileys'];
dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Diretório criado: ${dir}`);
  }
});

console.log('\n🚀 Iniciando o bot...\n');

// Iniciar o bot
require('./bot.js');
