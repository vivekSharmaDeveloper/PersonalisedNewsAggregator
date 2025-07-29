# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY ml_inference_service/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application source code
COPY ml_inference_service/ .
COPY ml_data/ ./ml_data/

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Change ownership of the app directory to the new user
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Expose the port the app runs on
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]
