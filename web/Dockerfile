FROM node:22-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:22-slim AS dev
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM nginx:alpine AS prod

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
