# Frontend Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Argumento de build para URL da API (Next.js precisa em tempo de build)
ARG NEXT_PUBLIC_API_URL=https://bk.shautomacao.com.br
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copiar package.json
COPY package*.json ./

# Instalar deps
RUN npm ci

# Copiar código
COPY . .

# Configurar output standalone
RUN echo 'module.exports = { output: "standalone" }' > next.config.ts || true

# Build
RUN npm run build

# Produção
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Argumento de runtime
ARG NEXT_PUBLIC_API_URL=https://bk.shautomacao.com.br
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copiar build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
