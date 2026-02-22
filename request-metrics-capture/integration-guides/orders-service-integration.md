# Orders Service - Metrics Integration Guide

## Steps to Integrate

### 1. Copy Files to Orders Service
```bash
cp request-metrics-capture/nodejs/metricsMiddleware.ts orders-service/src/middlewares/
cp request-metrics-capture/nodejs/mongoosePlugin.ts orders-service/src/middlewares/
```

### 2. Install Dependencies
```bash
cd orders-service
npm install uuid @types/uuid
```

### 3. Update `orders-service/src/app.ts`

**Before:**
```typescript
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import orderRoutes from './routes/orders.routes';
import { requestLogger } from './middlewares/requestLogger';
import { initializeAlertCollector, alertCollectorMiddleware } from './collectors/alert-collector';

const app = express();

// Initialize Alert Collector
initializeAlertCollector('orders-service');

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use(requestLogger);
app.use(alertCollectorMiddleware);

app.use('/api/orders', orderRoutes);
```

**After:**
```typescript
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import orderRoutes from './routes/orders.routes';
import { requestLogger } from './middlewares/requestLogger';
import { initializeAlertCollector, alertCollectorMiddleware } from './collectors/alert-collector';
import { createMetricsMiddleware, enhanceMongooseWithRequestId } from './middlewares/metricsMiddleware';
import { mongooseQueryTracker } from './middlewares/mongoosePlugin';

// Apply mongoose plugin BEFORE connecting to database
mongoose.plugin(mongooseQueryTracker);

const app = express();

// Initialize Alert Collector
initializeAlertCollector('orders-service');

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());

// createMetricsMiddleware FIRST so requestId exists; enhanceMongooseWithRequestId sets global for DB tracking
app.use(createMetricsMiddleware('orders-service', './metrics'));
app.use(enhanceMongooseWithRequestId);

app.use(requestLogger);
app.use(alertCollectorMiddleware);

app.use('/api/orders', orderRoutes);
```

### 4. Update `orders-service/src/config/db.ts` (if exists)

Ensure mongoose plugin is applied before connection:
```typescript
import mongoose from 'mongoose';
import { mongooseQueryTracker } from '../middlewares/mongoosePlugin';

// Apply plugin before connecting
mongoose.plugin(mongooseQueryTracker);

export default async function connectDB() {
    // ... existing connection code
}
```

### 5. Verify Integration

1. Start the service: `npm run dev`
2. Make a test request: `curl http://localhost:3002/api/orders`
3. Check metrics file: `cat orders-service/metrics/metrics.jsonl`

Expected output format:
```json
{"request_id":"...","service":"orders-service","http":{"method":"GET","route":"GET /api/orders","path":"/api/orders","status_code":200},"timing":{"start_ts_ms":...,"end_ts_ms":...,"duration_ms":...},"metrics":{"cpu_percent":...,"rss_mb":...,"heap_used_mb":...,"db_query_time_ms":...}}
```

