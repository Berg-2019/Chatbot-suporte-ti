# 📚 Documentação do Projeto

Este diretório contém a documentação do sistema Helpdesk MSM.

## 📁 Estrutura

```
docs/
├── README.md                          # Este arquivo - índice geral
├── FRONTEND_BACKEND_AUDIT.md          # Auditoria frontend↔backend (2026-05-10)
├── LGPD_COMPLIANCE_AUDIT.md           # Auditoria LGPD — conformidade
├── INCIDENT_RESPONSE.md               # Plano de resposta a incidentes
├── CHAT_SCREEN_SPEC.md                # Spec da tela de chat
├── CHAT_FIX_HANDOFF.md                # Handoff de bugs do chat
├── CHAT_IMPLEMENTATION_FOR_MINIMAX.md # Integração chat WhatsApp-style
├── agents.md                          # Documentação do Hermes Agent (legacy)
├── playbook.md                        # Playbook de operações (legacy)
├── skill.md                           # Skills do Hermes (legacy)
│
└── legacy/                            # Documentação obsoleta (histórico)
    ├── FEATURE_ABSORPTION_PLAN.md     # Plano antigo de features
    ├── PHASE2_PROGRESS.md             # Progresso Fase 2
    ├── PHASE3_PROGRESS.md             # Progresso Fase 3
    ├── PHASE4_COMPLETE.md             # Conclusão Fase 4
    ├── PHASE5_COMPLETE.md             # Conclusão Fase 5
    ├── CAPTAIN_AI.md                  # Captain AI (deletado)
    ├── SISTEMA-IA-RESUMO.md           # Sistema IA (deletado)
    └── ...                            # Outros docs antigos
```

## 📖 Guias Principais

| Guia | Descrição | Quando Usar |
|------|-----------|--------------|
| [`../CLAUDE.md`](../CLAUDE.md) | Instruções para Claude Code | Ao desenvolver |
| [`../README.md`](../README.md) | Visão geral do projeto | Primeira vez |
| [`../IMPLEMENTATION_PLAN_V3.md`](../IMPLEMENTATION_PLAN_V3.md) | Plano de implementação vigente | Planejamento |
| [`../IMPLEMENTATION_CHECKLIST.md`](../IMPLEMENTATION_CHECKLIST.md) | Estado operacional atual | Ver progresso |
| [`../INTEGRATION_PLAN_LOVABLE.md`](../INTEGRATION_PLAN_LOVABLE.md) | Plano integração frontend | Frontend work |

## 🔍 Auditorias

| Auditoria | Descrição | Data |
|-----------|-----------|------|
| [`FRONTEND_BACKEND_AUDIT.md`](FRONTEND_BACKEND_AUDIT.md) | Cross-reference endpoints frontend↔backend | 2026-05-10 |
| [`LGPD_COMPLIANCE_AUDIT.md`](LGPD_COMPLIANCE_AUDIT.md) | Conformidade LGPD (C1–C7 ✅, A1–A9 pendente) | 2026-05-05 |
| [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md) | Plano resposta a incidentes (ANPD 72h) | 2026-05-05 |

## 🔧 Guias Técnicos

| Guia | Descrição | Onde Está |
|------|-----------|-----------|
| Integração Hermes | Setup do Hermes Agent | [`../hermes-integration/README.md`](../hermes-integration/README.md) |
| Guards de Autorização | JwtAuthGuard, SectorGuard, RolesGuard | [`../backend/GUARDS_USAGE_GUIDE.md`](../backend/GUARDS_USAGE_GUIDE.md) |
| E2E Tests | Playwright suite | [`../backend/e2e/README.md`](../backend/e2e/README.md) |
| Docker | Como subir os serviços | [`../docker-compose.dev.yml`](../docker-compose.dev.yml) |

## 🤖 Para IAs (Claude, etc.)

Este projeto tem um documento especial [`../CLAUDE.md`](../CLAUDE.md) com instruções específicas
para agentes de IA. **Sempre leia o CLAUDE.md antes de fazer qualquer alteração.**

## 📝 Criar Novos Docs

Ao criar documentação nova:

1. Coloque neste diretório (`docs/`)
2. Se for obsoleto, coloque em `docs/legacy/`
3. Atualize este README.md se necessário
4. Nomeie descritivamente: `NOME_DESCRITIVO.md`

## 🗑️ Arquivos Legados

A pasta `legacy/` contém documentação de implementações passadas que foram
substituídas pelo sistema atual. Muitas referem-se a funcionalidades que
**foram removidas** (Captain AI, adaptive learning, MiniMax embeddings, GLPI).
Mantemos para referência histórica apenas.
