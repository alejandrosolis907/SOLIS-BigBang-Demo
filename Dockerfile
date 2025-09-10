FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY server.mjs ./server.mjs
COPY package*.json ./
RUN npm install --omit=dev
EXPOSE 3000
CMD ["node", "server.mjs"]
