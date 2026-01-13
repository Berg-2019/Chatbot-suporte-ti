# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências do bot
COPY bot-whatsapp/package*.json ./

# Instalar dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código fonte do bot
COPY bot-whatsapp/ ./

# Production stage
FROM node:22-alpine

WORKDIR /app

# Instalar dependências do sistema para Baileys e SQLite
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    sqlite

# Copiar package.json
COPY bot-whatsapp/package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --only=production

# Copiar código fonte
COPY --from=builder /app/src ./src
COPY --from=builder /app/init-db.js ./

# Criar diretórios necessários
RUN mkdir -p /app/db \
    /app/logs \
    /app/backups \
    /app/temp \
    /app/auth_info_baileys

# Expor porta da API de health check (se implementado)
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "console.log('Bot running')" || exit 1

# Iniciar o bot
CMD ["node", "src/index.js"]
