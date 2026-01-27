# Plano de Correções de Debug

## Descrição do Objetivo
Corrigir problemas com duplicação de mensagens, ativação incorreta do fluxo do bot ('Ola') e persistência de contato.

## Alterações Propostas

### Backend

#### [MODIFICAR] [messages.service.ts](file:///home/helpdesk/Projeto chatbot/Chatbot-suporte-ti/backend/src/presentation/controllers/messages/messages.service.ts)
- Atualizar `createFromWhatsApp` para retornar `{ message, isNew: boolean }`.
- Isso permite que os consumidores saibam se devem executar efeitos colaterais (como enviar para o GLPI).

#### [MODIFICAR] [incoming-messages.consumer.ts](file:///home/helpdesk/Projeto chatbot/Chatbot-suporte-ti/backend/src/infrastructure/services/incoming-messages.consumer.ts)
- Atualizar `processMessage` para verificar `result.isNew`.
- Chamar `glpi.addFollowup` apenas se `isNew` for verdadeiro.

### Bot

#### [MODIFICAR] [flow-handler.js](file:///home/helpdesk/Projeto chatbot/Chatbot-suporte-ti/bot/src/handlers/flow-handler.js)
- Adicionar `encodeURIComponent` ao parâmetro `phone` na chamada `tickets/by-phone`.
- Adicionar logs de console na verificação de "Ola" para depurar por que falha ao encontrar o ticket.
- Garantir que a verificação de status trate a sensibilidade de maiúsculas/minúsculas (segurança).

### Frontend / Geral
- Verificar a exibição de `customerName` (verificação manual apenas, pois não posso editar o frontend facilmente sem mais informações, mas garantir que o backend o envie).

## Plano de Verificação

### Testes Automatizados
- Nenhum disponível para esta integração específica.

### Verificação Manual
1.  **Duplicação**:
    -   Enviar "Teste duplicação" pelo WhatsApp.
    -   Verificar nos logs: `IncomingMessagesConsumer` deve rodar.
    -   Verificar no GLPI: Apenas 1 acompanhamento (followup) deve aparecer.
    -   Enviar a mesma mensagem novamente (simular duplicata): Deve logar "Duplicata ignorada" e NÃO adicionar acompanhamento no GLPI.

2.  **Fluxo "Ola"**:
    -   Ter um ticket ativo.
    -   Enviar "Ola".
    -   O bot NÃO deve mostrar o menu.
    -   O bot deve responder ou ficar silencioso (dependendo do fluxo), mas NÃO deve enviar "Como posso ajudar".
    -   Se falhar, verificar logs para "DEBUG: verificando ticket para..."

3.  **Contato/Nome**:
    -   Criar ticket via bot, fornecendo nome.
    -   Verificar no Backend/GLPI se o nome foi salvo.
    -   Fechar ticket.
    -   Enviar "Ola" novamente após fechar -> O bot deve lembrar o nome (se implementado). (O ticket diz que o bot não lembra, vou verificar a lógica).

## Revisão do Usuário Necessária
- Nenhuma.
