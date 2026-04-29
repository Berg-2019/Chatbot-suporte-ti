# Implementação do Status do Agente em Tempo Real

## 📋 Resumo

Implementação completa de um sistema de status de agentes em tempo real, permitindo que os técnicos indiquem sua disponibilidade (Online, Ocupado, Em Atendimento, Ausente, Offline) e que gestores visualizem o status de toda a equipe em tempo real.

## 🎯 Funcionalidades Implementadas

### 1. **Backend**

#### Schema do Banco de Dados (Prisma)
**Arquivo**: `backend/prisma/schema.prisma`

- **Novos campos no modelo User**:
  - `status: AgentStatus` - Status atual do agente (padrão: OFFLINE)
  - `lastStatusChange: DateTime?` - Timestamp da última mudança de status
  - `lastSeenAt: DateTime?` - Última vez que o agente foi visto online

- **Novo Enum AgentStatus**:
  - `ONLINE` - Disponível para atendimento
  - `BUSY` - Ocupado (não aceita novos tickets)
  - `IN_SERVICE` - Em atendimento
  - `IDLE` - Ocioso/Ausente
  - `OFFLINE` - Desconectado

#### WebSocket Gateway
**Arquivo**: `backend/src/presentation/websockets/events.gateway.ts`

**Eventos implementados**:
- `agent:identify` - Identifica o agente ao conectar
- `agent:status:update` - Atualiza status do agente
- `agent:status:changed` - Broadcast quando status de qualquer agente muda
- Auto-detecção de desconexão (marca como OFFLINE automaticamente)

**Métodos principais**:
```typescript
handleAgentIdentify(client, userId) // Identifica agente no socket
handleAgentStatusUpdate(client, payload) // Atualiza status via WebSocket
updateAgentStatus(userId, status) // Atualiza status no banco e faz broadcast
emitAgentStatusChanged(agent) // Emite mudança de status programaticamente
```

#### API REST
**Arquivo**: `backend/src/presentation/controllers/users/users.controller.ts`

**Endpoints adicionados**:
- `PUT /users/:id/status` - Atualiza status de um agente
- `GET /users/agents/status` - Retorna status de todos os agentes

**Arquivo**: `backend/src/presentation/controllers/users/users.service.ts`

**Métodos de serviço**:
```typescript
updateStatus(userId, status) // Atualiza status no banco
getAgentsStatus() // Busca status de todos os agentes ativos
```

### 2. **Frontend**

#### Componentes UI

**StatusBadge** (`frontend/src/app/components/ui/StatusBadge.tsx`)
- Badge visual para exibir status do agente
- Suporta 3 tamanhos (sm, md, lg)
- Animação de pulse para status ONLINE
- Cores personalizadas por status:
  - 🟢 Verde - ONLINE
  - 🔴 Vermelho - BUSY
  - 🔵 Azul - IN_SERVICE
  - 🟡 Amarelo - IDLE
  - ⚫ Cinza - OFFLINE

**StatusSelector** (`frontend/src/app/components/ui/StatusSelector.tsx`)
- Dropdown para seleção de status
- Atualiza status via callback
- Exibe status atual com indicador visual
- Fecha automaticamente ao clicar fora

#### Hook Personalizado

**useAgentStatus** (`frontend/src/app/hooks/useAgentStatus.ts`)

**Funcionalidades**:
- Gerencia estado do status atual do usuário
- Mantém lista de todos os agentes e seus status
- Conecta ao WebSocket para receber atualizações em tempo real
- Identifica agente ao conectar
- Marca como ONLINE automaticamente ao conectar
- Marca como OFFLINE ao desconectar ou fechar navegador
- Sincroniza via WebSocket + API REST (fallback)

**API do Hook**:
```typescript
{
  currentStatus: AgentStatus,        // Status atual do usuário
  agents: AgentStatusInfo[],         // Lista de todos os agentes
  updateStatus: (status) => void,    // Atualiza status
  fetchAgentsStatus: () => void      // Busca status de todos os agentes
}
```

#### Integrações

**Sidebar** (`frontend/src/app/components/Sidebar.tsx`)
- Seletor de status integrado acima da seção de usuário
- Persiste durante toda a sessão
- Atualiza em tempo real

**ManagerView** (`frontend/src/app/components/views/ManagerView.tsx`)
- Seção dedicada "Status dos Agentes"
- Grid responsivo mostrando todos os agentes
- Indicador de disponibilidade (X/Y disponíveis)
- Cards de agente com:
  - Avatar com iniciais
  - Nome e setor
  - Badge de status em tempo real
- Atualização automática via WebSocket

## 🔄 Fluxo de Funcionamento

### Ao Conectar
1. Frontend conecta ao WebSocket
2. `useAgentStatus` hook identifica o agente (`agent:identify`)
3. Backend registra o userId no socket
4. Hook busca lista de agentes via API REST
5. Hook atualiza status para ONLINE automaticamente

### Mudança de Status
1. Usuário seleciona novo status no `StatusSelector`
2. Hook chama `updateStatus(newStatus)`
3. Evento `agent:status:update` enviado via WebSocket
4. Backend atualiza banco de dados
5. Backend faz broadcast `agent:status:changed` para todos os clientes
6. Todos os clientes recebem atualização e atualizam UI

### Ao Desconectar
1. WebSocket detecta desconexão (`handleDisconnect`)
2. Backend marca agente como OFFLINE
3. Broadcast para todos os clientes
4. UI atualiza automaticamente

## 📁 Arquivos Modificados/Criados

### Backend
- ✅ `backend/prisma/schema.prisma` - Schema atualizado
- ✅ `backend/src/presentation/websockets/events.gateway.ts` - WebSocket events
- ✅ `backend/src/presentation/controllers/users/users.controller.ts` - Endpoints
- ✅ `backend/src/presentation/controllers/users/users.service.ts` - Serviços

### Frontend
- ✅ `frontend/src/app/components/ui/StatusBadge.tsx` - Componente de badge (NOVO)
- ✅ `frontend/src/app/components/ui/StatusSelector.tsx` - Seletor de status (NOVO)
- ✅ `frontend/src/app/hooks/useAgentStatus.ts` - Hook de gerenciamento (NOVO)
- ✅ `frontend/src/app/components/Sidebar.tsx` - Integração do seletor
- ✅ `frontend/src/app/components/views/ManagerView.tsx` - Visualização de status

## 🚀 Como Usar

### Para Agentes/Técnicos
1. Faça login no sistema
2. Abra a sidebar (menu lateral)
3. Clique no seletor de status (acima da seção de usuário)
4. Selecione seu status atual:
   - **Online**: Disponível para novos atendimentos
   - **Ocupado**: Não deseja receber novos tickets
   - **Em Atendimento**: Atualmente atendendo um ticket
   - **Ausente**: Temporariamente afastado
   - **Offline**: Desconectado

### Para Gestores
1. Acesse a **ManagerView** (Gestão)
2. Visualize a seção "Status dos Agentes" no topo
3. Veja em tempo real:
   - Status de cada agente
   - Quantos agentes estão disponíveis
   - Setor de cada agente
   - Indicadores visuais coloridos

## 🎨 Cores e Estados

| Status | Cor | Descrição |
|--------|-----|-----------|
| ONLINE | 🟢 Verde | Disponível e online |
| BUSY | 🔴 Vermelho | Ocupado, sem novos tickets |
| IN_SERVICE | 🔵 Azul | Em atendimento ativo |
| IDLE | 🟡 Amarelo | Ausente/Ocioso |
| OFFLINE | ⚫ Cinza | Desconectado do sistema |

## 🔧 Configuração

### Requisitos
- PostgreSQL com schema atualizado
- WebSocket habilitado (Socket.IO)
- Prisma Client regenerado após mudanças no schema

### Comandos Necessários
```bash
# Atualizar schema do banco
npx prisma db push

# Regenerar Prisma Client
npx prisma generate

# Build do backend
npm run build
```

## ✨ Melhorias Futuras Possíveis

1. **Auto-status baseado em atividade**
   - Detectar inatividade e mudar para IDLE automaticamente
   - Mudar para IN_SERVICE quando ticket é atribuído

2. **Histórico de status**
   - Tabela de logs de mudanças de status
   - Relatórios de disponibilidade por agente

3. **Notificações**
   - Alertar gestores quando nenhum agente estiver online
   - Notificar quando agente muda para OFFLINE inesperadamente

4. **Dashboard de disponibilidade**
   - Gráficos de tempo por status
   - Métricas de disponibilidade da equipe

5. **Integração com Auto-Assignment**
   - Considerar status do agente na distribuição automática
   - Não atribuir tickets para agentes BUSY ou OFFLINE

## 📊 Impacto

- ✅ Visibilidade em tempo real da disponibilidade da equipe
- ✅ Melhor gestão de recursos humanos
- ✅ Comunicação clara sobre disponibilidade
- ✅ Base para futuras otimizações de atribuição de tickets
- ✅ UX melhorada para gestores e agentes

---

**Implementado em**: 2026-03-18
**Versão**: 1.0.0
**Status**: ✅ Completo e Funcional
