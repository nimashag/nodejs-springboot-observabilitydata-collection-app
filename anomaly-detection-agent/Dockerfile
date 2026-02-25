# Use Python slim as base since we need Python for pipeline scripts
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

# Copy Python requirements first (for better layer caching)
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy source code
COPY . .

# Ensure model files are available (copy model_experiments if it exists)
# This ensures models are available even if volume mount is empty
RUN if [ -d "model_experiments" ]; then \
        echo "Model experiments directory found, ensuring models are available"; \
        mkdir -p model_experiments/models/random_forest; \
    fi

# Create necessary directories for data and outputs
RUN mkdir -p \
    data/raw/logs \
    data/raw/metrics \
    data/csv \
    data/merged \
    data/processed \
    data/features \
    data/metrics \
    outputs/incidents \
    outputs/anomalies \
    model_experiments/models/random_forest

# Expose port for API server
EXPOSE 3007

# Set environment variables
ENV PYTHONIOENCODING=utf-8
ENV NODE_ENV=production

# Start both pipeline and API server concurrently
CMD ["npm", "run", "dev:no-email"]

