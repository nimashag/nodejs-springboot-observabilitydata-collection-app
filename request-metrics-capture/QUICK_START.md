# Quick Start Guide

## Node.js Services (Express)

### 1. Copy Files
```bash
# For orders-service
cp request-metrics-capture/nodejs/metricsMiddleware.ts orders-service/src/middlewares/
cp request-metrics-capture/nodejs/mongoosePlugin.ts orders-service/src/middlewares/

# Repeat for restaurants-service, delivery-service, etc.
```

### 2. Install Dependencies
```bash
cd orders-service
npm install uuid @types/uuid
```

### 3. Update app.ts
```typescript
import mongoose from 'mongoose';
import { createMetricsMiddleware, enhanceMongooseWithRequestId } from './middlewares/metricsMiddleware';
import { mongooseQueryTracker } from './middlewares/mongoosePlugin';

// Apply plugin BEFORE connecting to DB
mongoose.plugin(mongooseQueryTracker);

const app = express();

// Add these BEFORE other middleware
app.use(enhanceMongooseWithRequestId);
app.use(createMetricsMiddleware('orders-service', './metrics'));

// Your existing middleware
app.use(requestLogger);
app.use('/api/orders', orderRoutes);
```

### 4. Verify
- Start your service
- Make a request
- Check `./metrics/metrics.jsonl` for output

## Spring Boot Service (users-service)

### 1. Copy Files
```bash
cp request-metrics-capture/springboot/MetricsCaptureFilter.java users-service/src/main/java/com/app/metrics/
cp request-metrics-capture/springboot/MongoQueryInterceptor.java users-service/src/main/java/com/app/metrics/
```

### 2. Update MetricsCaptureFilter.java
Change the service name in the constructor or use `@Value`:
```java
@Value("${spring.application.name:users-service}")
private String serviceName;
```

### 3. Track DB Queries (Optional but Recommended)
Wrap your MongoDB operations:
```java
@Autowired
private MongoQueryInterceptor queryInterceptor;

public User findById(String id) {
    long startTime = System.currentTimeMillis();
    User user = mongoTemplate.findById(id, User.class);
    queryInterceptor.trackQuery("findById", System.currentTimeMillis() - startTime);
    return user;
}
```

### 4. Verify
- Start your service
- Make a request
- Check `./metrics/metrics.jsonl` for output

## Output Format

Each line in `metrics.jsonl` is a JSON object:
```json
{
  "request_id": "abc-123",
  "service": "orders-service",
  "http": {
    "method": "GET",
    "route": "GET /api/orders/:id",
    "path": "/api/orders/123",
    "status_code": 200
  },
  "timing": {
    "start_ts_ms": 1234567890123,
    "end_ts_ms": 1234567890456,
    "duration_ms": 333.45
  },
  "metrics": {
    "cpu_percent": 12.5,
    "rss_mb": 256.78,
    "heap_used_mb": 128.45,
    "db_query_time_ms": 45.23
  }
}
```

## Services to Update

- ✅ orders-service (Node.js) - See [integration guide](./integration-guides/orders-service-integration.md)
- ✅ restaurants-service (Node.js) - See [integration guide](./integration-guides/restaurants-service-integration.md)
- ✅ delivery-service (Node.js) - See [integration guide](./integration-guides/delivery-service-integration.md)
- ✅ users-service (Spring Boot) - See [integration guide](./integration-guides/users-service-integration.md)

