FROM node:18-alpine

WORKDIR /project/alert-agent-data-collect-service

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose port (default 3008, can be overridden by ENV PORT)
EXPOSE ${PORT:-3008}

# Environment variable defaults
ENV PORT=3008

# Start service
CMD ["npm", "start"]

