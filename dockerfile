FROM node:alpine AS BUILDER

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy application code
COPY backend .
COPY frontend ./frontend

#Set a non-root user
# RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# USER appuser

FROM node:alpine

WORKDIR /app

COPY --from=BUILDER /app .

# Expose both ports - 3000 for the main app, 80 for proxy
EXPOSE 3000 80

# Start the application
CMD ["npm", "start"]