# Design — Direcionamento por setor + cadastro de agente (frontend)

> Aprovado por @Berg-2019 em 2026-06-15. Frontend: `Frontend-chatbot/` (TanStack Start + React 19 + shadcn).
> Decisão de arquitetura mantida: **PWA único, setor vem do JWT, sem redirect entre subdomínios** (CLAUDE.md 2026-05-10).

## Objetivo
1. O agente é direcionado ao "front do seu setor" **conforme o login** (JWT), sem seletor manual.
2. Remover o seletor de setor das configurações.
3. O cadastro de agente contém **cargo, setor e dados cadastrais**; ao salvar, o agente recebe o **link de login** por email/WhatsApp (feature de onboarding já existente no backend).

## O que já existe (não mexer)
- Setor vem do JWT (`AuthContext.sector`).
- Pós-login `/` redireciona por setor (`routes/index.tsx`): COMPRAS→`/purchases`, TI/Elétrica→`/tickets`.
- Navegação/abas por setor (`BottomNav`) e tema por setor (`SectorThemeSync`).
- Backend `POST /users` (`createLocal`) sem senha → dispara onboarding (link por email/WhatsApp). Verificado E2E nesta sessão.

## Mudanças

### 1. Remover o seletor de setor
- Remover `<SectorSwitcher />` de `routes/_authed/settings.tsx` (uso em `isAdmin || isDev`).
- Deletar `components/SectorSwitcher.tsx`.
- `updateProfile` (genérico) permanece para nome/apelido. Nenhum caminho passa a alterar `sector` no client.

### 2. Cadastro de agente — nova rota `/admin/users/new`
- Segue o padrão `*.new.tsx` (página inteira, mobile-first, `useState` + shadcn, igual `purchases.new.tsx`).
- Campos:
  - **Dados cadastrais:** Nome (obrigatório), Email (obrigatório), Telefone (opcional — WhatsApp).
  - **Cargo (role):** select — `AGENT`, `ADMIN_TI`, `ADMIN_ELECTRIC`, `ADMIN_COMPRAS`, `ADMIN`.
  - **Setor (sector):** select — `TI`, `ELECTRIC`, `COMPRAS`. Independente do cargo.
  - **Sem campo de senha.**
- Submit → `adminService.createUser({ name, email, role, sector, phoneNumber })`.
  - Sucesso → `toast.success("Agente criado — link de login enviado por email/WhatsApp.")`, invalida `["admin","users"]`, navega para `/admin/users`.
  - Erro → `toast.error(msg)` (sem fallback "demo" — criar usuário é operação real).
- Botão **"Novo"** em `routes/_authed/admin/users.tsx` passa a navegar para `/admin/users/new`.

### 3. Ajuste de direcionamento pós-login
- `routes/index.tsx`: para **Elétrica + engenheiro** (`role` ADMIN_ELECTRIC ou ADMIN) → `/engineer` (casa com a aba "Painel" do `BottomNav`). Demais inalterados.

## Fora de escopo (YAGNI)
- Redirect de subdomínio; edição de usuário; nível N1/N2/N3; vínculo cargo↔setor automático.

## Verificação
- `bun run build` (ou typecheck) sem erros.
- Manual: criar agente pelo form → toast de sucesso → usuário aparece na lista → (backend) link de ativação disparado.
- Seletor de setor ausente das configurações.
