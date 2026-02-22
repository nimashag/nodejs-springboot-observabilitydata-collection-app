# Observability Dashboard Frontend

Unified frontend service for displaying logs and alerts analytics in a single dashboard.

## Overview

This is a unified observability dashboard that combines:
- **Log Analytics** - From log aggregation service
- **Alert Analytics** - From alert agent data collection service

## Prerequisites

- Node.js v18 or higher
- npm v7 or higher

## Installation

1. Navigate to the observability-dashboard-frontend directory:
```bash
cd observability-dashboard-frontend
```

2. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5175`

## Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Preview Production Build

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
observability-dashboard-frontend/
├── src/
│   ├── api/              # API service layer
│   ├── components/       # Reusable components
│   ├── pages/            # Page components
│   │   ├── logs/         # Log-related pages
│   │   └── alerts/       # Alert-related pages
│   ├── context/          # React context providers
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css        # Global styles
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

## Technologies Used

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **date-fns** - Date formatting
- **Lucide React** - Icon library

## Environment Variables

- `VITE_LOG_AGGREGATION_API_URL` - Base URL for the log aggregation API (default: http://localhost:3005)
- `VITE_ALERT_AGENT_API_URL` - Base URL for the alert agent API (default: http://localhost:3008)

## Docker

Build Docker image:
```bash
docker build -t observability-dashboard-frontend .
```

Run container:
```bash
docker run -p 30011:80 observability-dashboard-frontend
```

## License

Part of the Research Project for observability in microservice architectures.

