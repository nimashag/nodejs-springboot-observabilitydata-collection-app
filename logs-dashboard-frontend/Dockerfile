# Build step
FROM node:18-alpine AS builder
WORKDIR /app

# Increase Node.js memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY package*.json ./
RUN npm install

COPY . .

# Build - skip TypeScript type checking to save memory (Vite handles TS compilation)
# Note: API URL is determined dynamically at runtime based on window.location
RUN NODE_OPTIONS="--max-old-space-size=2048" npx vite build

# Production step
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA
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

