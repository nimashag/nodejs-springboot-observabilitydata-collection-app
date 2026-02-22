# Restaurants Service - Metrics Integration Guide

## Steps to Integrate

### 1. Copy Files to Restaurants Service
```bash
cp request-metrics-capture/nodejs/metricsMiddleware.ts restaurants-service/src/middlewares/
cp request-metrics-capture/nodejs/mongoosePlugin.ts restaurants-service/src/middlewares/
```

### 2. Install Dependencies
```bash
cd restaurants-service
npm install uuid @types/uuid
```

### 3. Update `restaurants-service/src/app.ts`

**Before:**
```typescript
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; 
import restaurantsRoutes from './routes/restaurants.routes';
import path from 'path';
import { requestLogger } from './middlewares/requestLogger';
import { initializeAlertCollector, alertCollectorMiddleware } from './collectors/alert-collector';

const app = express();

initializeAlertCollector('restaurants-service');

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use(requestLogger);
app.use(alertCollectorMiddleware);

app.use('/api/restaurants', restaurantsRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

**After:**
```typescript
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; 
import restaurantsRoutes from './routes/restaurants.routes';
import path from 'path';
import { requestLogger } from './middlewares/requestLogger';
import { initializeAlertCollector, alertCollectorMiddleware } from './collectors/alert-collector';
import { createMetricsMiddleware, enhanceMongooseWithRequestId } from './middlewares/metricsMiddleware';
import { mongooseQueryTracker } from './middlewares/mongoosePlugin';

// Apply mongoose plugin BEFORE connecting to database
mongoose.plugin(mongooseQueryTracker);

const app = express();

initializeAlertCollector('restaurants-service');

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());

// createMetricsMiddleware FIRST so requestId exists; enhanceMongooseWithRequestId sets global for DB tracking
app.use(createMetricsMiddleware('restaurants-service', './metrics'));
app.use(enhanceMongooseWithRequestId);

app.use(requestLogger);
app.use(alertCollectorMiddleware);

app.use('/api/restaurants', restaurantsRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

### 4. Verify Integration

1. Start the service: `npm run dev`
2. Make a test request: `curl http://localhost:3001/api/restaurants`
3. Check metrics file: `cat restaurants-service/metrics/metrics.jsonl`

Expected output format:
```json
{"request_id":"...","service":"restaurants-service","http":{"method":"GET","route":"GET /api/restaurants","path":"/api/restaurants","status_code":200},"timing":{"start_ts_ms":...,"end_ts_ms":...,"duration_ms":...},"metrics":{"cpu_percent":...,"rss_mb":...,"heap_used_mb":...,"db_query_time_ms":...}}
```

