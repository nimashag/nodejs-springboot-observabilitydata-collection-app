FROM node:18-alpine

# Install Python and build dependencies for ML module
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

WORKDIR /project/alert-agent-data-collect-service

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install Node.js dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Copy ML module
COPY ml-module ./ml-module

# Copy wait-for-ml script
COPY wait-for-ml.js ./

# Install Python dependencies for ML module
RUN cd ml-module && \
    pip3 install --no-cache-dir -r requirements_enhanced.txt || \
    (echo "Warning: Some ML dependencies may have failed to install" && true)

# Build TypeScript
RUN npm run build

# Create output directory
RUN mkdir -p output

# Expose port
EXPOSE 3008

# Environment variable defaults
ENV PORT=3008

# Start service (runs both ML and Node.js services)
CMD ["npm", "start"]
