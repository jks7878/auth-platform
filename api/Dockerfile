FROM node:22-slim AS deps
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS dev
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm ci
COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

FROM node:22-slim AS migrate
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-slim AS prod
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
