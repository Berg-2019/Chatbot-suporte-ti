# Sincronização de Alterações (Antigravity -> Claude Code)

Este documento lista todas as alterações estruturais (Backend e Frontend) implementadas nas branchs de desenvolvimento recentes para aprimoramento da interface do Helpdesk (estilo Chatwoot). Este arquivo visa evitar conflitos e dar contexto às próximas IAs (ex: Claude Code) que assumirem o projeto.

## 1. Melhorias na Sidebar e Navegação (`App.tsx` e `Sidebar.tsx`)
- **Organização Consolidada:** Itens como Agentes, Bot IA, FAQ, e Permissões foram agrupados sob um único menu expansível chamado `Configurações`.
- **Top Level Tabs Adicionadas:** "Minha Caixa" e "Conversas" foram colocadas no topo para priorizar o workflow de atendimento.
- **Ícones e Layout:** Padronização dos ícones (Lucide React) para dar aspecto nativo de plataforma de chat.

## 2. Sistema de @Mentions no Chat (`ChatView.tsx`, `TeamChatView.tsx`)
- **Frontend (`ChatView.tsx`):** Implementada a barra de pesquisa suspensa (`Dropdown`) ao digitar `@` dentro do chat. Essa funcionalidade puxa a lista de Agentes ativos da API.
- **Backend:** 
  - O `MessagesController` e o `MessagesService` (rota POST `/api/tickets/:id/messages`) agora aceitam e persistem os campos `isInternal` (boolean) e `mentions` (array de IDs).
  - Notas internas (privadas) ganharam background amarelo e bloqueio de envio no WhatsApp para garantir segurança.

## 3. Gestão e Lista de Contatos (`ContactsView.tsx`)
- **Criação Nativa:** Componente desenhado do zero para não depender de usuários do GLPI.
- **Interface Segura:** Telefones brutos (JIDs) foram escondidos por padrão. Mostra-se Setor, Nome e Departamento.
- **Ação Rápida:** O botão "Enviar Mensagem" na lista de Contatos agora chama a API para automaticamente criar um Ticket de conversação limpo e encaminhar o agente direto para o Chat.

## 4. Gestão de Agentes / Usuários (Local vs GLPI)
- **Desacoplamento do GLPI:** A tabela de Agentes na aba de configurações foi inteiramente reescrita (`UsersView.tsx`).
- **Novo Fluxo de Criação:**
  - Foi criado o endpoint `POST /api/users` no `UsersController` que envia direto ao banco de dados Prisma local.
  - O novo fluxo aceita Nome, E-mail, Senha (hasheada com bcrypt na service) e Cargo, dispensando totalmente a sincronização pesada do GLPI e aliviando erros 500.

## 5. Prevenção de Bugs Críticos Resolvidos
- **Duplicação de Notas Internas:** O `ChatView.tsx` sofreu refatoração. Removida a adição local "ansiosa" de mensagens no state. O chat agora aguarda silenciosamente o ping de volta do WebSockets (`socket.io`) para renderizar mensagens enviadas, prevenindo clones visuais.
- **Loading Race Condition:** O `AppLoadingScreen` foi ajustado no `App.tsx` para bloquear a árvore inteira de componentes enquanto o `AuthContext` não estiver pronto. Isso corrigiu um erro massivo de *401 Unauthorized* em chamadas APIs prematuras.

---
> **Anotação para Claude Code:** O banco de dados (`schema.prisma`) não sofreu deleção de campos legados do GLPI. O modelo de usuários continua suportando a integração antiga, apenas adicionamos atalhos "bypass" para gerenciar o bot independentemente.
