# Log Aggregation Service

ML-based log aggregation and structuring service for enterprise microservices.

## Features

- **Log Collection**: Automatically collects logs from all microservices
- **ML-Based Parsing**: Uses NLP and pattern recognition to structure unstructured logs
- **Trace Correlation**: Extracts and correlates trace IDs across services
- **Root Cause Analysis**: Identifies root causes of errors using trace IDs

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure log paths in `.env` file

4. Train the ML model (optional, will auto-train on first run):
```bash
npm run train
```

5. Start the service:
```bash
npm run dev
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/traces/:traceId` - Get all logs for a trace ID
- `GET /api/traces/:traceId/root-cause` - Get root cause analysis for a trace
- `GET /api/logs` - Query structured logs
- `POST /api/train` - Retrain the ML model

## Architecture

- `src/services/logCollector.ts` - Collects logs from all services
- `src/services/logParser.ts` - ML-based log parser
- `src/services/traceCorrelator.ts` - Trace correlation and analysis
- `src/controllers/` - API controllers
- `src/routes/` - API routes

