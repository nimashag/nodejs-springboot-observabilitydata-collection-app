# Use Python slim as base since we need Python for anomaly detection pipeline
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

# Install Node dependencies (including concurrently for running both processes)
RUN npm install

# Copy Python requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p outputs models data/csv data/merged data/metrics data/processed data/raw/logs data/raw/metrics data/test

# Expose port for API server
EXPOSE 3007

# Start both services (Python pipeline + Node API server)
# Uses concurrently to run both processes in parallel
CMD ["npm", "start"]

