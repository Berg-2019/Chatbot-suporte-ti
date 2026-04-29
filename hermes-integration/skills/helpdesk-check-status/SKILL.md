# Helpdesk Check Status

Consulta o status de um ticket existente no sistema de helpdesk.

## Trigger

- Frases: "status do chamado", "andamento do ticket", "como está meu chamado"
- Formato: "ticket #1234", "chamado 1234"
- Intent: `consultar_ticket`, `verificar_status`

## Comportamento

### Passo 1: Identificar Ticket

Tente extrair o número do ticket da mensagem do usuário.

**Se usuário informar número:**
```
Deixe-me verificar o ticket #${numero}...
```

**Se não informar ou ambiguo:**
```
Para consultar, me informe o número do ticket (ex: #1234)
```

### Passo 2: Buscar Informações

Chame a tool `check_helpdesk_ticket` com o número identificado.

### Passo 3: Apresentar Resultado

**Se ticket encontrado:**
```
📋 Ticket #${numero}

Status: ${status}
Título: ${titulo}
Criado em: ${data_criacao}
Última atualização: ${ultima_atualizacao}

${se_tecnico_atribuido}
  Técnico: ${nome_tecnico}
  Previsão: ${previsao}
${/se_tecnico_atribuido}
```

**Mapeamento de status:**
| Status | Exibição | Cor |
|--------|----------|-----|
| OPEN | Em aberto | 🟡 |
| IN_PROGRESS | Em atendimento | 🔵 |
| PENDING | Aguardando resposta | 🟠 |
| RESOLVED | Resolvido | 🟢 |
| CLOSED | Fechado | ⚫ |

**Se ticket não encontrado:**
```
Não encontrei o ticket #${numero}. Verifique o número ou entre em contato com o suporte.
```

## Tool: check_helpdesk_ticket

```yaml
name: check_helpdesk_ticket
description: Consulta o status e detalhes de um ticket existente
parameters:
  type: object
  properties:
    ticket_id:
      type: string
      description: Número ou ID do ticket (formato: #1234 ou 1234)
  required: [ticket_id]
```

## Response Schema

```json
{
  "ticket_id": "string",
  "ticket_number": "string",
  "status": "OPEN|IN_PROGRESS|PENDING|RESOLVED|CLOSED",
  "title": "string",
  "description": "string",
  "area": "TI|ELECTRIC",
  "sector": "string",
  "location": "string",
  "requesterName": "string",
  "phone": "string",
  "assignedTo": {
    "name": "string",
    "id": "string"
  },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "estimatedResponse": "string",
  "history": [
    {
      "date": "ISO8601",
      "action": "string",
      "by": "string",
      "note": "string"
    }
  ]
}
```

## Tool: check_active_ticket

```yaml
name: check_active_ticket
description: Verifica se há ticket ativo para um telefone
parameters:
  type: object
  properties:
    phone:
      type: string
      description: Número de telefone (formato: 5511999999999)
  required: [phone]
```

## Response Schema (active ticket)

```json
{
  "has_active_ticket": true,
  "ticket": {
    "ticket_id": "string",
    "ticket_number": "string",
    "status": "OPEN|IN_PROGRESS",
    "title": "string",
    "createdAt": "ISO8601"
  }
}
```

## Edge Cases

1. **Múltiplos tickets**: Mostre o mais recente e pergunte se quer consultar outro específico
2. **Ticket fechado**: Indique "Este chamado foi encerrado. Deseja abrir um novo?"
3. **Sem número**: Peça educadamente o número, evite ficar preso em loop
4. **Histórico vazio**: Não mostre seção de histórico se não houver entradas

## Notas

- Use formatação consistente
- Para tickets em atendimento, sugira: "Deseja adicionar alguma informação ao chamado?"
- Lembre que usuário pode não记忆力 o número exato - aceite variações
