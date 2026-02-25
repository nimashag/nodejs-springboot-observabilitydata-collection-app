# Use Python slim as base since we need Python for ML module
FROM python:3.11-slim

# Install Node.js 18 and procps (provides ps command for concurrently)
RUN apt-get update && apt-get install -y \
    curl \
    procps \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy Python requirements
COPY ml-module/requirements.txt ./ml-module/
COPY ml-module/requirements_enhanced.txt ./ml-module/

# Install Python dependencies (base + Flask for ML service)
RUN pip install --no-cache-dir -r ml-module/requirements.txt && \
    pip install --no-cache-dir flask>=3.0.0 flask-cors>=4.0.0

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p output ml-module/models

# Expose port
EXPOSE 3008

# Start service (runs both ML service and Node service)
CMD ["npm", "start"]
