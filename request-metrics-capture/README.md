# Request-Level Metrics Capture

This module provides request-level metrics capture for both Node.js and Spring Boot services. It captures comprehensive metrics for every HTTP request and writes them to `metrics.jsonl` files.

## Metrics Schema

Each request generates exactly one JSON line with the following schema:

```json
{
  "request_id": "uuid-or-x-request-id-header",
  "service": "service-name",
  "http": {
    "method": "GET|POST|PUT|DELETE|PATCH",
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

## Node.js Integration

### Installation

1. Copy the Node.js files to your service:
   ```bash
   cp request-metrics-capture/nodejs/metricsMiddleware.ts your-service/src/middlewares/
   cp request-metrics-capture/nodejs/mongoosePlugin.ts your-service/src/middlewares/
   ```

2. Install dependencies:
   ```bash
   cd your-service
   npm install uuid @types/uuid
   ```

### Integration Steps

1. **Apply Mongoose Plugin** (before connecting to database):
   ```typescript
   import mongoose from 'mongoose';
   import { mongooseQueryTracker } from './middlewares/mongoosePlugin';
   
   mongoose.plugin(mongooseQueryTracker);
   ```

2. **Add Middleware to Express App**:
   ```typescript
   import { createMetricsMiddleware, enhanceMongooseWithRequestId } from './middlewares/metricsMiddleware';
   
   const app = express();
   
   // Add this BEFORE other middleware
   app.use(enhanceMongooseWithRequestId);
   
   // Add metrics middleware (replace 'orders-service' with your service name)
   app.use(createMetricsMiddleware('orders-service', './metrics'));
   
   // Your existing middleware
   app.use(requestLogger);
   app.use('/api/orders', orderRoutes);
   ```

3. **Output Location**: Metrics are written to `./metrics/metrics.jsonl` in your service directory.

### Services to Update

- ✅ `orders-service` (Node.js) - See [integration guide](./integration-guides/orders-service-integration.md)
- ✅ `restaurants-service` (Node.js) - See [integration guide](./integration-guides/restaurants-service-integration.md)
- ✅ `delivery-service` (Node.js) - See [integration guide](./integration-guides/delivery-service-integration.md)
- ✅ `users-service` (Spring Boot) - See [integration guide](./integration-guides/users-service-integration.md)

## Spring Boot Integration

### Installation

1. Copy the Spring Boot files to your service:
   ```bash
   cp request-metrics-capture/springboot/MetricsCaptureFilter.java users-service/src/main/java/com/app/metrics/
   cp request-metrics-capture/springboot/MongoQueryInterceptor.java users-service/src/main/java/com/app/metrics/
   ```

2. Ensure Jackson is in your `pom.xml`:
   ```xml
   <dependency>
       <groupId>com.fasterxml.jackson.core</groupId>
       <artifactId>jackson-databind</artifactId>
   </dependency>
   ```

### Integration Steps

1. **The Filter is Auto-Registered**: The `@Component` annotation automatically registers `MetricsCaptureFilter`.

2. **Update Filter Constructor**: Modify the filter to accept your service name:
   ```java
   @Component
   @Order(0)
   public class MetricsCaptureFilter extends OncePerRequestFilter {
       public MetricsCaptureFilter() {
           super("users-service"); // Replace with your service name
       }
   }
   ```

   Or use Spring's `@Value` annotation:
   ```java
   @Value("${spring.application.name:users-service}")
   private String serviceName;
   ```

3. **Track Database Queries**: Wrap your MongoDB operations:
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

4. **Output Location**: Metrics are written to `./metrics/metrics.jsonl` in your service directory.

### Services to Update

- `users-service`

## Features

### Captured Metrics

- **Request ID**: From `X-Request-Id` header or auto-generated UUID
- **Service Name**: Identifies which service handled the request
- **HTTP Info**: Method, route pattern, path, status code
- **Timing**: Start timestamp, end timestamp, duration in milliseconds
- **Process Metrics**:
  - CPU usage percentage (approximation)
  - RSS memory (total memory)
  - Heap used memory
  - Database query time (sum of all DB queries in the request)

### Route Pattern Extraction

Routes are automatically normalized by replacing IDs with `:id`:
- `/api/orders/123` → `GET /api/orders/:id`
- `/api/users/507f1f77bcf86cd799439011` → `GET /api/users/:id`

### Database Query Tracking

- **Node.js**: Automatically tracks Mongoose queries via plugin
- **Spring Boot**: Manual tracking via `MongoQueryInterceptor.trackQuery()`

## Output Format

The `metrics.jsonl` file contains one JSON object per line:

```
{"request_id":"abc-123","service":"orders-service","http":{"method":"GET","route":"GET /api/orders/:id","path":"/api/orders/123","status_code":200},"timing":{"start_ts_ms":1234567890123,"end_ts_ms":1234567890456,"duration_ms":333.45},"metrics":{"cpu_percent":12.5,"rss_mb":256.78,"heap_used_mb":128.45,"db_query_time_ms":45.23}}
{"request_id":"def-456","service":"users-service","http":{"method":"POST","route":"POST /api/auth/login","path":"/api/auth/login","status_code":200},"timing":{"start_ts_ms":1234567890789,"end_ts_ms":1234567891012,"duration_ms":223.12},"metrics":{"cpu_percent":8.3,"rss_mb":512.34,"heap_used_mb":256.78,"db_query_time_ms":12.45}}
```

## Notes

- Metrics are written asynchronously and won't block request processing
- Each service writes to its own `metrics.jsonl` file
- The `X-Request-Id` header is used if present, otherwise a UUID is generated
- CPU percentage is an approximation and may vary by platform
- Database query time is cumulative for all queries within a single request

## Troubleshooting

### Node.js: DB queries not tracked

- Ensure `mongoose.plugin(mongooseQueryTracker)` is called before connecting to MongoDB
- Ensure `enhanceMongooseWithRequestId` middleware is added before routes
- Check that `X-Request-Id` header is being set or generated

### Spring Boot: Filter not running

- Check that `@Component` annotation is present
- Verify `@Order(0)` ensures it runs before other filters
- Check Spring component scanning includes the package

### Metrics file not created

- Ensure the service has write permissions in the service directory
- Check that the `./metrics` directory can be created
- Verify no file system errors in logs

