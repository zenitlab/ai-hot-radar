# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Prisma needs openssl on alpine
RUN apk add --no-cache openssl

# Install deps (use package-lock.json for reproducible builds)
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

# Persistent data directory (mounted as volume)
RUN mkdir -p /app/data

EXPOSE 3001

# Sync schema to SQLite on every start (idempotent), then launch
CMD npx prisma db push --skip-generate --accept-data-loss && node dist/main.js
