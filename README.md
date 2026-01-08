# 🤖 Bot WhatsApp com IA Local (Ollama) + Sistema de Peças

Sistema completo de atendimento técnico via WhatsApp com **IA local usando Ollama**, integração ao grupo técnico, sistema de solicitação de peças e interface web para gerenciamento.

## 🚀 Funcionalidades Principais

### 1. **IA Local com Ollama** ⭐ **NOVO**
- **Análise inteligente** de mensagens dos usuários
- **Primeira interação personalizada** - não cria OS automaticamente
- **Classificação automática** de problemas técnicos
- **Análise de prioridade** e categorização
- **Privacidade total** - dados não saem do servidor

### 2. **Integração com Grupo Técnico**
- Bot envia notificações de novas OS para grupo específico do WhatsApp
- Comandos funcionam dentro do grupo técnico
- ID do grupo configurável via interface web

### 3. **Sistema de Solicitação de Peças**
- Comando `!listpeças [id_os]` para técnicos solicitarem peças
- Workflow completo: solicitação → separação → disponibilização
- Notificações automáticas para técnicos e almoxarifado
- Interface web para gerenciamento pelo almoxarifado

### 4. **Interface Web Completa**
- **Gerenciamento de OS**: Visualizar, atualizar status, histórico
- **Gerenciamento de Peças**: Interface para almoxarifado
- **Configurações do Sistema**: Painel administrativo
- **Autenticação**: Sistema de login protegido

### 5. **Sistema de Backup e Administração**
- Backup automático e manual do banco de dados
- Comandos administrativos avançados
- Estatísticas e gráficos do sistema
- Gerenciamento de usuários via interface web

## 📋 Pré-requisitos

- Node.js 18+ 
- NPM ou Yarn
- **Ollama instalado** (para IA local)
- WhatsApp Business ou pessoal para o bot
- Acesso ao grupo técnico do WhatsApp

## 🛠️ Instalação

### 1. **Instalar Ollama** ⭐ **NOVO**
```bash
# Linux/Mac
curl -fsSL https://ollama.ai/install.sh | sh

# Windows: Baixar do site oficial
# https://ollama.ai/
```

**Baixar modelo recomendado:**
```bash
ollama pull llama3.2:3b
```

**Iniciar Ollama:**
```bash
ollama serve
```

### 2. **Clonar o Repositório**
```bash
git clone <repository-url>
cd bot-whatsapp-atendimento
```

### 3. **Instalar Dependências**

**Bot WhatsApp:**
```bash
cd bot-whatsapp
npm install
```

**Interface Web:**
```bash
cd ..
npm install
```

### 4. **Configurar Variáveis de Ambiente**

Criar arquivo `.env` na raiz do projeto:
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
```

### 5. **Iniciar os Serviços**

**Terminal 1 - Bot WhatsApp:**
```bash
cd bot-whatsapp
npm start
```

**Terminal 2 - Interface Web:**
```bash
npm run dev
```

**Terminal 3 - Ollama (se não estiver rodando):**
```bash
ollama serve
```

## 🎯 Como Usar

### **Para Usuários Finais:** ⭐ **ATUALIZADO**
1. **Primeira Mensagem**: Recebe boas-vindas personalizadas da IA
2. **Abrir Chamado**: Descrever problema técnico (IA analisa automaticamente)
3. **Consultar Status**: `!status [id]`
4. **Cancelar OS**: `!cancelar [id]`
5. **Adicionar Dados**: `!dados`

### **Para Técnicos:**
1. **Ver OS Abertas**: `!list`
2. **Assumir OS**: `!atendendo [id]`
3. **Solicitar Peças**: `!listpeças [id]`
4. **Finalizar OS**: `!finalizado [id]`
5. **Marcar Prioridade**: `!prioridade [id]`

### **Para Almoxarifado:**
1. **Ver Solicitações**: `!pecas`
2. **Atender Solicitação**: `!atender [id]`
3. **Acessar Interface Web**: `/parts`

### **Para Administradores:**
1. **Promover Usuários**: `!tecnico=[telefone]`, `!almoxarifado=[telefone]`
2. **Ver Estatísticas**: `!grafico`
3. **Criar Backup**: `!backup`
4. **Configurar Sistema**: Interface web `/config`

## 📱 Exemplo de Uso ⭐ **ATUALIZADO**

### Fluxo Completo com IA:

1. **Primeira interação do usuário:**
```
Usuário: "oi"
Bot: 👋 Olá! Sou seu assistente técnico de TI.

🔧 Para abrir um chamado, descreva seu problema técnico
📋 Use !ajuda para ver todos os comandos disponíveis
💬 Estou aqui para ajudar com questões de TI!
```

2. **Usuário reporta problema:**
```
Usuário: "Minha impressora não está funcionando"
Bot: ✅ CHAMADO CRIADO COM SUCESSO

🎫 OS #123
📝 Problema: Minha impressora não está funcionando
📅 Criado em: 15/12/2024 14:30

🤖 Análise Automática:
📂 Categoria: Impressora
⚡ Prioridade: Normal
🔍 Análise: Problema comum de conectividade com impressora

💡 Próximos passos:
• Use !dados para adicionar mais informações
• Use !status 123 para consultar o andamento
• Nossa equipe técnica foi notificada
```

3. **Notificação no grupo técnico:**
```
🆕 NOVA OS CRIADA

🎫 OS #123
👤 Usuário: João Silva
📞 Telefone: 5511999999999
📝 Problema: Minha impressora não está funcionando

🤖 Análise IA:
📂 Impressora | ⚡ Normal
🔍 Problema comum de conectividade com impressora

📅 Criado em: 15/12/2024 14:30
```

4. **Técnico assume o atendimento:**
```
Técnico: "!atendendo 123"
Bot: ✅ Você assumiu a OS #123. Status: EM ANDAMENTO
```

5. **Técnico solicita peças:**
```
Técnico: "!listpeças 123"
Bot: 📦 SOLICITAÇÃO DE PEÇAS - OS #123
     Liste as peças necessárias:

Técnico: "- Cartucho HP 664
          - Cabo USB"
Bot: ✅ SOLICITAÇÃO DE PEÇAS CRIADA #456
```

6. **Almoxarifado atende:**
```
Almoxarifado: "!atender 456"
Bot: ✅ Solicitação #456 atendida!
     Técnico notificado: peças disponíveis para retirada
```

7. **Finalização:**
```
Técnico: "!finalizado 123"
Bot: ✅ OS #123 finalizada com sucesso!
```

## 🌐 Interface Web

### Páginas Disponíveis:
- **`/`** - Dashboard principal com OS
- **`/parts`** - Gerenciamento de peças (almoxarifado)
- **`/config`** - Configurações do sistema (admin)

### Credenciais de Acesso:
- **Usuário**: `root`
- **Senha**: `admin847523`

## 📊 Comandos Completos

### **Usuários Gerais:**
- `!ajuda` - Lista de comandos
- `!status [id]` - Ver status da OS
- `!cancelar [id]` - Cancelar OS
- `!dados` - Adicionar dados da máquina

### **Técnicos:**
- `!menu` - Menu técnico
- `!atendendo [id]` - Assumir OS
- `!prioridade [id]` - Marcar como prioritário
- `!setor [id]=[setor]` - Alterar setor
- `!mensagem [id]=[texto]` - Enviar mensagem
- `!list` - Listar OS abertas
- `!finalizado [id]` - Finalizar OS
- `!listpeças [id]` - Solicitar peças
- `!adm` - Chamar administrador

### **Almoxarifado:**
- `!pecas` - Ver solicitações de peças
- `!atender [id]` - Atender solicitação

### **Administradores:**
- `!config` - Menu de configurações
- `!listtc` - Listar técnicos
- `!listadm` - Listar administradores
- `!tecnico=[num]` - Promover a técnico
- `!admin=[num]` - Promover a administrador
- `!almoxarifado=[num]` - Promover a almoxarifado
- `!ping` - Status do sistema
- `!historico` - Ver histórico

### **Sistema (Root):**
- `!user [username] [password]` - Criar usuário web
- `!grafico` - Estatísticas detalhadas
- `!backup` - Criar backup manual
- `!sistema` - Informações do sistema

## 🗄️ Estrutura do Banco

### Tabelas Principais:
- `usuarios` - Usuários do sistema
- `ordens_servico` - Ordens de serviço
- `historico_mensagens` - Histórico de conversas
- `solicitacoes_pecas` - Solicitações de peças
- `system_users` - Usuários da interface web
- `system_config` - Configurações do sistema
- `backups` - Registro de backups

## 📚 Documentação Adicional

- **[Integração Ollama](./README_OLLAMA_INTEGRATION.md)** ⭐ **NOVO** - Guia completo da IA local
- **[Sistema de Peças](./README_PARTS_SYSTEM.md)** - Documentação detalhada do sistema de peças

## 🔧 Troubleshooting

### IA não funciona (Ollama)
1. **Verificar se Ollama está rodando**: `ollama serve`
2. **Testar conexão**: `curl http://localhost:11434/api/tags`
3. **Verificar modelo**: `ollama list`
4. **Baixar modelo**: `ollama pull llama3.2:3b`

### Bot não conecta ao WhatsApp
1. Verificar se o QR Code foi escaneado
2. Verificar conexão com internet
3. Limpar pasta `auth_info_baileys` e reconectar

### Comandos não funcionam
1. Verificar se o usuário tem permissão
2. Verificar sintaxe do comando
3. Consultar logs em `./logs/bot.log`

### Interface web não carrega
1. Verificar se Next.js está rodando (`npm run dev`)
2. Verificar porta 3000 disponível
3. Verificar se banco de dados existe

### Grupo técnico não recebe notificações
1. Verificar ID do grupo nas configurações
2. Verificar se bot está no grupo
3. Verificar permissões do bot no grupo

## 🚀 Recursos Avançados

### Backup Automático
- Backup a cada 24 horas
- Limpeza automática de backups antigos
- Exportação de OS individuais

### Estatísticas Avançadas
- Gráficos de performance
- Métricas de atendimento
- Relatórios de peças

### Segurança
- Dados locais (Ollama)
- Autenticação web
- Logs detalhados
- Controle de permissões

## 📈 Performance

### Recursos Recomendados:
- **RAM**: 8GB+ (16GB recomendado para IA)
- **CPU**: 4+ cores
- **Armazenamento**: 10GB+ livre
- **Rede**: Conexão estável para WhatsApp

### Otimizações:
- Usar modelos Ollama menores para melhor performance
- Configurar limpeza automática adequada
- Monitorar uso de recursos

## 🔐 Segurança e Privacidade

### Vantagens do Ollama:
- **Dados locais**: Nenhuma informação enviada para terceiros
- **Privacidade**: Conversas permanecem no servidor
- **Controle total**: Sem dependência de APIs externas
- **Gratuito**: Sem custos de API

### Configurações de Segurança:
- Autenticação obrigatória na interface web
- Controle de permissões por papel de usuário
- Logs detalhados de todas as ações
- Backup automático para recuperação

## 📞 Suporte

### Configuração Padrão:
- **Grupo Técnico**: https://chat.whatsapp.com/H6Mb8FQAnhaJhY5RdyIKjP
- **Usuário Root**: 5569981170027
- **Interface Web**: http://localhost:3000

### Em caso de problemas:
1. Verificar logs em `./logs/bot.log`
2. Consultar documentação específica
3. Verificar status de todos os serviços
4. Reiniciar serviços se necessário

---

**Sistema desenvolvido para atendimento técnico eficiente com IA local e total privacidade dos dados.**
