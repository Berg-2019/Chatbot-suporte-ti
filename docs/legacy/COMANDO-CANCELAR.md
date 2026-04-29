# ❌ Comando CANCELAR - Documentação

## 🎯 Objetivo

Permitir que usuários **saiam do fluxo de atendimento** a qualquer momento e **resetem a conversa** com o bot.

---

## 📝 Como Usar

### Comandos Aceitos:

Digite qualquer um dos seguintes comandos para cancelar:

- `cancelar`
- `cancel`
- `sair`
- `exit`
- `parar`
- `stop`

**Importante:** Funciona em **qualquer etapa** do fluxo (mesmo no meio de criar um chamado).

---

## 💬 Exemplos de Uso

### Exemplo 1: Cancelar durante coleta de dados

```
Bot: "Em qual setor/departamento você trabalha?"

Usuário: cancelar

Bot: "❌ Operação cancelada

Sua solicitação foi cancelada e a conversa foi resetada.

Digite oi ou menu para começar novamente. 😊"
```

### Exemplo 2: Cancelar na seleção de categoria

```
Bot: "Qual área de TI você precisa de suporte?
1️⃣ Infraestrutura
2️⃣ Sistemas
..."

Usuário: sair

Bot: "❌ Operação cancelada
..."
```

### Exemplo 3: Cancelar antes de confirmar

```
Bot: "Confirma a criação do chamado? (sim/não)"

Usuário: cancelar

Bot: "❌ Operação cancelada
..."
```

---

## 🔧 Detalhes Técnicos

### Implementação

**Arquivo:** `/bot/src/handlers/flow-handler.js` (linhas 170-177)

```javascript
// === Comando CANCELAR ===
if (['cancelar', 'cancel', 'sair', 'exit', 'parar', 'stop'].includes(normalizedText)) {
  await redisService.deleteSession(phone);
  console.log(`❌ Usuário ${phone} cancelou o fluxo`);
  await this.sendMessage(sock, from, '❌ *Operação cancelada*\n\n...');
  return;
}
```

### O que acontece:

1. **Limpa sessão do Redis** - Remove todos os dados coletados
2. **Loga ação** - Registra cancelamento nos logs
3. **Envia confirmação** - Informa usuário que operação foi cancelada
4. **Retorna controle** - Permite iniciar novo fluxo com `oi` ou `menu`

---

## 📊 Estados que Aceitam Cancelar

O comando `cancelar` funciona em **TODOS** os estados:

- ✅ `MENU` - Menu principal
- ✅ `ASK_NAME` - Coletando nome
- ✅ `ASK_DEPARTMENT` - Coletando departamento
- ✅ `SELECT_SECTOR_TI` - Selecionando categoria TI
- ✅ `SELECT_SECTOR_ELECTRIC` - Selecionando categoria Elétrica
- ✅ `DESCRIBE_PROBLEM` - Descrevendo problema
- ✅ `ASK_LOCATION` - Informando local
- ✅ `CHECK_FAQ` - Consultando FAQ
- ✅ `CONFIRM` - Confirmando chamado
- ✅ `SELECT_EQUIPMENT_TYPE` - Escolhendo tipo de equipamento
- ✅ `SELECT_EQUIPMENT` - Escolhendo equipamento
- ✅ `ASK_RESERVATION_START` - Data início reserva
- ✅ `ASK_RESERVATION_END` - Data fim reserva
- ✅ `ASK_RESERVATION_REASON` - Motivo da reserva
- ✅ `CONFIRM_RESERVATION` - Confirmando reserva

**EXCEÇÃO:** Não funciona quando há ticket ativo (`WAITING_TECHNICIAN` - usuário está conversando com técnico).

---

## 🎨 Mensagens com Dica de Cancelar

As seguintes mensagens incluem a dica "Digite cancelar para sair":

### 1. Pergunta de Departamento
```
🏢 Em qual setor/departamento você trabalha?

Exemplo: Financeiro, RH, Produção, Administrativo, etc.

Digite cancelar para sair
```

### 2. Descrição do Problema
```
📝 Descreva brevemente o seu problema:

Digite cancelar para sair
```

### 3. Local do Problema
```
📍 Qual é o local exato do problema?

(Ex: Sala de Reuniões, Predio Administrativo, Mesa 04, etc.)

Digite cancelar para sair
```

### 4. Seleção de Área TI
```
📋 Qual área de TI você precisa de suporte?

1️⃣ Infraestrutura (rede, internet, VPN)
...

Digite o número ou cancelar para sair:
```

### 5. Seleção de Serviço Elétrico
```
⚡ Qual tipo de serviço elétrico você precisa?

1️⃣ Iluminação (lâmpadas, luminárias)
...

Digite o número ou cancelar para sair:
```

---

## 🚨 Limitações e Observações

### ❌ Quando NÃO funciona:

**1. Ticket Ativo (Conversando com Técnico)**
```
Usuário: (tem ticket ativo #123)
Usuário: cancelar

Comportamento: Mensagem é encaminhada ao técnico (não cancela)
```

**Solução:** Usar comando `menu` para forçar reset.

### ⚠️ Avisos:

1. **Dados são perdidos** - Não há recuperação após cancelar
2. **Não cancela tickets criados** - Apenas o fluxo de criação
3. **Não funciona em comandos especiais** - `!ceo`, `!relatorio`, `!tecnico` não são canceláveis

---

## 📈 Casos de Uso Comuns

### 1. Usuário Errou Informação
```
Bot: "Qual é o seu nome?"
Usuário: "João" ❌ (digitou errado)
Usuário: cancelar
Bot: "Operação cancelada..."
Usuário: oi
Bot: (reinicia fluxo)
Usuário: "João Silva" ✅
```

### 2. Usuário Mudou de Ideia
```
Bot: "Qual área de TI?"
Usuário: (percebe que é elétrica, não TI)
Usuário: cancelar
Usuário: menu
Bot: (mostra menu)
Usuário: 2 (Elétrica) ✅
```

### 3. Usuário Precisa Sair com Urgência
```
Bot: "Descreva o problema:"
Usuário: cancelar
Bot: "Operação cancelada..."
(usuário pode retomar depois com 'oi')
```

---

## 🔄 Diferença entre Comandos

| Comando | Função | Mantém Ticket? | Limpa Sessão? |
|---------|--------|----------------|---------------|
| `cancelar` | Cancela fluxo atual | ❌ Não cria | ✅ Sim |
| `menu` | Volta ao menu | ✅ Sim (se já criado) | ✅ Sim |
| `oi` | Reinicia conversa | ✅ Sim (se ativo) | ⚠️ Depende |
| `status` | Consulta ticket | ✅ Não afeta | ❌ Não |

---

## 🧪 Como Testar

### Teste 1: Cancelar no Nome
```bash
# 1. Iniciar conversa
Enviar: "Meu computador não liga"

# 2. Bot pergunta nome
Bot: "Qual é o seu nome?"

# 3. Cancelar
Enviar: "cancelar"

# Resultado esperado:
✅ Bot responde: "Operação cancelada..."
✅ Sessão limpa (verificar Redis)
✅ Pode iniciar novo fluxo
```

### Teste 2: Cancelar na Categoria
```bash
# 1. Preencher nome e departamento
Bot: "Qual área de TI?"

# 2. Cancelar
Enviar: "sair"

# Resultado esperado:
✅ Bot responde: "Operação cancelada..."
✅ Dados anteriores perdidos
```

### Teste 3: Cancelar antes de Confirmar
```bash
# 1. Preencher todo fluxo
Bot: "Confirma? (sim/não)"

# 2. Cancelar
Enviar: "cancelar"

# Resultado esperado:
✅ Chamado NÃO é criado
✅ Pode recomeçar
```

---

## 📝 Logs Gerados

Quando usuário cancela, logs mostram:

```
❌ Usuário 5511999999999 cancelou o fluxo
```

**Onde ver:**
```bash
docker logs helpdesk_bot_dev --tail 50 -f | grep "cancelou"
```

---

## 🎯 Melhorias Futuras (Opcional)

### 1. Confirmação de Cancelamento
```
Usuário: cancelar
Bot: "Tem certeza que deseja cancelar? (sim/não)"
Usuário: sim
Bot: "Operação cancelada..."
```

### 2. Salvar Rascunho
```
Usuário: cancelar
Bot: "Deseja salvar rascunho para continuar depois? (sim/não)"
```

### 3. Cancelamento Parcial
```
Usuário: cancelar local
Bot: "Vou perguntar o local novamente:"
```

### 4. Analytics de Cancelamentos
```
Dashboard: "30% usuários cancelam na etapa de categoria"
Ação: Simplificar categorias
```

---

## ✅ Status

| Feature | Status |
|---------|--------|
| Comando `cancelar` | ✅ Implementado |
| Comando `sair` | ✅ Implementado |
| Comando `stop` | ✅ Implementado |
| Limpa sessão Redis | ✅ Implementado |
| Mensagem confirmação | ✅ Implementado |
| Dicas nas perguntas | ✅ Implementado |
| Logs de cancelamento | ✅ Implementado |
| Funciona em todos estados | ✅ Sim (exceto WAITING_TECHNICIAN) |

---

## 🚀 Como Usar Agora

**Pronto para uso!** Basta reiniciar o bot:

```bash
docker compose restart bot
```

**Testar:**
1. Enviar: "Olá"
2. Bot inicia fluxo
3. Enviar: "cancelar"
4. Bot cancela e permite recomeçar

---

**Comando cancelar implementado e funcionando! Usuários agora podem sair do fluxo a qualquer momento.** ✅
