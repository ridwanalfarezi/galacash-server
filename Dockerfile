# ===================================
# Stage 1: Build
# ===================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy source code
COPY . .

# Set dummy database URL for build
ARG DATABASE_URL="postgresql://placeholder:5432/db"
ENV DATABASE_URL=$DATABASE_URL

# Generate Prisma Client
RUN pnpm prisma:generate

# Build TypeScript
RUN pnpm build

# ===================================
# Stage 2: Production
# ===================================
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json ./package.json

# Copy all dependencies from builder (includes Prisma client)
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema
COPY --from=builder /app/prisma ./prisma

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/openapi.yaml ./openapi.yaml

# Create logs directory
RUN mkdir -p logs

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check (enabled with extended timeout for Cloud Run)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
