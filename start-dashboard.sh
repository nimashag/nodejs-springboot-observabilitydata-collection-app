#!/bin/bash
# Bash script to start the Adaptive Alert Dashboard
# Usage: ./start-dashboard.sh

echo "================================================"
echo "  Adaptive Alert Dashboard - Startup Script"
echo "================================================"
echo ""

# Check if backend is running
echo "Checking backend service..."
if curl -s http://localhost:3008/api/health > /dev/null 2>&1; then
    echo "✓ Backend service is running on port 3008"
else
    echo "✗ Backend service is NOT running"
    echo ""
    echo "Please start the backend service first:"
    echo "  cd alert-agent-data-collect-service"
    echo "  npm start"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Starting Alert Dashboard..."
echo ""

# Navigate to dashboard directory
cd alert-dashboard-frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the dashboard
echo ""
echo "================================================"
echo "  Dashboard starting on http://localhost:3009"
echo "================================================"
echo ""

npm run dev

