# ---- deps ----
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# ---- builder ----
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholders so any module-load-time client/secret construction
# (OpenAI, Gemini, Better Auth) doesn't fail during `next build`. These are
# NOT baked into the bundle (server env is read at runtime); Cloud Run injects
# the real secrets at runtime, which override these.
ENV OPENAI_API_KEY="sk-build-placeholder" \
    GEMINI_API_KEY="build-placeholder" \
    BETTER_AUTH_SECRET="build-time-placeholder-secret-000000000000" \
    BETTER_AUTH_URL="http://localhost:3000" \
    DATABASE_URL="postgresql://u:p@localhost:5432/db"
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# ---- runner (small standalone image for Cloud Run) ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# Prisma query engine + generated client (externalized, so copy explicitly)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 8080
CMD ["node", "server.js"]
