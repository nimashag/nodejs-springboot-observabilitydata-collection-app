# Alert Types Documentation

This document describes all the alert types implemented in the observability system for both the restaurants-service and delivery-service.

## Alert Categories

### 1. Error Alerts

#### Error Burst
- **Alert Name**: `error_burst`
- **Type**: `error`
- **Description**: Detects a sudden burst of errors within a short time window
- **Threshold**: 5+ errors within 1 minute
- **Severity Levels**:
  - **Low**: 5-6 errors
  - **Medium**: 7-9 errors
  - **High**: 10+ errors
- **Use Case**: Identifies sudden service failures, API issues, or cascading errors

---

### 2. Latency Alerts

#### High Latency
- **Alert Name**: `high_latency`
- **Type**: `latency`
- **Description**: Detects sustained high response times
- **Threshold**: 3 consecutive requests taking more than 3 seconds
- **Severity Levels**:
  - **Low**: Average latency 3-4 seconds
  - **Medium**: Average latency 4-5 seconds
  - **High**: Average latency 5+ seconds
- **Use Case**: Identifies performance degradation, slow database queries, or resource contention

---

### 3. Availability Alerts

#### Availability Issue
- **Alert Name**: `availability_issue`
- **Type**: `availability`
- **Description**: Detects high error rates indicating service availability problems
- **Threshold**: 50%+ error rate (requires at least 10 requests for data significance)
- **Severity Levels**:
  - **Low**: 50-64% error rate
  - **Medium**: 65-79% error rate
  - **High**: 80%+ error rate
- **Use Case**: Identifies service outages, dependency failures, or infrastructure issues

---

### 4. Resource Alerts

#### High Memory Usage
- **Alert Name**: `high_memory_usage`
- **Type**: `resource`
- **Description**: Detects when heap memory usage exceeds safe thresholds
- **Threshold**: 85%+ of heap size limit
- **Severity Levels**:
  - **Medium**: 85-89% usage
  - **High**: 90-94% usage
  - **Critical**: 95%+ usage
- **Hysteresis**: Resolves when usage drops below 80%
- **Use Case**: Prevents out-of-memory crashes, identifies memory leaks

#### High CPU Usage
- **Alert Name**: `high_cpu_usage`
- **Type**: `resource`
- **Description**: Detects sustained high CPU utilization
- **Threshold**: 80%+ CPU usage
- **Severity Levels**:
  - **Medium**: 80-89% usage
  - **High**: 90-94% usage
  - **Critical**: 95%+ usage
- **Hysteresis**: Resolves when usage drops below 70%
- **Use Case**: Identifies CPU-intensive operations, infinite loops, or resource exhaustion

---

### 5. Performance Alerts

#### Event Loop Lag
- **Alert Name**: `event_loop_lag`
- **Type**: `performance`
- **Description**: Detects Node.js event loop blocking (critical for async performance)
- **Threshold**: Average lag of 100ms+ over last 10 measurements
- **Severity Levels**:
  - **Low**: 100-199ms lag
  - **Medium**: 200-299ms lag
  - **High**: 300-499ms lag
  - **Critical**: 500ms+ lag
- **Hysteresis**: Resolves when lag drops below 80ms
- **Use Case**: Identifies blocking operations, synchronous I/O, or CPU-bound tasks in the event loop

---

### 6. Traffic Alerts

#### Traffic Spike
- **Alert Name**: `traffic_spike`
- **Type**: `traffic`
- **Description**: Detects sudden increases in request rate
- **Threshold**: 3x baseline traffic rate
- **Severity Levels**:
  - **Low**: 3-3.9x baseline
  - **Medium**: 4-4.9x baseline
  - **High**: 5x+ baseline
- **Baseline Calculation**: Average of last 10 minutes (requires 5 data points)
- **Use Case**: Identifies DDoS attacks, viral traffic, or load testing scenarios

#### Traffic Drop
- **Alert Name**: `traffic_drop`
- **Type**: `traffic`
- **Description**: Detects sudden decreases in request rate
- **Threshold**: Drops to 30% or less of baseline traffic
- **Severity Levels**:
  - **Low**: 60-70% drop
  - **Medium**: 70-80% drop
  - **High**: 80-90% drop
  - **Critical**: 90%+ drop
- **Use Case**: Identifies service discovery issues, load balancer problems, or upstream failures

#### Database Connection Issue
- **Alert Name**: `database_connection_issue`
- **Type**: `resource`
- **Description**: Detects MongoDB connection failures or disconnections
- **Threshold**: Database connection state is disconnected or not connected/connecting
- **Severity Levels**:
  - **Critical**: Database is disconnected
- **Use Case**: Identifies database connectivity issues, network problems, or MongoDB service failures

---

### 7. Security Alerts

#### Authentication Failure Spike
- **Alert Name**: `auth_failure_spike`
- **Type**: `security`
- **Description**: Detects unusual patterns of authentication failures
- **Threshold**: 10+ authentication failures within 5 minutes
- **Severity Levels**:
  - **Low**: 10-19 failures
  - **Medium**: 20-29 failures
  - **High**: 30-49 failures
  - **Critical**: 50+ failures
- **Use Case**: Identifies brute force attacks, credential stuffing, or authentication system issues

---

## Alert Event Structure

All alerts are stored in NDJSON format with the following structure:

```json
{
  "timestamp": "2026-01-01T12:00:00.000Z",
  "service_name": "restaurants-service",
  "alert_name": "high_memory_usage",
  "alert_type": "resource",
  "alert_state": "fired",
  "alert_duration": 120000,
  "severity": "high",
  "request_count": 150,
  "error_count": 5,
  "average_response_time": 250,
  "process_cpu_usage": 45.67,
  "process_memory_usage": 524288000,
  "event_loop_lag": 15.5,
  "traffic_rate": 2.5
}
```

### Context Fields

- **request_count**: Number of requests in the metrics window (5 minutes)
- **error_count**: Number of errors in the metrics window
- **average_response_time**: Average response time in milliseconds
- **process_cpu_usage**: CPU usage percentage (0-100)
- **process_memory_usage**: Heap memory used in bytes
- **event_loop_lag**: Average event loop lag in milliseconds (optional)
- **traffic_rate**: Current traffic rate in requests per second (optional)

---

## Configuration

### Thresholds (Configurable in AlertDetector class)

```typescript
// Original thresholds
ERROR_BURST_THRESHOLD = 5
ERROR_BURST_WINDOW = 60000 // 1 minute
HIGH_LATENCY_THRESHOLD = 3000 // 3 seconds
HIGH_LATENCY_COUNT = 3
AVAILABILITY_ERROR_RATE = 0.5 // 50%
METRICS_WINDOW = 300000 // 5 minutes

// Resource thresholds
MEMORY_THRESHOLD_PERCENT = 85
CPU_THRESHOLD_PERCENT = 80
CPU_SUSTAINED_WINDOW = 120000 // 2 minutes

// Performance thresholds
EVENT_LOOP_LAG_THRESHOLD = 100 // 100ms
EVENT_LOOP_LAG_CRITICAL = 500 // 500ms

// Traffic thresholds
TRAFFIC_SPIKE_MULTIPLIER = 3
TRAFFIC_DROP_MULTIPLIER = 0.3
TRAFFIC_BASELINE_WINDOW = 600000 // 10 minutes

// Security thresholds
AUTH_FAILURE_THRESHOLD = 10
AUTH_FAILURE_WINDOW = 300000 // 5 minutes
```

---

## Usage Examples

### Recording Authentication Failures

```typescript
import { recordAuthFailure } from './collectors/alert-collector';

// In your authentication middleware
if (authFailed) {
  recordAuthFailure('invalid_credentials');
}
```

### Getting Alert Statistics

```typescript
import { getAlertStats } from './collectors/alert-collector';

const stats = getAlertStats();
console.log(`Active alerts: ${stats?.activeAlerts}`);
console.log(`Recent requests: ${stats?.recentRequests}`);
console.log(`Recent errors: ${stats?.recentErrors}`);
```

### Manual Error Recording

```typescript
import { recordErrorEvent } from './collectors/alert-collector';

// For non-HTTP errors
try {
  // Some operation
} catch (error) {
  recordErrorEvent('DATABASE_CONNECTION_ERROR');
}
```

---

## Alert Files Location

Alert data is stored in NDJSON format at:
- `restaurants-service/alerts/restaurants-service-alert-data.ndjson`
- `delivery-service/alerts/delivery-service-alert-data.ndjson`

Each line is a complete JSON object representing an alert event (fired or resolved).

---

## Future Enhancements (Not Yet Implemented)

### Rate Limiting Alerts
- Detect when rate limits are being hit
- Track requests from specific IPs
- Identify potential abuse patterns

### Memory Leak Detection
- Track memory growth over time
- Alert on continuous memory increase
- Identify potential leak sources

### Apdex Score Monitoring
- Calculate user satisfaction metrics
- Alert on degraded user experience
- Track SLA compliance

---

## Best Practices

1. **Tune Thresholds**: Adjust thresholds based on your service's normal behavior
2. **Monitor Baseline**: Let the system establish traffic baselines before relying on anomaly detection
3. **Use Hysteresis**: Alerts use hysteresis to prevent flapping (rapid fire/resolve cycles)
4. **Context Matters**: Always review the context fields to understand what was happening when the alert fired
5. **Aggregate Analysis**: Use the NDJSON files for historical analysis and pattern detection
6. **Alert Fatigue**: If alerts fire too frequently, adjust thresholds to reduce noise

---

## Integration with Monitoring Tools

The NDJSON format is compatible with:
- **Elasticsearch**: Ingest for visualization in Kibana
- **Splunk**: Direct log ingestion
- **Prometheus**: Convert to metrics with custom exporters
- **Grafana**: Query and visualize alert patterns
- **Custom Dashboards**: Parse and display in your own tools

