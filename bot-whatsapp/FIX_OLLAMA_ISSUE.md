# 🛠️ Como Corrigir o Erro da API Ollama no Bot WhatsApp

## 📋 Problema Identificado

O erro `Ollama API error: 404` indica que o serviço Ollama não está acessível na URL configurada (`http://localhost:11434`). Isso pode ocorrer por vários motivos:

1. Ollama não está instalado
2. Ollama não está em execução
3. O modelo necessário não está baixado
4. Problemas de configuração

## 🔧 Solução Passo a Passo

### 1. **Verificar se Ollama está instalado**

```bash
ollama --version
```

Se não estiver instalado, siga as instruções abaixo.

### 2. **Instalar Ollama (se necessário)**

#### **Windows:**
1. Acesse https://ollama.ai/download/OllamaSetup.exe
2. Baixe e execute o instalador
3. Siga as instruções do instalador

#### **Linux/Mac:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 3. **Iniciar o Serviço Ollama**

O serviço deve iniciar automaticamente após a instalação. Se não iniciar:

```bash
ollama serve
```

### 4. **Baixar o Modelo Necessário**

```bash
ollama pull llama3.2:3b
```

Este é o modelo recomendado para o bot. Se tiver problemas com este modelo, pode usar:

```bash
ollama pull llama3.2:1b  # Versão mais leve
```

### 5. **Verificar Instalação**

```bash
# Listar modelos disponíveis
ollama list

# Testar conexão
curl http://localhost:11434/api/tags
```

### 6. **Configurar Variáveis de Ambiente**

Certifique-se de que o arquivo `.env` existe na pasta `bot-whatsapp` com o conteúdo:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

## 🚀 Script de Instalação Automática

O projeto inclui um script que pode ajudar a configurar o Ollama automaticamente:

```bash
cd bot-whatsapp
npm run install-ollama
```

## 🔍 Troubleshooting

### **Se o erro persistir:**

1. **Verificar se a porta 11434 está em uso:**
   ```bash
   netstat -an | grep 11434  # Linux/Mac
   netstat -an | findstr 11434  # Windows
   ```

2. **Reiniciar o serviço Ollama:**
   ```bash
   # Windows: Reiniciar o serviço no Gerenciador de Tarefas
   # Linux:
   sudo systemctl restart ollama
   ```

3. **Verificar logs do Ollama:**
   ```bash
   # Linux:
   sudo journalctl -u ollama -f
   ```

4. **Testar modelo diretamente:**
   ```bash
   curl http://localhost:11434/api/generate -d '{
     "model": "llama3.2:3b",
     "prompt": "Hello",
     "stream": false
   }'
   ```

### **Se o modelo não for encontrado:**

```bash
# Listar modelos disponíveis
ollama list

# Baixar modelo novamente
ollama pull llama3.2:3b

# Verificar se o modelo está corretamente instalado
ollama show llama3.2:3b
```

## 🔄 Modo Fallback

O bot foi atualizado com um sistema de fallback que permite funcionar mesmo sem Ollama:

1. Se Ollama não estiver disponível, o bot continuará funcionando
2. As funcionalidades básicas permanecem ativas
3. A classificação automática de mensagens será desativada
4. As OS serão criadas automaticamente para todas as mensagens

## 🎯 Comandos de Controle da IA

Administradores podem controlar a IA via WhatsApp:

- `!iaon` - Ativar IA Ollama
- `!iaoff` - Desativar IA Ollama
- `!iastatus` - Ver status da IA

## 📊 Verificação do Status

Para verificar se tudo está funcionando corretamente:

1. **Verificar conexão com Ollama:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Verificar status no bot:**
   - Use o comando `!iastatus` no WhatsApp
   - Verifique os logs do bot

3. **Testar funcionalidade:**
   - Envie uma mensagem para o bot
   - Verifique se a resposta é gerada pela IA ou pelo modo fallback

## 🛡️ Segurança

O Ollama roda localmente, então:
- Todos os dados permanecem no seu servidor
- Nenhuma informação é enviada para terceiros
- O modelo é executado inteiramente offline

## 📞 Suporte

Se continuar com problemas:

1. Verifique os logs do bot: `bot-whatsapp/logs/`
2. Verifique os logs do sistema: `sudo journalctl -u ollama`
3. Reinicie o bot: `npm start`
4. Reinicie o serviço Ollama: `ollama serve`

---

**✅ Com estas correções, o erro da API Ollama deve ser resolvido e o bot funcionará corretamente!**
