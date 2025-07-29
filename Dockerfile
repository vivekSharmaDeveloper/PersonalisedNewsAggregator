# Multi-stage Dockerfile for News Aggregator
# Production-ready containerization

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client

# Copy package files
COPY client/package*.json ./

# Install dependencies (need dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY client/ .

# Build frontend
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/server

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY server/ .

# Stage 3: Production Runtime
FROM node:20-alpine AS production

# Install security updates and essential packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S newsapp -u 1001

# Set working directory
WORKDIR /app

# Copy backend from builder stage
COPY --from=backend-builder --chown=newsapp:nodejs /app/server ./server
COPY --from=frontend-builder --chown=newsapp:nodejs /app/client/.next ./client/.next
COPY --from=frontend-builder --chown=newsapp:nodejs /app/client/public ./client/public
COPY --from=frontend-builder --chown=newsapp:nodejs /app/client/package.json ./client/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV FRONTEND_PORT=3000

# Expose ports
EXPOSE 5000 3000

# Switch to non-root user
USER newsapp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/v1/ || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start both backend and frontend
CMD ["sh", "-c", "cd server && npm start & cd client && npm start && wait"]
