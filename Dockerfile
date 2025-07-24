# Stage 1: build
FROM node:20-alpine AS builder

# Defina diretório de trabalho
WORKDIR /app

# Copie apenas o package.json e o lockfile para instalar deps
COPY package*.json ./
COPY prisma ./prisma/

# Instale dependências
RUN npm ci

# Copie o restante do código
COPY tsconfig*.json ./
COPY src ./src

# Gere o cliente do Prisma e faça o build TS
RUN npx prisma generate
RUN npm run build

# Stage 2: runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Apenas prod deps
COPY package*.json ./
RUN npm ci --production

# Copie build e prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Variáveis de ambiente pontuais
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Comando de start
CMD ["node", "dist/main.js"]
