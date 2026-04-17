# Use official Node.js lightweight image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build the Vite frontend application
RUN npm run build

# Expose the correct port
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Start the Express server using tsx
CMD ["npm", "start"]
