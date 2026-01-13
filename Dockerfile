# Helpdesk Backend
FROM node:22-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++ git sqlite

# Copiar package.json
COPY backend/package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Criar diretórios necessários
RUN mkdir -p /app/data /app/auth_info_baileys /app/temp

# Porta
EXPOSE 3003

# Comando de inicialização
CMD ["npm", "run", "dev"]
