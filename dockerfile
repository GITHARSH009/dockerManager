FROM node:alpine as base

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy application code
COPY backend/ ./
COPY frontend/ ./frontend/

# Expose both ports - 3000 for the main app, 80 for proxy
EXPOSE 3000 80

# Start the application
CMD ["npm", "start"]