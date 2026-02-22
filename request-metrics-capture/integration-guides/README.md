# Service-Specific Integration Guides

This directory contains step-by-step integration guides for each service that needs metrics capture.

## Services Requiring Integration

1. ✅ **orders-service** (Node.js/Express) - [Integration Guide](./orders-service-integration.md)
2. ✅ **delivery-service** (Node.js/Express) - [Integration Guide](./delivery-service-integration.md)
3. ✅ **restaurants-service** (Node.js/Express) - [Integration Guide](./restaurants-service-integration.md)
4. ✅ **users-service** (Spring Boot) - [Integration Guide](./users-service-integration.md)

## Quick Summary

### Node.js Services (orders, delivery, restaurants)
1. Copy `metricsMiddleware.ts` and `mongoosePlugin.ts` to service
2. Install `uuid` and `@types/uuid`
3. Apply mongoose plugin before DB connection
4. Add middleware to Express app before routes
5. Metrics written to `./metrics/metrics.jsonl`

### Spring Boot Service (users-service)
1. Copy `MetricsCaptureFilter.java` and `MongoQueryInterceptor.java` to service
2. Update service name in filter
3. Wrap MongoDB repository calls with query tracking
4. Filter auto-registers via `@Component`
5. Metrics written to `./metrics/metrics.jsonl`

## Common Steps for All Services

1. **Copy files** from `request-metrics-capture/` to respective service directories
2. **Install dependencies** (Node.js: uuid, Spring Boot: already included)
3. **Update service code** following the specific integration guide
4. **Test** by making requests and checking `metrics.jsonl` output
5. **Verify** metrics are being captured correctly

## Output Location

Each service writes to its own metrics file:
- `orders-service/metrics/metrics.jsonl`
- `delivery-service/metrics/metrics.jsonl`
- `restaurants-service/metrics/metrics.jsonl`
- `users-service/metrics/metrics.jsonl`

## Metrics Schema

All services output the same JSON schema:
```json
{
  "request_id": "uuid-or-x-request-id",
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

## Troubleshooting

### Node.js Services
- **DB queries not tracked**: Ensure `mongoose.plugin(mongooseQueryTracker)` is called before connecting to MongoDB
- **Request ID missing**: Ensure `enhanceMongooseWithRequestId` middleware is added before routes
- **Metrics file not created**: Check write permissions in service directory

### Spring Boot Service
- **Filter not running**: Verify `@Component` annotation and Spring component scanning
- **DB queries not tracked**: Ensure `queryInterceptor.trackQuery()` wraps all repository calls
- **Service name wrong**: Update `serviceName` in `MetricsCaptureFilter` constructor or use `@Value`

## Next Steps After Integration

1. Test each service individually
2. Verify metrics.jsonl files are being created
3. Check that request_id is being propagated correctly
4. Validate that DB query times are being captured
5. Monitor metrics files for any issues

