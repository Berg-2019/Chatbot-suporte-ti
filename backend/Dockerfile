# Backend Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte (inclui prisma/)
COPY . .

# Gerar Prisma Client DEPOIS de copiar tudo
RUN npx prisma generate

# Build
RUN npm run build

# Produção
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiar arquivos necessários
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Criar diretório de logs
RUN mkdir -p /app/logs

EXPOSE 3000

# Migrar banco e iniciar
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
