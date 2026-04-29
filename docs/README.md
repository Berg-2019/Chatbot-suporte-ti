# 📚 Documentação do Projeto

Este diretório contém a documentação do sistema Helpdesk MSM.

## 📁 Estrutura

```
docs/
├── README.md           # Este arquivo - índice geral
├── agents.md          # Documentação do Hermes Agent (legacy)
├── playbook.md       # Playbook de operações (legacy)
├── skill.md          # Skills do Hermes (legacy)
│
└── legacy/           # Documentação obsoleta (histórico)
    ├── FEATURE_ABSORPTION_PLAN.md    # Plano antigo de features
    ├── PHASE2_PROGRESS.md            # Progresso Fase 2
    ├── PHASE3_PROGRESS.md            # Progresso Fase 3
    ├── PHASE4_COMPLETE.md            # Conclusão Fase 4
    ├── PHASE5_COMPLETE.md            # Conclusão Fase 5
    └── ...                           # Outros docs antigos
```

## 📖 Guias Principais

| Guia | Descrição | Quando Usar |
|------|-----------|--------------|
| `../CLAUDE.md` | Instruções para Claude Code | Ao desenvolver |
| `../README.md` | Visão geral do projeto | Primeira vez |
| `../IMPLEMENTATION_PLAN_V2.md` | Plano de implementação | Planejamento |
| `./README.md` | Este índice | Navegação |

## 🔧 Guias Técnicos

| Guia | Descrição | Onde Está |
|------|-----------|-----------|
| Integração Hermes | Setup do Hermes Agent | `../hermes-integration/README.md` |
| Skill Conversa | Como funciona a conversa natural | `../hermes-integration/skills/helpdesk-conversation/SKILL.md` |
| Docker | Como subir os serviços | `../docker-compose.dev.yml` |

## 🤖 Para IAs (Claude, etc.)

Este projeto tem um documento especial `../CLAUDE.md` com instruções específicas
para agentes de IA. **Sempre leia o CLAUDE.md antes de fazer qualquer alteração.**

## 📝 Criar Novos Docs

Ao criar documentação nova:

1. Coloque neste diretório (`docs/`)
2. Se for obsoleto, coloque em `docs/legacy/`
3. Atualize este README.md se necessário
4. Nomeie descritivamente: `NOMBRE_DESCRITIVO.md`

## 🗑️ Arquivos Legados

A pasta `legacy/` contém documentação de implementações passadas que foram
substituídas pelo sistema atual. Mantemos para referência histórica.

Se precisar de contexto sobre decisões antigas, consulte-os lá.
