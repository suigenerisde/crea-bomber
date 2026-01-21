# CreaBomber Production Dockerfile
# Multi-stage build for optimized image size

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js application
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install PM2 and tsx (TypeScript executor) globally
RUN npm install -g pm2 tsx

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 creabomber

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create directories
RUN mkdir -p /app/data /app/logs && chown -R creabomber:nodejs /app

# Copy built application
COPY --from=builder --chown=creabomber:nodejs /app/.next ./.next
COPY --from=builder --chown=creabomber:nodejs /app/public ./public
COPY --from=builder --chown=creabomber:nodejs /app/package.json ./package.json
COPY --from=builder --chown=creabomber:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=creabomber:nodejs /app/server.ts ./server.ts
COPY --from=builder --chown=creabomber:nodejs /app/src ./src
COPY --from=builder --chown=creabomber:nodejs /app/tsconfig*.json ./
COPY --from=builder --chown=creabomber:nodejs /app/ecosystem.config.js ./ecosystem.config.js

# Switch to non-root user
USER creabomber

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start with PM2
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
