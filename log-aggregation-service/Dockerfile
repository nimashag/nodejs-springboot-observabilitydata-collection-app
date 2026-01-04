FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Set Node.js memory limit
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Expose port
EXPOSE 3005

# Start service
CMD ["npm", "start"]

