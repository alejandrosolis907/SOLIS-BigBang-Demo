# ---------- STAGE 1: builder ----------
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build   # genera /app/dist

# ---------- STAGE 2: runner ----------
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 3000

# Copiamos solo lo necesario
COPY --from=builder /app/dist ./dist
COPY server.mjs ./server.mjs
COPY package*.json ./
RUN npm install --omit=dev

CMD ["node", "server.mjs"]
