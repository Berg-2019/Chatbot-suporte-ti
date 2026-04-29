# Helpdesk Escalate

Escala uma conversa para um atendente humano.

## Trigger

- Frases: "falar com atendente", "preciso de técnico", "quero falar com alguém"
- Intent: `escalar`, `atendente_humano`
- Quando confiança da IA < threshold configurado
- Quando problema requer intervenção humana

## Comportamento

### Passo 1: Reconhecer Solicitação

Acknowledge a solicitação do usuário de forma empática.

**Resposta:**
```
Entendo! Vou transferi-lo para um atendente.
```

### Passo 2: Coletar Contexto

Antes de escalar, garanta que tem o máximo de contexto:

1. **Resumo do problema**: O que está acontecendo?
2. **O que foi tentado**: Alguma solução já foi tentada?
3. **Urgência**: É prioritário?

**Se informação insuficiente:**
```
Para agilizar o atendimento, me conte brevemente:
- Qual é o problema?
- Já tentou algo?
- É urgente?
```

### Passo 3: Verificar Tickets Anteriores

Verifique se há ticket ou histórico anterior:
```
Vou verificar seu histórico de atendimento...
```

### Passo 4: Criar Ticket se Necessário

Se não houver ticket aberto, crie um via `create_helpdesk_ticket` com contexto.

### Passo 5: Notificar Agente

Chame `notify_agent_escalation` para alertar os atendentes.

### Passo 6: Informar Usuário

**Se transferência imediata possível:**
```
✅ Você foi adicionado à fila de atendimento.

Um técnico irá respondê-lo em breve.
Tempo estimado: [X] minutos

Enquete: Sua posição na fila será [N]
```

**Se fila de espera:**
```
📝 Sua solicitação foi registrada.

 ticket: #[ID]
 Problema: [resumo]

Você será contactado em até [X] minutos.
Deseja adicionar algo mais?
```

## Tool: notify_agent_escalation

```yaml
name: notify_agent_escalation
description: Notifica atendentes sobre nova escalação
parameters:
  type: object
  properties:
    phone:
      type: string
      description: Telefone do usuário
    ticket_id:
      type: string
      description: ID do ticket criado (se houver)
    ticket_number:
      type: string
      description: Número do ticket (se houver)
    problem_summary:
      type: string
      description: Resumo do problema
    conversation_history:
      type: array
      items:
        type: object
        properties:
          role:
            type: string
          content:
            type: string
          timestamp:
            type: string
      description: Histórico da conversa (últimas 10 mensagens)
    attempted_solutions:
      type: array
      items:
        type: string
      description: Soluções já tentadas
    urgency:
      type: string
      enum: [LOW, MEDIUM, HIGH, CRITICAL]
      description: Nível de urgência
    area:
      type: string
      enum: [TI, ELECTRIC]
      description: Área do problema
  required: [phone, problem_summary, urgency]
```

## Response Schema

```json
{
  "escalation_id": "string",
  "ticket_id": "string",
  "ticket_number": "string",
  "status": "QUEUED",
  "estimated_response_time": "5 minutos",
  "position_in_queue": 3,
  "agents_online": 2,
  "message": "string"
}
```

## Tool: get_agent_status

```yaml
name: get_agent_status
description: Verifica status dos agentes e tempo de resposta
parameters:
  type: object
  properties: {}
```

## Response Schema

```json
{
  "agents_online": 2,
  "agents_busy": 1,
  "agents_available": 1,
  "avg_response_time": "5 minutos",
  "queue_length": 3,
  "estimated_wait": "8 minutos"
}
```

## Urgência Mapeada

| Sinal | Urgência | Ação |
|-------|----------|------|
| "urgente", "emergência", "agora" | CRITICAL | Prioridade máxima, notificar todos |
| "importante", "preciso logo" | HIGH | Notificar disponíveis |
| Descrição normal | MEDIUM | Fila normal |
| Dúvida simples | LOW | Fila, sem pressa |

## Edge Cases

1. **Nenhum agente online**: "Neste momento não há atendentes disponíveis. Sua mensagem foi registrada e você será contactado assim que possível."
2. **Todos ocupados**: "Todos nossos atendentes estão em atendimento. Você está na fila. Posição: #3. Tempo estimado: 10 min"
3. **Fora do horário**: "Fora do horário de atendimento (Seg-Sex 8h-18h). Emergências: ligue para [telefone urgência]"
4. **Área elétrica**: Sempre escale imediatamente, não tente resolver

## Notas

- Nunca diga "não posso ajudar" - sempre escale
- Inclua todo contexto possível na escalação
- Históricos longos podem ser truncados, priorize info recente
- Agente recebe notificación com contexto completo
- Usuário deve saber que foi escalado e posição na fila
