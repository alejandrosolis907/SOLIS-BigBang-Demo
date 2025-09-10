# ---- STAGE 1: build con Vite
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- STAGE 2: runtime con Express
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copiamos lo necesario
COPY --from=builder /app/dist ./dist
COPY server.mjs ./server.mjs
COPY package*.json ./

# Solo deps de producción
RUN npm install --omit=dev

EXPOSE 3000
CMD ["node", "server.mjs"]
