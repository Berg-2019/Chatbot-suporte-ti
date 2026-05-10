# Plano de Resposta a Incidentes — Helpdesk MSM

> **LGPD Art. 48:** O controlador deve comunicar à ANPD e aos titulares a ocorrência de incidente de segurança que possa gerar risco ou dano relevante aos titulares, no prazo máximo de **72 horas** contadas da ciência do incidente.
>
> **Última atualização:** 2026-05-05

---

## 🎯 Quando acionar este plano

Acionar quando houver:

- Acesso não autorizado a dados pessoais (banco de dados, arquivos, backups)
- Vazamento de dados pessoais (publicação acidental, perda de dispositivo)
- Roubo ou interceptação de credenciais (JWT, senhas, chaves de API)
- Infecção por malware com potencial acesso a dados (ransomware, trojan, backdoor)
- Qualquer incidente de segurança que afete a **confidencialidade**, **integridade** ou **disponibilidade** de dados pessoais tratados pelo sistema

---

## 📋 Fluxo de Resposta

### Fase 1 — Detecção (0-4h)

**Responsável:** Qualquer membro da equipe técnica

1. **Identificar** o incidente (quem reportou? como foi descoberto?)
2. **Documentar** horário de descoberta, sistemas afetados, estimativa de escopo
3. **Notificar** imediatamente o responsável de segurança / tech lead via canal prioritário (ex: WhatsApp/Signal, não email)
4. **Preservar** evidências:截图 de logs, dumps de banco, backups antes de qualquer mudança

**Canais de notificação:**
- Tech lead: `<TEAM_LEAD_CONTATO>`
- DPO: `<DPO_CONTATO>`
- ANPD: https://www.gov.br/anpd/pt-br/canais-de-atendimento

---

### Fase 2 — Contenção (4-24h)

**Responsável:** Tech lead + equipe de infraestrutura

1. **Isolar** sistemas afetados:
   ```bash
   # Exemplo: derrubar container do banco temporariamente
   docker stop helpdesk_postgres

   # Exemplo: revogar chaves de API comprometidas
   # Revereter no dashboard do provedor
   ```

2. **Preservar** logs e state do sistema no momento do incidente
   ```bash
   # Backup do banco no estado atual (antes de qualquer correção)
   docker exec helpdesk_postgres pg_dump -U postgres helpdesk > incident_backup_$(date +%Y%m%d_%H%M%S).sql

   # Copiar logs de acesso
   cp /var/log/nginx/access.log /root/incident_logs/
   docker logs helpdesk_backend > /root/incident_logs/backend_$(date +%Y%m%d).log
   ```

3. **Identificar** a causa raiz:
   - Qual vetor de ataque? (credenciais vazadas? exploit? insider?)
   - Quais dados foram afetados? (nomes, emails, mensagens, anexos?)
   - Quantos titulares foram impactados? (estimativa inicial)
   - O incidente ainda está em andamento?

4. **Mitigar** vetor de ataque:
   - Reset de senhas comprometidas
   - Revogação de tokens/JWT
   - Bloqueio de IPs maliciosos via firewall
   - Patch de vulnerabilidade explorada

---

### Fase 3 — Notificação à ANPD (até 72h da ciência)

**Responsável:** DPO / Tech lead (com apoio jurídico se disponível)

A notificação deve conter no mínimo:

1. **Descrição** do incidente (o que aconteceu)
2. **Data/hora** da ocorrência e da descoberta
3. **Dados afetados** (categorias: nome, email, telefone, mensagens, etc.)
4. **Número aproximado** de titulares impactados
5. **Medidas** adotadas ou planejadas para mitigar o dano
6. **Contato** do DPO responsável

**Via:** Formulário online da ANPD: https://www.gov.br/anpd/pt-br/canais-de-atendimento

**Cópia:** Manter registro de toda comunicação com ANPD.

---

### Fase 4 — Comunicação aos Titulares (até 72h da ciência)

**Responsável:** DPO + equipe de comunicação

Para cada titular impactado, comunicar por canal direto (email, WhatsApp):

```
Assunto: [Helpdesk MSM] Comunicação sobre incidente de segurança

Prezado(a) [nome ou email],

Identificamos um incidente de segurança em nossos sistemas em [DATA]
que pode ter envolvido seus dados pessoais.

[DESCRIÇÃO SIMPLES DO INCIDENTE — sem tecniquês excessivos]

Os dados potencialmente acessados foram: [LISTAR CATEGORIAS]
Não temos evidência de uso indevido desses dados.

Ações que tomamos: [DESCREVER MEDIDAS DE CONTENÇÃO]
Ações que você pode tomar: [EX: alterar senha, monitorar crédito, etc.]

Estamos à disposição para esclarecer dúvidas.
[AUTOR/DPO] — [CONTATO]
```

---

### Fase 5 — Erradicação e Recuperação (24-72h)

**Responsável:** Tech lead

1. **Corrigir** a vulnerabilidade que permitiu o incidente
2. **Verificar** que a contenção foi eficaz (monitorar por 48h)
3. **Restaurar** sistemas de forma segura (não restaurar de backups comprometidos)
4. **Resetar** todas as credenciais que estavam em uso no momento do incidente
5. **Auditar** logs de acesso do período do incidente para confirmar escopo

---

### Fase 6 — Pós-incidente (7-30 dias)

**Responsável:** Tech lead + DPO

1. **Relatório final** documentando:
   - Timeline completa (descoberta → contenção → notificação → resolução)
   - Causa raiz confirmada
   - Número final de titulares impactados
   - Dados específicos comprometidos
   - Ações corretivas implementadas

2. **Análise retrospectiva** (post-mortem):
   - O que funcionou bem?
   - O que poderia ser melhorado no processo?
   - Quais controles adicionais são necessários?

3. **Plano de ação** com prazos para melhorias identificadas

4. **Atualizar** este documento comlessons learned

---

## 📊 Classificação de Severidade

| Nível | Impacto | Exemplo | Prazo ANPD |
|-------|---------|---------|------------|
| **Crítico** | Dados sensíveis (saúde, biometria,财务) ou >1000 titulares | Ransomware com banco completo | 24h |
| **Alto** | Dados pessoais comuns, 100-1000 titulares | Acesso não autorizado a mensagens | 72h |
| **Médio** | Dados pessoais limitados, <100 titulares | Laptop perdido com logs | 72h (avaliar) |
| **Baixo** | Sem dados pessoais (ex: apenas logs de sistema) | DDoS sem vazamento | Não requer notificação |

---

## 🆘 Contatos de Emergência

| Função | Contato |
|--------|---------|
| Tech Lead | `<TEAM_LEAD_PHONE>` |
| DPO | `<DPO_EMAIL>` |
| ANPD | https://www.gov.br/anpd/pt-br/canais-de-atendimento |
| Advogado (LGPD) | `<LEGAL_CONTACT>` |

---

## ⚡ Checklist de Resposta Imediata

- [ ] Incidente documentado (data, hora, descrição inicial)
- [ ] Tech lead / DPO notificado
- [ ] Evidências preservadas (logs, dumps, capturas)
- [ ] Sistemas afetados isolados
- [ ] Credenciais comprometidas revogadas
- [ ] Avaliação inicial de severidade
- [ ] Comunicação a ANPD iniciada (se aplicável)
- [ ] Comunicação a titulares iniciada (se aplicável)
- [ ] Canal de suporte aos afetados ativado

---

## 📝 Log de Incidentes

| Data | Descrição | Severidade | Status | Notificado ANPD |
|------|-----------|------------|--------|----------------|
| | | | | |
