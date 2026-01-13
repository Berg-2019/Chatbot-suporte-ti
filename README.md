# 🤖 Bot WhatsApp - Atendimento Técnico

Sistema de Ordens de Serviço via WhatsApp para suporte técnico corporativo.

![Node.js](https://img.shields.io/badge/Node.js-22+-green)
![Docker](https://img.shields.io/badge/Docker-ready-blue)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Baileys-25D366)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 📋 Funcionalidades

- ✅ **Abertura de Chamados** - Fluxo conversacional guiado
- ✅ **15 Setores** - RH, Engenharia, Licitação, Compras, etc.
- ✅ **7 Tipos de Chamado** - Ponto eletrônico, sistemas, manutenção, etc.
- ✅ **Gestão de OS** - Atender, finalizar, escalar chamados
- ✅ **Relatórios** - Semanais e mensais com métricas de desempenho
- ✅ **Sistema de Permissões** - User, Técnico, Admin, Root
- ✅ **Notificações** - Grupo técnico recebe alertas de novos chamados
- ✅ **Docker** - Deploy simplificado com Docker Compose

---

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 20+ ou Docker
- Número de WhatsApp para o bot

### Opção 1: Com Docker (Recomendado)

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/bot-whatsapp-atendimento.git
cd bot-whatsapp-atendimento

# Copiar arquivo de configuração
cp .env.example .env

# Editar configurações (opcional)
nano .env

# Iniciar em modo desenvolvimento
./scripts/setup.sh dev
```

### Opção 2: Sem Docker

```bash
# Entrar no diretório do bot
cd bot-whatsapp/

# Instalar dependências
npm install

# Iniciar o bot
npm run dev
```

### Conectando ao WhatsApp

Na primeira execução, o bot solicitará um número de telefone:

```
⚠️ Credenciais ainda não configuradas!
ℹ️ Informe o número de telefone do bot (exemplo: "5569981170027"):
Número de telefone: 5569XXXXXXXXX

💬 Código de pareamento: XXXX-XXXX
```

1. Abra o WhatsApp no celular
2. Vá em **Configurações > Dispositivos Conectados > Conectar Dispositivo**
3. Escolha **Conectar com número de telefone**
4. Digite o código de pareamento exibido no terminal

---

## 📦 Estrutura do Projeto

```
bot-whatsapp-atendimento/
├── bot-whatsapp/
│   ├── src/
│   │   ├── index.js              # Ponto de entrada
│   │   ├── config.js             # Configurações (setores, tipos)
│   │   ├── connection.js         # Conexão WhatsApp
│   │   ├── loader.js             # Carregador de eventos
│   │   ├── middlewares/
│   │   │   ├── onMessagesUpsert.js  # Processamento de mensagens
│   │   │   ├── flowHandler.js       # Fluxo de atendimento
│   │   │   └── commandHandler.js    # Comandos do sistema
│   │   ├── services/
│   │   │   ├── database.js          # Banco de dados SQLite
│   │   │   └── reportService.js     # Geração de relatórios
│   │   └── utils/
│   │       ├── logger.js            # Logs coloridos
│   │       └── badMacHandler.js     # Tratamento de erros
│   ├── db/                       # Banco de dados SQLite
│   └── package.json
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── scripts/
    └── setup.sh                  # Script de gerenciamento
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

Edite o arquivo `.env`:

```env
# Nome do bot
BOT_NAME="Bot de Atendimento Técnico"

# Prefixo dos comandos
PREFIX="!"

# ID do grupo de técnicos (obtenha via !grupoid)
GRUPO_TECNICO_ID=

# Números root (administradores supremos)
ROOT_NUMBERS=556981170027,556884268042
```

### Configurando o Grupo Técnico

1. Adicione o bot ao grupo de técnicos
2. No grupo, digite `!grupoid`
3. Copie o ID exibido e cole em `GRUPO_TECNICO_ID` no `.env`
4. Reinicie o bot

---

## 💬 Fluxo de Atendimento

O bot guia o usuário através de um fluxo conversacional:

```
1. 👋 Usuário envia "oi" ou "olá"
2. 🏢 Bot pergunta o setor
3. 🔧 Bot pergunta o tipo de chamado
4. 📍 Bot solicita o local
5. 💻 Bot solicita o equipamento
6. 🏷️ Bot solicita o patrimônio
7. 📝 Bot solicita descrição do problema
8. ✅ Usuário confirma os dados
9. 🔔 OS é criada e grupo técnico é notificado
```

### Setores Disponíveis

| ID  | Setor                               |
| --- | ----------------------------------- |
| 1   | RH                                  |
| 2   | Engenharia                          |
| 3   | Licitação                           |
| 4   | Compras                             |
| 5   | Transporte                          |
| 6   | Vendas                              |
| 7   | Controladoria                       |
| 8   | Apropriação                         |
| 9   | Posto Rio Branco                    |
| 10  | Posto Porto Velho                   |
| 11  | Escritório de Pedreira              |
| 12  | Usina de Asfalto                    |
| 13  | Usina de Concreto                   |
| 14  | Laboratório de Concreto             |
| 15  | Adm. Posto Rio Branco e Porto Velho |

### Tipos de Chamado

| ID  | Tipo                              |
| --- | --------------------------------- |
| 1   | Outros                            |
| 2   | Ponto eletrônico                  |
| 3   | Servidores/Acesso Remoto          |
| 4   | Sistemas (LOTUS/MOVTRANS/Balança) |
| 5   | Acessórios (teclado, mouse)       |
| 6   | Manutenção de PC                  |
| 7   | Reposição de tinta                |

---

## 📝 Comandos

### Comandos Gerais (Todos os usuários)

| Comando          | Descrição                           |
| ---------------- | ----------------------------------- |
| `!ajuda`         | Lista todos os comandos disponíveis |
| `!menu`          | Exibe o menu principal              |
| `!status`        | Lista seus chamados                 |
| `!status <id>`   | Detalhes de um chamado específico   |
| `!cancelar <id>` | Cancela um chamado                  |

### Comandos de Técnico

| Comando           | Descrição                   |
| ----------------- | --------------------------- |
| `!atender <id>`   | Assume um chamado           |
| `!finalizar <id>` | Conclui um chamado          |
| `!escalar <id>`   | Escala para nível 2         |
| `!listar`         | Lista chamados abertos      |
| `!pendentes`      | Chamados aguardando técnico |

### Comandos de Admin

| Comando                   | Descrição                  |
| ------------------------- | -------------------------- |
| `!relatorio semana`       | Relatório semanal          |
| `!relatorio mes`          | Relatório mensal           |
| `!promover <tel> <cargo>` | Promove usuário            |
| `!tecnicos`               | Lista técnicos cadastrados |

### Comandos de Root

| Comando    | Descrição                |
| ---------- | ------------------------ |
| `!backup`  | Cria backup do banco     |
| `!grupoid` | Mostra ID do grupo atual |
| `!config`  | Exibe configurações      |

---

## 📊 Relatórios

O sistema gera relatórios detalhados de desempenho:

```
📊 RELATÓRIO SEMANAL - SUPORTE TI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Período: 06/01 a 13/01/2026

📈 RESUMO GERAL
• Total de chamados: 47
• Finalizados: 35 ✅
• Em andamento: 4 🟡
• Taxa de resolução: 74.5%

⏱️ TEMPOS
• Tempo médio de resposta: 15 min
• Tempo médio de resolução: 2h 34min

🏢 POR SETOR
• RH: 12 (26%) ▓▓▓░░░░░░░
• Administrativo: 8 (17%) ▓▓░░░░░░░░

👨‍💻 TOP TÉCNICOS
🥇 João Silva - 18 atendimentos
🥈 Maria Santos - 12 atendimentos
🥉 Pedro Costa - 5 atendimentos

💡 INSIGHTS
✅ Excelente taxa de resolução!
⚡ Ótimo tempo de resposta!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🐳 Comandos Docker

```bash
# Desenvolvimento (com logs em tempo real)
./scripts/setup.sh dev

# Produção (background)
./scripts/setup.sh start

# Parar
./scripts/setup.sh stop

# Reiniciar
./scripts/setup.sh restart

# Ver logs
./scripts/setup.sh logs

# Ver status
./scripts/setup.sh status

# Criar backup
./scripts/setup.sh backup

# Ver ajuda
./scripts/setup.sh help
```

---

## 🔧 Desenvolvimento

### Executar localmente

```bash
cd bot-whatsapp/
npm install
npm run dev
```

### Scripts disponíveis

```bash
npm start       # Inicia o bot
npm run dev     # Inicia com auto-reload
npm run init-db # Inicializa o banco de dados
```

---

## 📁 Banco de Dados

O bot usa SQLite para persistência. O banco é criado automaticamente em `bot-whatsapp/db/atendimento.db`.

### Tabelas principais

- `ordens_servico` - Chamados/OS
- `usuarios` - Usuários e permissões
- `historico_mensagens` - Histórico de interações
- `fluxo_conversacao` - Estado do fluxo de cada usuário
- `configuracoes` - Configurações do sistema

---

## 🔒 Sistema de Permissões

| Role           | Descrição     | Pode                 |
| -------------- | ------------- | -------------------- |
| `user`         | Usuário comum | Abrir/ver chamados   |
| `almoxarifado` | Almoxarife    | Gerenciar peças      |
| `tecnico`      | Técnico       | Atender chamados     |
| `admin`        | Administrador | Promover, relatórios |
| `root`         | Super admin   | Tudo, backup, config |

Para promover um usuário:

```
!promover 69999888777 tecnico
```

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 📞 Suporte

- Abra uma [issue](https://github.com/seu-usuario/bot-whatsapp-atendimento/issues) para reportar bugs
- Para dúvidas, consulte a documentação acima

---

Desenvolvido com ❤️ para facilitar o suporte técnico corporativo.
