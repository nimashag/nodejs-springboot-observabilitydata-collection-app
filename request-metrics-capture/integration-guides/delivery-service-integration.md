# Delivery Service - Metrics Integration Guide

## Steps to Integrate

### 1. Copy Files to Delivery Service
```bash
cp request-metrics-capture/nodejs/metricsMiddleware.ts delivery-service/src/middlewares/
cp request-metrics-capture/nodejs/mongoosePlugin.ts delivery-service/src/middlewares/
```

### 2. Install Dependencies
```bash
cd delivery-service
npm install uuid @types/uuid
```

### 3. Update `delivery-service/src/app.ts`

**Before:**
```typescript
import express from "express";
import mongoose from "mongoose";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import deliveryRoutes from "./routes/delivery.routes";
import driverRoutes from "./routes/driver.routes";
import { requestLogger } from "./middleware/requestLogger";
import { initializeAlertCollector, alertCollectorMiddleware } from "./collectors/alert-collector";

dotenv.config();
const app = express();

initializeAlertCollector('delivery-service');

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
}));

app.use(express.json());
app.use(requestLogger);
app.use(alertCollectorMiddleware);

app.use("/api/drivers", driverRoutes);
app.use("/api/delivery", deliveryRoutes);
```

**After:**
```typescript
import express from "express";
import mongoose from "mongoose";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import deliveryRoutes from "./routes/delivery.routes";
import driverRoutes from "./routes/driver.routes";
import { requestLogger } from "./middleware/requestLogger";
import { initializeAlertCollector, alertCollectorMiddleware } from "./collectors/alert-collector";
import { createMetricsMiddleware, enhanceMongooseWithRequestId } from "./middlewares/metricsMiddleware";
import { mongooseQueryTracker } from "./middlewares/mongoosePlugin";

// Apply mongoose plugin BEFORE connecting to database
mongoose.plugin(mongooseQueryTracker);

dotenv.config();
const app = express();

initializeAlertCollector('delivery-service');

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
}));

app.use(express.json());

// createMetricsMiddleware FIRST so requestId exists; enhanceMongooseWithRequestId sets global for DB tracking
app.use(createMetricsMiddleware('delivery-service', './metrics'));
app.use(enhanceMongooseWithRequestId);

app.use(requestLogger);
app.use(alertCollectorMiddleware);

app.use("/api/drivers", driverRoutes);
app.use("/api/delivery", deliveryRoutes);
```

### 4. Verify Integration

1. Start the service: `npm run dev`
2. Make a test request: `curl http://localhost:3004/api/delivery`
3. Check metrics file: `cat delivery-service/metrics/metrics.jsonl`

Expected output format:
```json
{"request_id":"...","service":"delivery-service","http":{"method":"GET","route":"GET /api/delivery","path":"/api/delivery","status_code":200},"timing":{"start_ts_ms":...,"end_ts_ms":...,"duration_ms":...},"metrics":{"cpu_percent":...,"rss_mb":...,"heap_used_mb":...,"db_query_time_ms":...}}
```

