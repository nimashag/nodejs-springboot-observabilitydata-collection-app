# Build step
# Use standard Node.js image (not Alpine) to avoid Rollup musl compatibility issues
FROM node:18 AS builder
WORKDIR /app

# Increase Node.js memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy package files
COPY package*.json ./

# Install dependencies with optional dependencies included
# Workaround for npm bug with optional dependencies: https://github.com/npm/cli/issues/4828
RUN npm install --include=optional

# Explicitly install Rollup native binary (workaround for npm optional deps bug)
# This ensures the native binary is available even if npm didn't install it as optional
RUN npm install --no-save @rollup/rollup-linux-x64-gnu || true

# Copy source code and configuration files
COPY . .

# Build the application (runs tsc && vite build)
# Note: API URL is determined dynamically at runtime based on window.location
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# Production step
FROM nginx:1.27-alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA (simplified like logs-dashboard-frontend)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
