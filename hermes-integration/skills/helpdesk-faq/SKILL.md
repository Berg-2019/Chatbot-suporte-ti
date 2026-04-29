# Helpdesk FAQ

Busca respostas na base de conhecimento do helpdesk.

## Trigger

- Frases: "como fazer", "pergunta frequente", "faq", "tenho dúvida"
- Perguntas sobre procedimentos: "como resetar", "como configurar", "como acessar"
- Intent: `consultar_faq`, `buscar_informacao`

## Comportamento

### Passo 1: Identificar Pergunta

Extraia a dúvida ou topic da mensagem do usuário.

**Se dúvida clara:**
```
Vou buscar na nossa base de conhecimento...
```

**Se vaga ou genérica:**
```
Posso ajudar com dúvidas sobre:
- Acesso a sistemas e senhas
- Configuração de equipamentos
- Procedimentos de rede
- Problemas comuns de TI

Qual é a sua dúvida?
```

### Passo 2: Buscar na KB

Chame a tool `search_helpdesk_faq` com a dúvida identificada.

### Passo 3: Apresentar Resultado

**Se encontrar resposta:**
```
📚 Encontrei isto na nossa base de conhecimento:

**${titulo}**

${conteudo_da_resposta}

---
Foi útil? Se não, posso transferir para um atendente.
```

**Se não encontrar:**
```
Não encontrei resposta para isso na minha base. Posso:
1. Transferir para um atendente
2. Criar um chamado para você

O que prefere?
```

## Tool: search_helpdesk_faq

```yaml
name: search_helpdesk_faq
description: Busca respostas na base de conhecimento do helpdesk
parameters:
  type: object
  properties:
    query:
      type: string
      description: Pergunta ou keywords para busca
    category:
      type: string
      enum: [ACCESS, CONFIG, NETWORK, HARDWARE, SOFTWARE, GENERAL]
      description: Categoria opcional para filtrar
  required: [query]
```

## Response Schema

```json
{
  "results": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "category": "string",
      "tags": ["string"],
      "similarity": 0.95,
      "helpful_count": 10,
      "created_at": "ISO8601"
    }
  ],
  "total": 5,
  "query": "string"
}
```

## Ferramentas Adicionais

### Tool: mark_faq_helpful

```yaml
name: mark_faq_helpful
description: Marca um artigo FAQ como útil ou não útil para feedback
parameters:
  type: object
  properties:
    faq_id:
      type: string
      description: ID do artigo FAQ
    helpful:
      type: boolean
      description: true se útil, false se não útil
  required: [faq_id, helpful]
```

## Categorias de FAQ

| Categoria | Exemplos de dúvidas |
|-----------|-------------------|
| ACCESS | "esqueci senha", "bloqueou conta", "acesso negadon" |
| CONFIG | "configurar email", "impressora não funciona", "wifi" |
| NETWORK | "sem internet", "VPN", "acesso remoto" |
| HARDWARE | "teclado não funciona", "monitor sem imagem", "note travando" |
| SOFTWARE | " Outlook travando", "Word não abre", "Atualizar programas" |
| GENERAL | "horário suporte", "onde é o TI", "telefone helpdesk" |

## Edge Cases

1. **Múltiplas respostas**: Mostre top 3 e pergunte qual mais se aplica
2. **Conteúdo muito longo**: Trunque com "..." e ofereça "Ver mais detalhes"
3. **Categoria errada**: Tente busca livre se categoria não ajudar
4. **Feedback negativo**: Registre e ofereça escalação

## Notas

- Prefira respostas curtas e diretas
- Inclua passos numerados quando procedimento
- Referencie sistemas pelo nome oficial
- Acompanhe utilidade para melhorarKB
