# Helpdesk Create Ticket

Cria um novo ticket de suporte no sistema de helpdesk.

## Trigger

- Frases: "abrir chamado", "criar ticket", "preciso de ajuda", "tenho um problema"
- Intent: `abrir_ticket`, `solicitar_suporte`
- Quando usuário descreve um problema que não consegue resolver automaticamente

## Comportamento

### Passo 1: Saudação e Coleta de Contexto

Quando triggered, seja acolhedor e explique que vai ajudar a abrir o chamado.

**Resposta inicial:**
```
Olá! Vou ajudá-lo a abrir um chamado de suporte. 
Para facilitar o atendimento, preciso de algumas informações.
```

### Passo 2: Coletar Informações

Colete as seguintes informações de forma natural (não em formulario):

| Campo | Como perguntar | Exemplo |
|-------|----------------|---------|
| **Descrição** | "Me conte o que está acontecendo?" | "O note está travando" |
| **Área** | "É um problema de TI ou elétrico?" | TI |
| **Setor** | "Qual é o seu departamento?" | Financeiro |
| **Localização** | "Onde está o equipamento?" | Sala de reunião 302 |
| **Nome** | "Qual é o seu nome?" | João Silva |

**Regras de coleta:**
- Faça uma pergunta por vez
- Aguarde resposta antes de passar para próxima
- Se informação vier espontaneamente na primeira mensagem, use-a
- Para área: force escolha entre "TI" ou "Elétrica"

### Passo 3: Confirmar Dados

Antes de criar, confirme com o usuário:
```
Posso confirmar as informações?
- Problema: [descrição]
- Área: [TI/Elétrica]
- Setor: [departamento]
- Localização: [local]

Está correto? (sim/não)
```

### Passo 4: Criar Ticket

Após confirmação, chame a tool `create_helpdesk_ticket` com os dados coletados.

### Passo 5: Informar Resultado

Se criado com sucesso:
```
✅ Ticket criado com sucesso!

Número do chamado: #[ID]
Área: [área]
Previsão de atendimento: [tempo]

Você pode consultar o status a qualquer momento dizendo "status do chamado #[ID]".
```

Se falhar:
```
Ops! Tive problema ao criar o ticket. Um técnico entrará em contato em breve para auxiliar.
(Guarde o número do protocolo: [algum identificador])
```

## Tool: create_helpdesk_ticket

```yaml
name: create_helpdesk_ticket
description: Cria um novo ticket de suporte no sistema de helpdesk
parameters:
  type: object
  properties:
    title:
      type: string
      description: Título resumido do problema (max 100 caracteres)
    description:
      type: string
      description: Descrição detalhada do problema
    area:
      type: string
      enum: [TI, ELECTRIC]
      description: Área do chamado (TI para tecnologia, ELECTRIC para elétrica)
    sector:
      type: string
      description: Departamento do solicitante
    location:
      type: string
      description: Localização física do equipamento/problema
    requesterName:
      type: string
      description: Nome completo do solicitante
    phone:
      type: string
      description: Número de telefone do solicitante (formato: 5511999999999)
  required: [title, description, area, phone]
```

## Response Schema

```json
{
  "ticket_id": "string",
  "ticket_number": "string",
  "status": "OPEN",
  "estimated_response": "string",
  "message": "string"
}
```

## Edge Cases

1. **Usuário já tem ticket aberto**: Verifique via `check_active_ticket` antes de criar novo
2. **Informações insuficientes**: Se usuário não souber responder, use "Não informado" ou "A confirmar"
3. **Área elétrica**: Escalone diretamente para técnico humano (problemas elétricos são críticos)
4. **Urgência**: Se usuário enfatizar urgência ("está pegando fogo!", "urgente"), marque como prioritário

## Notas

- Mantenha tom profissional mas amigável
- Use emojis com moderação (apenas para confirmar sucesso ❌✅)
- Sempre ofereça opção de falar com atendente: "Se preferir, posso transferir para um atendente agora"
