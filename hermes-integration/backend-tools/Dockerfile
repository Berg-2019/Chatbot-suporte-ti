# Hermes Helpdesk Tools Server
# Dockerfile para o servidor bridge entre Hermes Agent e Backend NestJS

FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

# Instalar amqplib para o consumer
RUN npm install --production amqplib axios

EXPOSE 3003

# Server principal + consumer de outgoing messages
CMD ["node", "server.js"] & \
    node outgoing-consumer.js