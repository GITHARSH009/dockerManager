FROM node:alpine as base

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm install --only=production

# Copy application code
COPY backend/ ./
COPY frontend/ ./frontend/

EXPOSE 3000

# Start the application
CMD ["node", "index.js"]