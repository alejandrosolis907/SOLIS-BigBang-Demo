# Etapa 1: build con Vite
FROM node:18-alpine AS builder
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar todo el código y construir
COPY . .
RUN npm run build

# Etapa 2: entorno de producción
FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copiar solo lo necesario desde el builder
COPY --from=builder /app/dist ./dist
COPY server.mjs ./server.mjs
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --omit=dev

EXPOSE 3000
CMD ["node", "server.mjs"]
