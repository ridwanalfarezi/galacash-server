# ===================================
# Stage 1: Build & Generate
# ===================================
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Set dummy database URL for build
ARG DATABASE_URL="postgresql://placeholder:5432/db"
ENV DATABASE_URL=$DATABASE_URL

# Generate Prisma Client
RUN bun run prisma:generate

# ===================================
# Stage 2: Production
# ===================================
FROM oven/bun:1 AS runner

WORKDIR /app

# Install production dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy generated prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy source code and config
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/openapi.yaml ./openapi.yaml

# Create logs directory
RUN mkdir -p logs

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then(r => process.exit(r.status === 200 ? 0 : 1))"

# Start application
CMD ["bun", "src/index.ts"]
