# Etapa 1: build con Vite
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar dependencias e instalarlas
COPY package*.json ./
RUN npm install

# Copiar todo el código y construir
COPY . .
RUN npm run build

# Etapa 2: solo runtime con Express
FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY server.mjs ./server.mjs
COPY package*.json ./

RUN npm install --omit=dev

EXPOSE 3000
CMD ["node", "server.mjs"]
