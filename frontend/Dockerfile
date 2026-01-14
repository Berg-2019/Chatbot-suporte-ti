# Frontend Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar deps
RUN npm ci

# Copiar código
COPY . .

# Build
RUN npm run build

# Produção
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiar build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
