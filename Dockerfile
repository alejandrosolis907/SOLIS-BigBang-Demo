# Etapa 1: Construcción con Vite
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código y construir
COPY . .
RUN npm run build

# Etapa 2: Producción con Express
FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copiar solo lo necesario
COPY --from=builder /app/dist ./dist
COPY server.mjs ./server.mjs
COPY package*.json ./
RUN npm install --omit=dev

EXPOSE 3000
CMD ["node", "server.mjs"]
