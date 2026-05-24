# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# ---------- Runtime stage (Nginx) ----------
FROM nginx:alpine

# Static assets produced by Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx site config (replaces the default)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
