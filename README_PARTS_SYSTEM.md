# Sistema de Solicitação de Peças - Bot WhatsApp

Este documento descreve as novas funcionalidades implementadas no bot de atendimento WhatsApp para gerenciamento de solicitações de peças.

## 🆕 Novas Funcionalidades

### 1. Integração com Grupo Técnico
- O bot agora envia notificações de novas OS para o grupo técnico específico
- Comandos do bot funcionam dentro do grupo técnico
- Notificações automáticas para eventos importantes (nova OS, peças solicitadas, etc.)

### 2. Sistema de Solicitação de Peças
- Novo comando `!listpeças` para técnicos solicitarem peças
- Workflow completo de solicitação e atendimento
- Notificações automáticas para técnicos e almoxarifado

### 3. Painel Web para Almoxarifado
- Interface web dedicada para gerenciar solicitações de peças
- Visualização de todas as solicitações por status
- Controle de atendimento e histórico

### 4. Novo Papel de Usuário
- Papel `almoxarifado` para usuários responsáveis pelas peças
- Comandos específicos para gerenciar solicitações

## 📋 Comandos Disponíveis

### Para Técnicos:
- `!listpeças [id_os]` - Solicitar peças para uma OS específica
- `!pecas` - Ver solicitações de peças (apenas almoxarifado)
- `!atender [id_solicitacao]` - Atender solicitação (apenas almoxarifado)

### Para Administradores:
- `!almoxarifado=[telefone]` - Promover usuário a almoxarifado

## 🔧 Como Usar

### 1. Solicitando Peças (Técnico)

1. Use o comando `!listpeças [ID_DA_OS]`
2. Digite as peças necessárias (uma por linha)
3. Adicione observações se necessário
4. A solicitação será enviada para o almoxarifado

**Exemplo:**
```
!listpeças 123

# Bot responde solicitando as peças
- Mouse óptico USB
- Cabo de rede CAT5e 2m
- Toner HP CF217A

# Bot solicita observações
Peças urgentes para impressora da recepção
```

### 2. Gerenciando Peças (Almoxarifado)

#### Via WhatsApp:
- `!pecas` - Ver todas as solicitações pendentes
- `!atender [ID]` - Marcar solicitação como atendida

#### Via Interface Web:
1. Acesse `/parts` no navegador
2. Visualize solicitações por status
3. Use os botões para alterar status das solicitações

### 3. Configuração do Grupo Técnico

O grupo técnico está configurado no arquivo `config/config.js`:
```javascript
whatsapp: {
  grupoTecnico: 'H6Mb8FQAnhaJhY5RdyIKjP@g.us'
}
```

## 🗄️ Estrutura do Banco de Dados

### Nova Tabela: `solicitacoes_pecas`
```sql
CREATE TABLE solicitacoes_pecas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ordem_id INTEGER NOT NULL,
  tecnico_telefone TEXT NOT NULL,
  tecnico_nome TEXT,
  pecas_solicitadas TEXT NOT NULL,
  observacoes TEXT,
  status TEXT DEFAULT 'pendente',
  almoxarifado_responsavel TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  atendida_at DATETIME,
  FOREIGN KEY (ordem_id) REFERENCES ordens_servico (id)
);
```

### Status das Solicitações:
- `pendente` - Solicitação criada, aguardando atendimento
- `em_separacao` - Peças sendo separadas
- `atendida` - Peças disponibilizadas para retirada
- `cancelada` - Solicitação cancelada

## 🌐 Interface Web

### Página Principal (`/`)
- Visualização de todas as OS
- Botão "Gerenciar Peças" no cabeçalho

### Página de Peças (`/parts`)
- Abas por status das solicitações
- Detalhes completos de cada solicitação
- Botões para alterar status
- Informações do técnico, OS relacionada e peças solicitadas

## 🔄 Fluxo de Trabalho

1. **Técnico** cria solicitação de peças usando `!listpeças`
2. **Sistema** notifica o grupo técnico sobre a nova solicitação
3. **Almoxarifado** visualiza solicitações via web ou WhatsApp (`!pecas`)
4. **Almoxarifado** inicia separação (status: `em_separacao`)
5. **Almoxarifado** finaliza atendimento (status: `atendida`)
6. **Sistema** notifica o técnico que as peças estão disponíveis

## 📱 Notificações Automáticas

### Grupo Técnico recebe:
- Novas OS criadas
- Novas solicitações de peças
- Peças disponibilizadas
- OS finalizadas

### Técnico recebe:
- Confirmação de solicitação criada
- Notificação quando peças estão disponíveis

## 🚀 Instalação e Configuração

1. **Banco de Dados**: As novas tabelas são criadas automaticamente
2. **Grupo WhatsApp**: Configure o ID do grupo em `config/config.js`
3. **Interface Web**: Acesse `/parts` após iniciar o servidor Next.js

## 📊 APIs Disponíveis

### `/api/parts`
- `GET` - Listar solicitações de peças
- `POST` - Criar nova solicitação
- `PUT` - Atualizar status da solicitação

### Parâmetros GET:
- `status` - Filtrar por status
- `limit` - Limite de registros
- `offset` - Offset para paginação

## 🔐 Permissões

### Técnicos podem:
- Solicitar peças para OS
- Ver status de suas solicitações

### Almoxarifado pode:
- Ver todas as solicitações
- Alterar status das solicitações
- Acessar interface web de gerenciamento

### Administradores podem:
- Promover usuários a almoxarifado
- Todas as funcionalidades anteriores

## 📝 Logs e Monitoramento

O sistema registra todas as ações relacionadas a peças:
- Criação de solicitações
- Mudanças de status
- Notificações enviadas
- Erros de processamento

## 🆘 Solução de Problemas

### Bot não responde no grupo:
- Verifique se o ID do grupo está correto
- Confirme se o bot está no grupo
- Verifique as permissões do bot no grupo

### Interface web não carrega dados:
- Confirme se o banco de dados existe
- Verifique se o bot foi executado pelo menos uma vez
- Confirme se o SQLite3 está instalado

### Notificações não chegam:
- Verifique a conexão do bot
- Confirme se os números estão corretos
- Verifique os logs para erros de envio

## 🔄 Atualizações Futuras

Funcionalidades planejadas:
- Histórico de consumo de peças
- Relatórios de solicitações
- Integração com sistema de estoque
- Notificações por email
- Dashboard de métricas
