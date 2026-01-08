# 🤖 Bot de Atendimento WhatsApp

Sistema automatizado de atendimento técnico integrado ao WhatsApp para gerenciamento de Ordens de Serviço (OS).

## 📋 Funcionalidades

### 🔧 Para Usuários
- Abertura automática de chamados via mensagem
- Consulta de status das OS
- Cancelamento de chamados
- Adição de dados técnicos detalhados

### 👨‍💻 Para Técnicos
- Assumir atendimento de OS
- Marcar prioridade dos chamados
- Alterar setor responsável
- Enviar mensagens aos solicitantes
- Listar OS abertas
- Finalizar atendimentos

### 👑 Para Administradores
- Gerenciar técnicos e administradores
- Configurar mensagens do sistema
- Visualizar estatísticas
- Acessar histórico completo
- Configurações avançadas

## 🚀 Instalação

### Pré-requisitos
- Node.js 16+ 
- NPM ou Yarn
- WhatsApp instalado no celular

### Passos de Instalação

1. **Clone ou baixe o projeto**
```bash
cd bot-whatsapp
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Configure a chave da OpenAI (opcional)**
- Obtenha uma chave em: https://platform.openai.com/
- Adicione no arquivo `.env`: `OPENAI_API_KEY=sua_chave_aqui`

5. **Inicie o bot**
```bash
npm start
```

6. **Escaneie o QR Code**
- Um QR Code aparecerá no terminal
- Escaneie com seu WhatsApp
- Aguarde a confirmação de conexão

## 📱 Comandos Disponíveis

### 👤 Comandos de Usuário

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `!ajuda` | Lista todos os comandos | `!ajuda` |
| `!status [id]` | Consulta status da OS | `!status 123` |
| `!cancelar [id]` | Cancela uma OS | `!cancelar 123` |
| `!dados` | Inicia coleta de dados | `!dados` |

### 🔧 Comandos de Técnico

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `!menu` | Menu de comandos técnicos | `!menu` |
| `!atendendo [id]` | Assume uma OS | `!atendendo 123` |
| `!prioridade [id]` | Marca como prioritário | `!prioridade 123` |
| `!setor [id]=[setor]` | Altera setor da OS | `!setor 123=Financeiro` |
| `!mensagem [id]=[texto]` | Envia mensagem ao usuário | `!mensagem 123=Verificando problema` |
| `!list` | Lista OS abertas | `!list` |
| `!finalizado [id]` | Finaliza atendimento | `!finalizado 123` |
| `!adm` | Chama um administrador | `!adm` |

### 👑 Comandos Administrativos

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `!config` | Menu de configurações | `!config` |
| `!listtc` | Lista técnicos | `!listtc` |
| `!listadm` | Lista administradores | `!listadm` |
| `!menss=[texto]` | Altera saudação | `!menss=Olá! Como posso ajudar?` |
| `!msfinal=[texto]` | Altera mensagem final | `!msfinal=Obrigado pelo contato!` |
| `!ping` | Testa sistema | `!ping` |
| `!tecnico=[numero]` | Promove a técnico | `!tecnico=5511999999999` |
| `!adm=[numero]` | Promove a admin | `!adm=5511999999999` |
| `!historico` | Visualiza histórico | `!historico` |

## 🗂️ Estrutura do Projeto

```
bot-whatsapp/
├── bot.js                 # Arquivo principal do bot
├── package.json           # Dependências do projeto
├── .env                   # Variáveis de ambiente
├── config/
│   └── config.js         # Configurações gerais
├── db/
│   ├── database.js       # Gerenciador do banco de dados
│   └── atendimento.db    # Banco SQLite (criado automaticamente)
├── handlers/
│   └── commands.js       # Processador de comandos
├── utils/
│   └── logger.js         # Sistema de logs
├── logs/
│   └── bot.log          # Logs do sistema
├── auth_info_baileys/    # Sessão do WhatsApp (criado automaticamente)
└── docs/
    └── README.md        # Esta documentação
```

## 🔄 Fluxo de Atendimento

### 1. Abertura de Chamado
```
Usuário → Envia mensagem com problema
Bot → Analisa com IA (se disponível)
Bot → Cria OS automaticamente
Bot → Confirma criação com número da OS
```

### 2. Coleta de Dados Detalhados
```
Usuário → !dados
Bot → Solicita nome completo
Bot → Solicita local do atendimento
Bot → Solicita equipamento
Bot → Solicita ID AnyDesk
Bot → Solicita descrição do problema
Bot → Cria OS completa
```

### 3. Atendimento Técnico
```
Técnico → !list (visualiza OS abertas)
Técnico → !atendendo [id] (assume OS)
Técnico → !mensagem [id]=[texto] (comunica com usuário)
Técnico → !finalizado [id] (encerra atendimento)
```

## 📊 Exemplo de OS Gerada

```
✅ CHAMADO CRIADO COM SUCESSO

🎫 OS #0053
👤 Usuário: João Silva
📍 Local: Recepção
💻 Equipamento: Impressora HP
🖥️ AnyDesk: 123456789
📝 Problema: Impressora não imprime
📅 Criado em: 15/01/2024 14:30:25

🤖 Análise IA: Problema de hardware - Prioridade Normal
Categoria sugerida: Impressora

Comandos disponíveis:
• !atendendo 53
• !prioridade 53
• !setor 53=Financeiro
• !mensagem 53=Estamos verificando
```

## 🔐 Hierarquia de Usuários

### 👑 Root
- Acesso total ao sistema
- Números configurados: `69981170027`, `6884268042`
- Pode promover administradores
- Acesso a todas as configurações

### 🛡️ Administrador (ADM)
- Pode criar técnicos
- Alterar configurações do sistema
- Visualizar relatórios completos
- Gerenciar usuários

### 🔧 Técnico
- Atender chamados
- Alterar status das OS
- Comunicar com usuários
- Visualizar OS abertas

### 👤 Usuário
- Abrir chamados
- Consultar próprias OS
- Cancelar chamados próprios
- Fornecer dados adicionais

## 🗄️ Banco de Dados

### Tabelas Principais

#### `ordens_servico`
- `id`: ID único da OS
- `usuario_nome`: Nome do solicitante
- `usuario_telefone`: Telefone do solicitante
- `local_atendimento`: Local do problema
- `equipamento`: Equipamento com problema
- `anydesk`: ID do AnyDesk
- `problema`: Descrição do problema
- `status`: Status atual (aberta, em_andamento, finalizada, cancelada)
- `tecnico_responsavel`: Técnico atribuído
- `prioridade`: Nível de prioridade (0=normal, 1=alta)
- `setor`: Setor responsável
- `created_at`: Data de criação
- `updated_at`: Data da última atualização
- `finalizada_at`: Data de finalização

#### `usuarios`
- `telefone`: Número do telefone (único)
- `nome`: Nome do usuário
- `role`: Função (user, tecnico, admin, root)
- `created_at`: Data de cadastro
- `last_activity`: Última atividade

#### `historico_mensagens`
- `ordem_id`: ID da OS relacionada
- `usuario_telefone`: Telefone do remetente
- `mensagem`: Conteúdo da mensagem
- `tipo`: Tipo (user, tecnico, system)
- `created_at`: Data/hora da mensagem

## 🔧 Configurações Avançadas

### Variáveis de Ambiente (.env)
```env
# API Keys
OPENAI_API_KEY=sua_chave_openai_aqui

# Configurações do Bot
BOT_NUMBER=69981248816
ROOT_NUMBERS=69981170027,6884268042

# Banco de Dados
DB_PATH=./db/atendimento.db

# Logs
LOG_LEVEL=info

# Mensagens Personalizadas
MENSAGEM_SAUDACAO=Olá! Sou o assistente técnico.
MENSAGEM_FINAL=Atendimento finalizado. Obrigado!
```

### Personalização de Mensagens
```javascript
// Em config/config.js
messages: {
  saudacao: 'Sua mensagem de boas-vindas',
  final: 'Sua mensagem de encerramento',
  ajuda: 'Texto de ajuda personalizado'
}
```

## 🔄 Limpeza Automática

O sistema executa limpeza automática:
- **Frequência**: A cada 24 horas
- **Critério**: OS finalizadas há mais de 7 dias
- **Logs**: Registra quantidade de itens removidos

Para alterar o período:
```javascript
// Em config/config.js
cleanup: {
  daysToKeep: 30 // Altere para o número desejado de dias
}
```

## 📝 Logs do Sistema

### Localização
- Arquivo: `./logs/bot.log`
- Rotação automática: 5MB por arquivo
- Máximo: 5 arquivos históricos

### Tipos de Log
- **INFO**: Operações normais
- **WARN**: Avisos importantes
- **ERROR**: Erros do sistema
- **DEBUG**: Informações detalhadas

### Visualizar Logs Recentes
```bash
tail -f ./logs/bot.log
```

## 🚨 Solução de Problemas

### Bot não conecta
1. Verifique se o QR Code foi escaneado
2. Confirme se o WhatsApp está ativo no celular
3. Verifique logs em `./logs/bot.log`

### Comandos não funcionam
1. Verifique se o usuário tem permissão
2. Confirme sintaxe do comando
3. Verifique logs de erro

### Banco de dados corrompido
1. Pare o bot
2. Faça backup do arquivo `./db/atendimento.db`
3. Delete o arquivo para recriar
4. Reinicie o bot

### Problemas de memória
1. Monitore uso com `htop` ou `top`
2. Execute limpeza manual: `!ping` (para admins)
3. Reinicie o bot periodicamente

## 🔄 Backup e Restauração

### Backup Manual
```bash
# Backup do banco de dados
cp ./db/atendimento.db ./backup/atendimento_$(date +%Y%m%d).db

# Backup dos logs
cp ./logs/bot.log ./backup/bot_$(date +%Y%m%d).log

# Backup da sessão WhatsApp
cp -r ./auth_info_baileys ./backup/auth_backup_$(date +%Y%m%d)
```

### Restauração
```bash
# Restaurar banco
cp ./backup/atendimento_YYYYMMDD.db ./db/atendimento.db

# Restaurar sessão
cp -r ./backup/auth_backup_YYYYMMDD ./auth_info_baileys
```

## 🔮 Melhorias Futuras

### Planejadas
- [ ] Painel web administrativo
- [ ] Detecção automática de problemas via IA
- [ ] Relatórios semanais automatizados
- [ ] Controle de SLA (tempo de resposta)
- [ ] Backup automático em nuvem
- [ ] Integração com sistemas externos
- [ ] Notificações push
- [ ] Chat em tempo real no painel web

### Sugestões de Implementação
- [ ] Integração com Telegram
- [ ] Sistema de tickets por email
- [ ] Dashboard com métricas em tempo real
- [ ] Chatbot com IA mais avançada
- [ ] Sistema de avaliação de atendimento

## 📞 Suporte

Para suporte técnico ou dúvidas:
- **Números Root**: 69981170027, 6884268042
- **Bot**: 69981248816
- **Logs**: Consulte `./logs/bot.log`

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo LICENSE para mais detalhes.

---

**Desenvolvido com ❤️ para otimizar o atendimento técnico via WhatsApp**
