# =============================================================================
# Hermes Agent + Helpdesk Integration
# =============================================================================
# Guia de configuração e uso do Hermes Agent como bot WhatsApp humanizado
# =============================================================================

## 🎯 Visão Geral

O Hermes Agent agora está integrado ao projeto e funciona como a interface de bot WhatsApp humanizada. A arquitetura é:

```
WhatsApp → Hermes Agent (Baileys) → Skills → hermes-tools (bridge) → Backend NestJS → PostgreSQL/GLPI
```

### O que mudou?

| Antes | Depois |
|-------|--------|
| `flow-handler.js` com menus numerados | Hermes Agent com conversa natural em português |
| Fluxo rigido: 1, 2, 3, 4... | Conversa fluida e humanizada |
| Respostas pré-definidas | IA generativa com contexto |

---

## 🚀 Como Iniciar

### 1. Configurar variáveis de ambiente

Adicione ao seu `.env`:

```bash
# MiniMax AI (provider principal)
MINIMAX_API_KEY=sua_chave_aqui

# Hermes
HERMES_API_KEY=sua_chave_hermes_aqui
```

### 2. Subir os containers

```bash
# Subir tudo (incluindo Hermes)
docker compose -f docker-compose.dev.yml up -d

# Ou apenas os serviços necessários
docker compose -f docker-compose.dev.yml up -d hermes hermes-tools backend postgres redis
```

### 3. Escanear QR Code (primeira vez)

```bash
# Ver logs do Hermes para ver o QR code
docker logs -f helpdesk_hermes

# Ou acessar diretamente o container
docker exec -it helpdesk_hermes hermes whatsapp
```

### 4. Acessar o Gateway

```bash
# O gateway expõe a API na porta 3004
# Configure seu WhatsApp para enviar mensagens para:
# http://seu-servidor:3004
```

---

## 📋 Endpoints do Hermes Tools Server

O `hermes-tools` expõe tools para o Hermes Agent:

| Endpoint | Método | Descrição |
|----------|--------|----------|
| `/health` | GET | Health check |
| `/api/tools` | GET | Lista todas tools disponíveis |
| `/api/tools/execute` | POST | Executa uma tool |

### Tools Disponíveis

| Tool | Descrição |
|------|----------|
| `create_helpdesk_ticket` | Cria ticket |
| `check_helpdesk_ticket` | Consulta ticket por ID |
| `check_active_ticket` | Verifica ticket ativo por telefone |
| `search_helpdesk_faq` | Busca na base de conhecimento |
| `mark_faq_helpful` | Marca FAQ como útil |
| `check_equipment_availability` | Verifica estoque |
| `create_equipment_reservation` | Cria reserva |
| `notify_agent_escalation` | Escala para agente humano |
| `get_agent_status` | Status dos agentes |

---

## 🗣️ Como Funciona a Conversa

### Fluxo Natural

**Usuário:** "Olá, meu computador está travando muito"

**Hermes:** "Olá! 😊 Sou o Hermes, assistente de suporte técnico. Entendi que seu computador está travando. Para eu abrir o chamado, me conta: onde você está localizado?"

**Usuário:** "Estou na sala 302"

**Hermes:** "Perfeito! E qual é o seu departamento/setor?"

**Usuário:** "RH"

**Hermes:** "Perfeito! Só confirmando as informações:
- Problema: Computador travando
- Local: Sala 302
- Setor: RH

Está correto? (sim/não)"

**Usuário:** "sim"

**Hermes:** "✅ Chamado criado com sucesso!
📄 Protocolo: #1234
🏢 Área: TI

Você pode consultar o status dizendo 'status 1234'"

---

## 🔧 Comandos Úteis

### Ver logs do Hermes
```bash
docker logs -f helpdesk_hermes
```

### Ver logs do Hermes Tools
```bash
docker logs -f helpdesk_hermes_tools
```

### Acessar shell do Hermes
```bash
docker exec -it helpdesk_hermes /bin/bash
```

### Reiniciar Hermes
```bash
docker restart helpdesk_hermes
```

### Verificar status do WhatsApp
```bash
docker exec helpdesk_hermes hermes platforms
```

---

## 📁 Estrutura de Arquivos

```
hermes-integration/
├── config/
│   ├── config.yaml      # Configuração do Hermes
│   └── .env            # Variáveis de ambiente
├── backend-tools/
│   ├── server.js       # Bridge server
│   └── Dockerfile
├── skills/
│   ├── helpdesk-conversation/  # Skill principal
│   └── helpdesk-faq/          # Skill de FAQ
└── setup-hermes.sh     # Script de setup
```

---

## ⚠️ Problemas Comuns

### QR Code não aparece
```bash
# Ver logs completos
docker logs --tail=100 helpdesk_hermes

# Ou verificar se o WhatsApp bridge iniciou
docker exec helpdesk_hermes hermes doctor
```

### Hermes não conecta no backend
```bash
# Verificar se hermes-tools está rodando
curl http://localhost:3003/health

# Verificar logs
docker logs helpdesk_hermes_tools
```

### Mensagens não chegam
```bash
# Verificar se WhatsApp está connected
docker exec helpdesk_hermes hermes platforms status
```

---

## 🔄 Atualizar Skills

Quando atualizar as skills:

```bash
# Copiar skills atualizadas para o volume
docker cp ./hermes-agent/skills/helpdesk-conversation helpdesk_hermes:/opt/data/skills/

# Reiniciar Hermes para carregar
docker restart helpdesk_hermes
```

---

## 📝 Notas de Desenvolvimento

1. **Skills são lidas do volume** `hermes_skills` montado em `/root/.hermes/skills`
2. **Sessão WhatsApp** persiste no volume `hermes_whatsapp_session`
3. **Configuração** fica em `hermes_data` (`/opt/data/config.yaml`)
4. **MiniMax** é usado como provider principal de IA
5. **Fallback** para OpenRouter se MiniMax falhar

---

## 🚀 Deploy em Produção

Para produção, configure:

1. **SSL/TLS** no nginx para HTTPS
2. **Volumes persistentes** para todos os dados
3. **API Keys** em variáveis de ambiente seguras
4. **WhatsApp Business API** (recomendado para produção)
5. **Monitoramento** com logs centralizados

---

## 📞 Suporte

Para dúvidas ou problemas:
- Verificar logs: `docker logs helpdesk_hermes`
- Health check: `curl http://localhost:3003/health`
- Doctor: `docker exec helpdesk_hermes hermes doctor`
