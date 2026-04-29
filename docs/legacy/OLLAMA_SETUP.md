# 🤖 Ollama Setup - Intent Detection Local

Este guia mostra como configurar o **Ollama** para rodar modelos de IA localmente (GLM, Qwen, Llama) para classificação de intenções.

## Por que Ollama?

- ✅ **Gratuito** - Sem custos de API
- ✅ **Privacidade** - Dados não saem do servidor
- ✅ **Rápido** - Modelos leves (3B-7B params)
- ✅ **Simples** - Instalação em 1 comando
- ✅ **Multi-modelo** - Suporta GLM, Qwen, Llama, Mistral, etc.

---

## 1. Instalação do Ollama

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### macOS
```bash
brew install ollama
```

### Windows
Baixe o instalador em: https://ollama.com/download/windows

---

## 2. Iniciar Ollama

```bash
ollama serve
```

> 💡 Ollama roda por padrão em `http://localhost:11434`

---

## 3. Instalar Modelo de IA

Escolha um dos modelos recomendados:

### Opção 1: Qwen 2.5 (3B) - **RECOMENDADO**
```bash
ollama pull qwen2.5:3b
```
- **Tamanho**: ~2GB
- **RAM**: ~4GB
- **Velocidade**: Muito rápida
- **Qualidade**: Excelente para português

### Opção 2: ChatGLM3 (6B)
```bash
ollama pull chatglm3:6b
```
- **Tamanho**: ~3.7GB
- **RAM**: ~8GB
- **Velocidade**: Rápida
- **Qualidade**: Boa para chinês e português

### Opção 3: Llama 3.2 (3B)
```bash
ollama pull llama3.2:3b
```
- **Tamanho**: ~2GB
- **RAM**: ~4GB
- **Velocidade**: Muito rápida
- **Qualidade**: Excelente para inglês, boa para português

### Opção 4: Gemma 2 (2B) - Mais leve
```bash
ollama pull gemma2:2b
```
- **Tamanho**: ~1.6GB
- **RAM**: ~3GB
- **Velocidade**: Extremamente rápida
- **Qualidade**: Boa

---

## 4. Testar Modelo

```bash
ollama run qwen2.5:3b

>>> Olá! Como você está?
Olá! Estou bem, obrigado por perguntar. Como posso ajudá-lo hoje?

>>> /bye
```

---

## 5. Configurar no Backend

Edite o arquivo `.env` do backend:

```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

# Ou use outro modelo:
# OLLAMA_MODEL=chatglm3:6b
# OLLAMA_MODEL=llama3.2:3b
# OLLAMA_MODEL=gemma2:2b
```

---

## 6. Verificar Status

Inicie o backend e veja os logs:

```bash
cd backend
npm run start:dev
```

**Logs esperados:**
```
✅ Ollama disponível em http://localhost:11434
📦 Modelos instalados: qwen2.5:3b, llama3.2:3b
```

---

## 7. Testar Intent Detection

### Via API:

```bash
curl -X POST http://localhost:3000/api/intent/classify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "userMessage": "A impressora da sala 10 não está funcionando"
  }'
```

**Response:**
```json
{
  "intent": "abrir_ticket_ti",
  "confidence": 0.95,
  "entities": {
    "equipamento": "impressora",
    "local": "sala 10",
    "problema": "não funciona"
  },
  "processingTime": 850
}
```

### Via Endpoint de Status:

```bash
curl http://localhost:3000/api/intent/status \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Response:**
```json
{
  "enabled": true,
  "provider": "ollama",
  "url": "http://localhost:11434",
  "model": "qwen2.5:3b"
}
```

---

## 8. Comandos Úteis

### Listar modelos instalados
```bash
ollama list
```

### Remover modelo
```bash
ollama rm qwen2.5:3b
```

### Ver logs do Ollama
```bash
journalctl -u ollama -f  # Linux
```

### Parar Ollama
```bash
pkill ollama
```

### Rodar Ollama em background (Linux)
```bash
nohup ollama serve > /dev/null 2>&1 &
```

---

## 9. Troubleshooting

### ❌ "Ollama não disponível"

**Problema**: Backend não consegue conectar ao Ollama

**Solução**:
```bash
# 1. Verificar se Ollama está rodando
curl http://localhost:11434/api/tags

# 2. Se não estiver, inicie:
ollama serve
```

---

### ❌ "Modelo não encontrado"

**Problema**: Modelo configurado não está instalado

**Solução**:
```bash
# Instalar o modelo
ollama pull qwen2.5:3b

# Verificar instalação
ollama list
```

---

### ❌ Resposta lenta

**Problema**: Classificação demora muito

**Soluções**:
1. **Use modelo menor**: `gemma2:2b` ao invés de `chatglm3:6b`
2. **Aumente RAM**: Feche outros programas
3. **Use GPU**: Configure Ollama para usar GPU (NVIDIA/AMD)

```bash
# Verificar se GPU está sendo usada
nvidia-smi  # NVIDIA
rocm-smi    # AMD
```

---

### ❌ "JSON inválido"

**Problema**: Modelo retorna texto ao invés de JSON

**Solução**: Alguns modelos pequenos podem ter dificuldade. Tente:
1. Usar modelo maior (qwen2.5:7b)
2. Ajustar temperatura (já está em 0.3)
3. Verificar logs do backend para ver resposta completa

---

## 10. Comparação de Modelos

| Modelo | Tamanho | RAM | Velocidade | Português | Recomendado |
|--------|---------|-----|------------|-----------|-------------|
| **qwen2.5:3b** | 2GB | 4GB | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | ✅ Sim |
| chatglm3:6b | 3.7GB | 8GB | ⚡⚡ | ⭐⭐⭐⭐ | ✅ Sim |
| llama3.2:3b | 2GB | 4GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | ⭐ OK |
| gemma2:2b | 1.6GB | 3GB | ⚡⚡⚡⚡ | ⭐⭐⭐ | ⭐ Emergência |
| mistral:7b | 4.1GB | 8GB | ⚡⚡ | ⭐⭐⭐⭐ | ⭐ Avançado |

---

## 11. Performance Esperada

Com **Qwen 2.5 (3B)** em hardware moderno:

- **Tempo de resposta**: 500ms - 2s
- **Acurácia**: ~90-95% em português
- **RAM usada**: ~3.5GB
- **CPU**: ~60% durante inferência
- **Throughput**: ~10 classificações/minuto

---

## 12. Ollama em Produção

### Systemd Service (Linux)

Criar arquivo `/etc/systemd/system/ollama.service`:

```ini
[Unit]
Description=Ollama Server
After=network.target

[Service]
Type=simple
User=ollama
Group=ollama
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama
```

### Docker

```dockerfile
FROM ollama/ollama:latest

# Download modelo durante build
RUN ollama pull qwen2.5:3b

EXPOSE 11434

CMD ["serve"]
```

```bash
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama-data:/root/.ollama \
  ollama/ollama
```

---

## 13. Alternativas ao Ollama

Se Ollama não funcionar, você pode usar:

### LM Studio
- https://lmstudio.ai/
- Interface gráfica
- Suporta mesmos modelos

### Jan.ai
- https://jan.ai/
- Open source
- Interface amigável

### LocalAI
- https://localai.io/
- API compatível com OpenAI
- Roda em Docker

---

## 14. Links Úteis

- **Ollama Docs**: https://ollama.com/docs
- **Modelos disponíveis**: https://ollama.com/library
- **GitHub**: https://github.com/ollama/ollama
- **Discord**: https://discord.gg/ollama

---

## 15. FAQ

**P: Posso rodar sem GPU?**
R: Sim! Modelos pequenos (2B-3B) rodam bem em CPU.

**P: Quanto de RAM preciso?**
R: Mínimo 4GB para modelos de 3B, recomendado 8GB.

**P: Funciona no Windows?**
R: Sim, Ollama tem versão nativa para Windows.

**P: Posso usar vários modelos?**
R: Sim, instale vários e troque via `OLLAMA_MODEL` no `.env`.

**P: É seguro?**
R: Sim, tudo roda localmente, nenhum dado sai do seu servidor.

**P: Quanto custa?**
R: **Gratuito!** Apenas o custo de hardware (servidor).

---

**Autor**: Claude (Anthropic)
**Data**: 2026-03-02
**Versão**: 1.0
