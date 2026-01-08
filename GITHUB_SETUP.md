# 🚀 Publicação no GitHub - bot-whatsapp-atendimento

Este documento explica como publicar o projeto no GitHub no repositório **bot-whatsapp-atendimento**.

## 📋 Pré-requisitos

1. Conta no GitHub (https://github.com)
2. Git instalado
3. Acesso à linha de comando

## 🔧 Passos para Publicação

### 1. Verificar Repositório no GitHub

O repositório já existe em: https://github.com/Betaberg/bot-whatsapp-atendimento

Verifique se você tem acesso de escrita a este repositório.

### 2. Configurar Remote Origin

O projeto já está configurado para usar o repositório correto. Verifique com:

```bash
git remote -v
```

Deve mostrar:
```
origin https://github.com/Betaberg/bot-whatsapp-atendimento.git (fetch)
origin https://github.com/Betaberg/bot-whatsapp-atendimento.git (push)
```

Se não estiver correto, configure com:
```bash
git remote set-url origin https://github.com/Betaberg/bot-whatsapp-atendimento.git
```

### 3. Fazer Push para GitHub

```bash
# Primeiro push
git push -u origin main
```

### 4. Configurar GitHub Pages (Opcional)

Se quiser hospedar o painel web gratuitamente:

1. Vá para Settings → Pages
2. Source: GitHub Actions
3. O workflow já está configurado em `.github/workflows/ci.yml`

## 📁 Estrutura Publicada

```
bot-pedreira/
├── bot-whatsapp/              # Bot WhatsApp
│   ├── bot.js
│   ├── start.js
│   ├── init-db.js
│   ├── package.json
│   ├── .env.example          # Template de configuração
│   ├── config/
│   ├── db/
│   ├── handlers/
│   ├── utils/
│   ├── logs/
│   ├── auth_info_baileys/
│   └── docs/
├── src/                       # Painel Web Next.js
│   ├── app/
│   └── components/
├── scripts/
│   └── publish-github.sh      # Script de publicação
├── .github/
│   └── workflows/
├── .gitignore
├── package.json
├── README.md
├── LICENSE
├── CONTRIBUTING.md
└── DOWNLOAD.md
```

## 🔐 Segurança

Os seguintes arquivos **não** são publicados por segurança:
- `bot-whatsapp/.env` (variáveis de ambiente)
- `bot-whatsapp/db/*.db` (banco de dados)
- `bot-whatsapp/auth_info_baileys/` (sessão WhatsApp)
- `bot-whatsapp/logs/` (logs)

Para configurar seu ambiente:
```bash
cp bot-whatsapp/.env.example bot-whatsapp/.env
# Edite bot-whatsapp/.env com suas configurações
```

## 🔄 Atualizações Futuras

Para atualizar o repositório:

```bash
# Adicionar mudanças
git add .

# Commit
git commit -m "descricao das mudanças"

# Push
git push origin main
```

## 🎉 Pronto!

Seu projeto está agora publicado no GitHub como **bot-pedreira**!

🔗 Acesso: https://github.com/SEU_USUARIO/bot-pedreira

---

**Problemas Comuns:**

- **403 Forbidden**: Verifique seu token de acesso ou permissões
- **Repository not found**: Certifique-se que criou o repositório no GitHub
- **Permission denied**: Verifique se você tem permissão de escrita no repositório
