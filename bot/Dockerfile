# Bot Dockerfile
FROM node:22-alpine

WORKDIR /app

# Dependências do sistema
RUN apk add --no-cache python3 make g++

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código
COPY . .

# Criar diretórios
RUN mkdir -p /app/sessions /app/logs

EXPOSE 3002

CMD ["node", "src/index.js"]
