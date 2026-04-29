# Hermes Helpdesk Tools Server
# Dockerfile para o servidor bridge entre Hermes Agent e Backend NestJS

FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

EXPOSE 3003

CMD ["node", "server.js"]
