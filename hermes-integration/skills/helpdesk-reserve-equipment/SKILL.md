# Helpdesk Reserve Equipment

Faz reserva de equipamentos de TI para empréstimo.

## Trigger

- Frases: "reservar equipamento", "empréstimo de note", "preciso de um notebook"
- Intent: `reservar_equipamento`, `emprestimo`
- Área deve ser TI (não elétrica)

## Comportamento

### Passo 1: Identificar Necessidade

Identifique o que o usuário precisa e por quê.

**Resposta inicial:**
```
Posso ajudá-lo com a reserva de equipamentos de TI.

O que você precisa?
1. Notebook
2. Monitor
3. Teclado/Mouse
4. Headset
5. Outro
```

### Passo 2: Coletar Detalhes

Colete information de forma natural:

| Campo | Como perguntar | Exemplo |
|-------|----------------|---------|
| **Tipo** | "O que exatamente você precisa?" | Notebook |
| **Data início** | "Quando precisa do equipamento?" | "Amanhã" |
| **Data fim** | "Até quando vai usar?" | "Sexta-feira" |
| **Motivo** | "Para que vai usar?" | "Reunião com cliente" |
| **Localização** | "Onde será usado?" | "Escritório central" |

**Conversa de exemplo:**
```
U: Preciso de um note
A: Para quando você precisa?
U: Amanhã de manhã
A: Certo! Até quando precisa ficar com ele?
U: Até sexta
A: Qual o motivo do empréstimo?
U: Tenho uma reunião com cliente
A: Onde será usado?
U: Aqui no escritório
A: Vou verificar disponibilidade...
```

### Passo 3: Verificar Disponibilidade

Antes de confirmar, chame tool `check_equipment_availability`.

### Passo 4: Confirmar Reserva

Se disponível:
```
✅ Equipamento disponível!

Resumo da reserva:
- Item: [tipo]
- Período: [data ini] a [data fim]
- Motivo: [motivo]
- Local: [localização]

Posso confirmar? (sim/não)
```

Se indisponível:
```
No momento não temos [equipamento] disponível.
Posso:
1. Colocar você na lista de espera
2. Sugerir alternativa (ex: monitor externo)
3. Encaminhar para atendente

O que prefere?
```

### Passo 5: Confirmar Criação

Após "sim", chame `create_equipment_reservation`.

### Passo 6: Informar Resultado

```
✅ Reserva criada com sucesso!

Número: #[ID]
Equipamento: [tipo]
Período: [data ini] - [data fim]
Status: CONFIRMADO

Quando for retirar, compareça no TI com seu crachá.
Devolução: [local]
```

## Tool: check_equipment_availability

```yaml
name: check_equipment_availability
description: Verifica disponibilidade de equipamento para reserva
parameters:
  type: object
  properties:
    stock_type:
      type: string
      enum: [NOTEBOOK, MONITOR, KEYBOARD, MOUSE, HEADSET, WEBCAM, DOCK_STATION, OTHER]
      description: Tipo do equipamento
    start_date:
      type: string
      description: Data de início (ISO8601)
    end_date:
      type: string
      description: Data de fim (ISO8601)
  required: [stock_type, start_date, end_date]
```

## Response Schema

```json
{
  "available": true,
  "stock_type": "NOTEBOOK",
  "available_quantity": 5,
  "total_quantity": 10,
  "items": [
    {
      "id": "string",
      "name": "string",
      "status": "AVAILABLE",
      "location": "string"
    }
  ],
  "reservations": [
    {
      "start_date": "ISO8601",
      "end_date": "ISO8601",
      "quantity": 2
    }
  ]
}
```

## Tool: create_equipment_reservation

```yaml
name: create_equipment_reservation
description: Cria uma reserva de equipamento
parameters:
  type: object
  properties:
    stock_type:
      type: string
      enum: [NOTEBOOK, MONITOR, KEYBOARD, MOUSE, HEADSET, WEBCAM, DOCK_STATION, OTHER]
      description: Tipo do equipamento
    start_date:
      type: string
      description: Data de início (ISO8601)
    end_date:
      type: string
      description: Data de fim (ISO8601)
    reason:
      type: string
      description: Motivo do empréstimo
    location:
      type: string
      description: Local de uso do equipamento
    phone:
      type: string
      description: Telefone do solicitante
    requesterName:
      type: string
      description: Nome do solicitante
  required: [stock_type, start_date, end_date, phone]
```

## Response Schema

```json
{
  "reservation_id": "string",
  "reservation_number": "string",
  "status": "CONFIRMED",
  "stock_type": "NOTEBOOK",
  "start_date": "ISO8601",
  "end_date": "ISO8601",
  "reason": "string",
  "message": "string"
}
```

## Edge Cases

1. **Renovação**: "Seu equipamento está para devolver, deseja renovar?"
2. **Atraso na devolução**: Ao aproximar data fim, confirme "Vai devolver no prazo?"
3. **Equipamento danificado**: Encaminhe para技术支持, não aceite devolução danificada
4. **Lista de espera**: Se indisponível, ofereça e registre interesse

## Notas

- Equipamentos são para uso profissional, não pessoal
- Máximo de 7 dias por empréstimo padrão
- Extensões devem ser solicitadas com antecedência
- Uso indevido pode suspender privilégio de empréstimo
