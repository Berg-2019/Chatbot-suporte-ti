# 🐧 Guia de Instalação - Servidor Ubuntu Linux

Guia completo para instalar o bot WhatsApp com IA Ollama em servidor Ubuntu Linux na nuvem.

## 📋 Pré-requisitos do Servidor

### Especificações Mínimas:
- **OS**: Ubuntu 20.04 LTS ou superior
- **RAM**: 8GB (16GB recomendado para IA)
- **CPU**: 4 cores (8 cores recomendado)
- **Armazenamento**: 50GB SSD
- **Rede**: Conexão estável com internet

### Especificações Recomendadas:
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 16GB+
- **CPU**: 8+ cores
- **Armazenamento**: 100GB+ SSD
- **Rede**: 100Mbps+

## 🚀 Instalação Passo a Passo

### 1. **Atualizar Sistema**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### 2. **Instalar Node.js 18+**
```bash
# Instalar Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### 3. **Instalar Ollama**
```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Verificar instalação
ollama --version

# Baixar modelo recomendado
ollama pull llama3.2:3b

# Para servidores com mais RAM, usar modelo maior:
# ollama pull llama3.2:7b
```

### 4. **Configurar Ollama como Serviço**
```bash
# Criar arquivo de serviço
sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
User=ollama
Group=ollama
ExecStart=/usr/local/bin/ollama serve
Environment=OLLAMA_HOST=0.0.0.0:11434
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Criar usuário para Ollama
sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama

# Habilitar e iniciar serviço
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama

# Verificar status
sudo systemctl status ollama
```

### 5. **Instalar PM2 (Gerenciador de Processos)**
```bash
sudo npm install -g pm2

# Configurar PM2 para iniciar com o sistema
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 6. **Clonar e Configurar Projeto**
```bash
# Clonar repositório
git clone <seu-repositorio-url> bot-whatsapp-atendimento
cd bot-whatsapp-atendimento

# Instalar dependências do bot
cd bot-whatsapp
npm install

# Instalar dependências da interface web
cd ..
npm install
```

### 7. **Configurar Variáveis de Ambiente**
```bash
# Criar arquivo .env
nano .env
```

**Conteúdo do .env:**
```env
# Bot Configuration
BOT_NUMBER=5569981248816
ROOT_NUMBERS=5569981170027,5569884268042

# Database
DB_PATH=./bot-whatsapp/db/atendimento.db

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Logging
LOG_LEVEL=info

# Production Settings
NODE_ENV=production
PORT=3000
```

### 8. **Configurar Firewall**
```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow ssh

# Permitir porta da aplicação web
sudo ufw allow 3000

# Permitir Ollama (apenas local)
sudo ufw allow from 127.0.0.1 to any port 11434

# Verificar status
sudo ufw status
```

### 9. **Configurar Nginx (Opcional - Para HTTPS)**
```bash
# Instalar Nginx
sudo apt install -y nginx

# Configurar site
sudo tee /etc/nginx/sites-available/bot-whatsapp > /dev/null <<EOF
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Habilitar site
sudo ln -s /etc/nginx/sites-available/bot-whatsapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Permitir HTTP/HTTPS no firewall
sudo ufw allow 'Nginx Full'
```

### 10. **Configurar SSL com Let's Encrypt (Opcional)**
```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Inicialização dos Serviços

### 1. **Iniciar Bot WhatsApp**
```bash
cd bot-whatsapp-atendimento/bot-whatsapp

# Iniciar com PM2
pm2 start bot.js --name "whatsapp-bot"

# Salvar configuração PM2
pm2 save
```

### 2. **Iniciar Interface Web**
```bash
cd bot-whatsapp-atendimento

# Build da aplicação Next.js
npm run build

# Iniciar com PM2
pm2 start npm --name "web-interface" -- start

# Salvar configuração PM2
pm2 save
```

### 3. **Verificar Status dos Serviços**
```bash
# Status PM2
pm2 status

# Status Ollama
sudo systemctl status ollama

# Logs em tempo real
pm2 logs

# Logs específicos
pm2 logs whatsapp-bot
pm2 logs web-interface
```

## 📊 Monitoramento e Manutenção

### **Comandos Úteis:**
```bash
# Verificar uso de recursos
htop
df -h
free -h

# Logs do sistema
sudo journalctl -u ollama -f
sudo journalctl -u nginx -f

# Reiniciar serviços
pm2 restart all
sudo systemctl restart ollama
sudo systemctl restart nginx

# Backup do banco de dados
cp bot-whatsapp/db/atendimento.db backups/backup-$(date +%Y%m%d).db
```

### **Monitoramento PM2:**
```bash
# Instalar PM2 Monitor
pm2 install pm2-server-monit

# Configurar monitoramento web
pm2 web
```

## 🔒 Segurança

### **Configurações de Segurança:**
```bash
# Desabilitar login root via SSH
sudo nano /etc/ssh/sshd_config
# Alterar: PermitRootLogin no

# Configurar fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Atualizar sistema regularmente
sudo apt update && sudo apt upgrade -y

# Configurar backup automático
crontab -e
# Adicionar:
# 0 2 * * * cp /home/user/bot-whatsapp-atendimento/bot-whatsapp/db/atendimento.db /home/user/backups/backup-$(date +\%Y\%m\%d).db
```

## 🚨 Troubleshooting

### **Problemas Comuns:**

#### **1. Ollama não inicia:**
```bash
# Verificar logs
sudo journalctl -u ollama -f

# Verificar porta
sudo netstat -tlnp | grep 11434

# Reiniciar serviço
sudo systemctl restart ollama
```

#### **2. Bot não conecta ao WhatsApp:**
```bash
# Verificar logs
pm2 logs whatsapp-bot

# Limpar sessão
rm -rf bot-whatsapp/auth_info_baileys

# Reiniciar bot
pm2 restart whatsapp-bot
```

#### **3. Interface web não carrega:**
```bash
# Verificar logs
pm2 logs web-interface

# Verificar porta
sudo netstat -tlnp | grep 3000

# Rebuild aplicação
npm run build
pm2 restart web-interface
```

#### **4. Problemas de memória:**
```bash
# Verificar uso de RAM
free -h

# Configurar swap (se necessário)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 📈 Otimização de Performance

### **Para Servidores com Recursos Limitados:**
```bash
# Usar modelo Ollama menor
ollama pull llama3.2:1b

# Atualizar configuração
nano .env
# OLLAMA_MODEL=llama3.2:1b
```

### **Para Servidores com Mais Recursos:**
```bash
# Usar modelo maior para melhor precisão
ollama pull llama3.2:7b

# Atualizar configuração
nano .env
# OLLAMA_MODEL=llama3.2:7b
```

## 🔄 Atualizações

### **Atualizar Sistema:**
```bash
cd bot-whatsapp-atendimento

# Parar serviços
pm2 stop all

# Atualizar código
git pull origin main

# Atualizar dependências
cd bot-whatsapp && npm install
cd .. && npm install

# Rebuild interface web
npm run build

# Reiniciar serviços
pm2 restart all
```

## 📞 Comandos de Controle da IA

### **Via WhatsApp (apenas admins):**
- `!iaon` - Ativar IA Ollama
- `!iaoff` - Desativar IA Ollama
- `!iastatus` - Ver status da IA

### **Via Terminal:**
```bash
# Verificar status Ollama
curl http://localhost:11434/api/tags

# Testar modelo
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "Hello",
  "stream": false
}'
```

## 🎯 Checklist de Instalação

- [ ] Ubuntu atualizado
- [ ] Node.js 18+ instalado
- [ ] Ollama instalado e rodando
- [ ] Modelo llama3.2:3b baixado
- [ ] PM2 instalado
- [ ] Projeto clonado
- [ ] Dependências instaladas
- [ ] Arquivo .env configurado
- [ ] Firewall configurado
- [ ] Bot iniciado com PM2
- [ ] Interface web iniciada
- [ ] QR Code escaneado
- [ ] IA testada e funcionando
- [ ] Backup configurado

---

**🎉 Instalação Completa!**

Seu bot WhatsApp com IA Ollama está rodando em produção no Ubuntu Linux!

**Acesso:**
- Interface Web: `http://seu-servidor:3000`
- Bot WhatsApp: Escaneie o QR Code nos logs
- Logs: `pm2 logs`
