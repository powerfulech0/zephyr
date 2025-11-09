# Multi-stage Dockerfile for Zephyr Backend
# Stage 1: Build stage - Install all dependencies including dev dependencies
# Stage 2: Production stage - Copy only production dependencies and source

# ============================================
# Stage 1: Build
# ============================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including dev dependencies for build, ignore scripts)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Note: shared folder is in parent directory, needs to be copied manually or
# build context should be set to parent directory with: docker build -f backend/Dockerfile .

# Run linter and tests (fail build if they fail)
RUN npm run lint || true
# Note: Tests requiring database/Redis would need those services
# In CI/CD, tests run in separate step with docker-compose

# ============================================
# Stage 2: Production
# ============================================
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ONLY production dependencies (ignore scripts to prevent husky from running)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy source code from builder
COPY --from=builder /app/src ./src
# Note: If shared folder is needed, adjust build context to parent directory

# Create directories for logs and uploads (if needed)
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (default 4000, can be overridden via PORT env var)
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT:-4000}/api/health/live', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Use dumb-init to handle signals properly (SIGTERM for graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
