# 🤖 Sistema de IA - Intent Detection

## Visão Geral

O sistema de classificação de intenções utiliza **modelos de linguagem (LLMs)** para entender automaticamente o que os usuários querem quando enviam mensagens ao helpdesk.

### Arquitetura Multi-Provider

O sistema implementa uma **arquitetura de fallback em cascata** para garantir alta disponibilidade:

```
Usuário → [1º] Ollama (Local) → [2º] GLM-4 (Cloud) → [3º] MiniMax (Cloud)
```

## Provedores Suportados

### 1. **Ollama (Recomendado - Local)** ⭐

**Vantagens:**
- ✅ **Grátis** e **privado**
- ✅ Baixa latência (~500ms)
- ✅ Sem limites de requisições
- ✅ Funciona offline

**Instalação:**

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
brew install ollama

# Windows
# Baixar de: https://ollama.com/download
```

**Iniciar Ollama:**

```bash
ollama serve
```

**Baixar modelos:**

```bash
# Qwen 2.5 (Recomendado - melhor custo/benefício)
ollama pull qwen2.5:3b

# Alternativas:
ollama pull llama3.2:3b     # Meta Llama
ollama pull chatglm3:6b     # ChatGLM (chinês)
ollama pull mistral:7b      # Mistral
```

**Configuração (.env):**

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
```

---

### 2. **GLM-4 (Zhipu AI - Fallback Cloud)** 🌟

**Vantagens:**
- ✅ **Muito barato** (~$0.001/1k tokens)
- ✅ Excelente precisão (melhor que GPT-3.5)
- ✅ Baixa latência (~1-2s)
- ✅ Generoso rate limit
- ✅ Suporte nativo a JSON
- ✅ Excelente em português e chinês

**Como obter API Key:**

1. Acesse: https://open.bigmodel.cn/
2. Crie uma conta (aceita email internacional)
3. Vá em "API Keys" e gere uma chave
4. Adicione créditos (aceita cartão internacional)

**Modelos disponíveis:**

| Modelo | Velocidade | Precisão | Custo/1k tokens | Uso |
|--------|------------|----------|-----------------|-----|
| `glm-4-flash` | ⚡⚡⚡ | ⭐⭐⭐ | $0.001 | **Recomendado para produção** |
| `glm-4` | ⚡⚡ | ⭐⭐⭐⭐ | $0.01 | Tarefas complexas |
| `glm-4-plus` | ⚡ | ⭐⭐⭐⭐⭐ | $0.05 | Máxima precisão |

**Configuração (.env):**

```env
GLM_API_KEY=sua_api_key_aqui
```

**Exemplo de uso:**

```bash
# Testar GLM-4
cd backend
npm run test:glm

# Ou diretamente:
npx ts-node test-glm.ts
```

---

### 3. **MiniMax (DEPRECATED)** ⚠️

> ⚠️ **Nota:** MiniMax foi marcado como deprecated. Recomendamos migrar para GLM-4.

**Por que não recomendamos:**
- ❌ Mais caro que GLM-4 (~3x)
- ❌ API instável (mudanças frequentes de formato)
- ❌ Rate limits baixos
- ❌ Documentação confusa

**Se ainda quiser usar:**

```env
MINIMAX_API_KEY=sua_api_key_aqui
```

## Fluxo de Funcionamento

### 1. Classificação de Intenção

```typescript
// Mensagem do usuário
"Minha impressora não está imprimindo"

// Sistema classifica como:
{
  "intent": "abrir_ticket_ti",
  "confidence": 0.95,
  "entities": {
    "equipamento": "impressora",
    "problema": "não imprime"
  }
}
```

### 2. Intenções Suportadas

| Intent | Descrição | Exemplos |
|--------|-----------|----------|
| `abrir_ticket_ti` | Problemas de TI | "PC travado", "Internet lenta", "Impressora com erro" |
| `abrir_ticket_eletrica` | Problemas elétricos | "Ar condicionado vazando", "Tomada não funciona" |
| `reservar_equipamento` | Reserva de equipamentos | "Preciso de um projetor", "Reservar notebook" |
| `consultar_faq` | Dúvidas genéricas | "Como fazer backup?", "O que é VPN?" |
| `consultar_ticket` | Status de chamados | "Qual o status do meu ticket?" |
| `falar_tecnico` | Atendimento humano | "Quero falar com alguém", "Preciso de ajuda" |
| `avaliar_atendimento` | Feedback | "Avaliar atendimento", "Dar nota" |
| `saudacao` | Cumprimentos | "Oi", "Bom dia", "Olá" |
| `outro` | Não classificado | Mensagens ambíguas |

### 3. Lógica de Fallback

```
1. Tenta Ollama (se disponível)
   ↓ (erro)
2. Tenta GLM-4 (se API key configurada)
   ↓ (erro)
3. Tenta MiniMax (se API key configurada)
   ↓ (erro)
4. Retorna intent='outro' confidence=0
```

## Performance e Custos

### Comparação de Provedores

| Métrica | Ollama (local) | GLM-4-Flash | MiniMax |
|---------|----------------|-------------|---------|
| **Latência média** | ~500ms | ~1.2s | ~2.5s |
| **Custo por 1k msgs** | $0 | ~$0.15 | ~$0.45 |
| **Custo por 10k msgs/mês** | $0 | ~$1.50 | ~$4.50 |
| **Taxa de acerto** | ~88% | ~94% | ~90% |
| **Limite de requisições** | Ilimitado | 1000/min | 100/min |

### Estimativa de Uso

**Cenário: 500 mensagens/dia (15k/mês)**

| Configuração | Custo Mensal | Latência Média |
|--------------|--------------|----------------|
| Apenas Ollama | $0 | 500ms |
| Ollama + GLM-4 fallback | ~$0.50 | 600ms |
| Apenas GLM-4 | ~$2.25 | 1.2s |

## Monitoramento

### Logs do Sistema

```bash
# Ver logs em tempo real
docker logs -f backend

# Buscar por classificações de IA
docker logs backend | grep "Intent"
```

### Métricas no Banco

```sql
-- Total de classificações
SELECT COUNT(*) FROM "IntentClassification";

-- Distribuição por provider
SELECT provider, COUNT(*) as total
FROM "IntentClassification"
GROUP BY provider;

-- Taxa de confiança média
SELECT AVG(confidence) as avg_confidence
FROM "IntentClassification";

-- Tempo médio de processamento
SELECT provider, AVG("processingTime") as avg_time_ms
FROM "IntentClassification"
GROUP BY provider;
```

## Troubleshooting

### Ollama não conecta

```bash
# Verificar se está rodando
curl http://localhost:11434/api/tags

# Iniciar Ollama
ollama serve

# Verificar modelos instalados
ollama list
```

### GLM-4 retorna erro 401

```bash
# Verificar se API key está correta
grep GLM_API_KEY backend/.env

# Testar manualmente
npx ts-node backend/test-glm.ts
```

### Classificação sempre retorna "outro"

1. Verificar se algum provider está configurado
2. Verificar logs do backend para erros
3. Testar providers manualmente:

```bash
# Testar Ollama
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:3b",
  "prompt": "Diga olá",
  "stream": false
}'

# Testar GLM-4
npx ts-node backend/test-glm.ts
```

## Recomendações de Produção

### Setup Ideal

```env
# Produção recomendada
OLLAMA_URL=http://ollama:11434  # Container Ollama
OLLAMA_MODEL=qwen2.5:7b          # Modelo maior para prod
GLM_API_KEY=sua_key_aqui         # Fallback cloud
```

### Docker Compose com Ollama

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: helpdesk_ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_models:/root/.ollama
    restart: unless-stopped

  backend:
    # ...
    environment:
      - OLLAMA_URL=http://ollama:11434
      - OLLAMA_MODEL=qwen2.5:7b
      - GLM_API_KEY=${GLM_API_KEY}
    depends_on:
      - ollama
```

### Inicialização do Ollama no Container

```bash
# Entrar no container
docker exec -it helpdesk_ollama bash

# Baixar modelo
ollama pull qwen2.5:7b

# Verificar
ollama list
```

## Próximos Passos

- [ ] Implementar cache Redis para respostas repetidas
- [ ] Adicionar fine-tuning com dados históricos
- [ ] Implementar modelo de ensemble (votação entre providers)
- [ ] Adicionar detecção de sentimento
- [ ] Implementar extração de entidades mais avançada

## Referências

- [Ollama Docs](https://github.com/ollama/ollama)
- [GLM-4 API Docs](https://open.bigmodel.cn/dev/api)
- [Qwen Models](https://qwenlm.github.io/)
