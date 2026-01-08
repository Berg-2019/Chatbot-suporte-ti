# 📦 Bot de Atendimento WhatsApp - Download

Arquivo compactado do projeto completo para download e instalação local.

## 📋 Informações do Arquivo

- **Nome**: `bot-whatsapp-atendimento.zip`
- **Tamanho**: ~215 KB
- **Formato**: ZIP (compactado)
- **Conteúdo**: Projeto completo com código-fonte

## 📁 Estrutura do Projeto

```
📁 bot-whatsapp-atendimento/
├── 📄 README.md                    # Documentação principal
├── 📄 CONTRIBUTING.md              # Guia para contribuidores
├── 📄 LICENSE                      # Licença MIT
├── 📄 package.json                 # Dependências do painel web
├── 📁 bot-whatsapp/               # Bot WhatsApp completo
│   ├── 📄 bot.js                  # Arquivo principal do bot
│   ├── 📄 package.json            # Dependências do bot
│   ├── 📄 .env.example            # Exemplo de configuração
│   ├── 📁 config/                 # Configurações
│   ├── 📁 db/                     # Banco de dados
│   ├── 📁 handlers/               # Processadores de comandos
│   └── 📁 utils/                  # Utilitários
├── 📁 src/                        # Painel Web Next.js
│   ├── 📁 app/                    # Páginas e API
│   └── 📁 components/             # Componentes UI
└── 📁 scripts/                    # Scripts utilitários
```

## 🚀 Como Usar

### 1. **Extrair o Arquivo**
```bash
unzip bot-whatsapp-atendimento.zip -d bot-whatsapp-atendimento
cd bot-whatsapp-atendimento
```

### 2. **Instalar Dependências**
```bash
# Instalar dependências do painel web
npm install

# Instalar dependências do bot
cd bot-whatsapp
npm install
```

### 3. **Configurar Ambiente**
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas configurações
nano .env
```

### 4. **Inicializar Banco de Dados**
```bash
# Criar banco com dados de exemplo
node init-db.js
```

### 5. **Executar o Sistema**
```bash
# Em um terminal, iniciar o painel web
cd ..
npm run dev

# Em outro terminal, iniciar o bot
cd bot-whatsapp
npm start
```

## 📋 Requisitos do Sistema

- **Node.js**: 16+ 
- **npm**: 8+
- **WhatsApp**: Instalado no celular para o bot
- **Navegador**: Moderno para o painel web
- **Espaço em disco**: ~50MB livres

## 🔧 Configuração Necessária

### Variáveis de Ambiente (.env)
```env
# Configurações do Bot WhatsApp
OPENAI_API_KEY=sua_chave_openai_aqui

# Números de telefone
BOT_NUMBER=69981248816
ROOT_NUMBERS=69981170027,6884268042

# Configurações do banco de dados
DB_PATH=./db/atendimento.db

# Configurações gerais
NODE_ENV=development
LOG_LEVEL=info
```

## 🌐 Acesso ao Sistema

- **Painel Web**: http://localhost:8000
- **Bot WhatsApp**: Escaneie o QR Code no terminal
- **Documentação**: README.md e bot-whatsapp/docs/README.md

## 📞 Suporte

- **Issues**: Reporte problemas no GitHub
- **Email**: betaberg@github.com
- **Documentação**: Veja os arquivos README.md

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

---

**🎉 Projeto pronto para uso!**
