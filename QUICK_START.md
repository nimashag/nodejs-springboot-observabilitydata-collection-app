# Quick Start Guide - Alert Data Collection System

This guide will get you up and running with the alert data collection system in 5 minutes.

---

## Prerequisites

- Node.js 18+ installed
- Java 17+ installed
- Maven installed
- MongoDB running (for services to work)

---

## Step 1: Install Dependencies

### Install Node.js service dependencies

```bash
# Delivery Service
cd delivery-service
npm install
cd ..

# Orders Service
cd orders-service
npm install
cd ..

# Restaurants Service
cd restaurants-service
npm install
cd ..

# Alert Data Collector
cd alert-agent-data-collect-service
npm install
cd ..
```

### Java service dependencies are managed by Maven (no separate install needed)

---

## Step 2: Build Services

### Build Node.js services

```bash
# Delivery Service
cd delivery-service && npm run build && cd ..

# Orders Service
cd orders-service && npm run build && cd ..

# Restaurants Service
cd restaurants-service && npm run build && cd ..

# Alert Data Collector
cd alert-agent-data-collect-service && npm run build && cd ..
```

### Build Java service

```bash
cd users-service
mvn clean package
cd ..
```

---

## Step 3: Start Services

Open 4 separate terminal windows:

### Terminal 1 - Delivery Service
```bash
cd delivery-service
npm run dev
```

### Terminal 2 - Orders Service
```bash
cd orders-service
npm run dev
```

### Terminal 3 - Restaurants Service
```bash
cd restaurants-service
npm run dev
```

### Terminal 4 - Users Service
```bash
cd users-service
mvn spring-boot:run
```

**Look for this message in each service:**
```
[Alert Collector] Initialized for <service-name>
```

---

## Step 4: Generate Traffic (Trigger Alerts)

### Option A: Use your existing frontend/API client

If you have a frontend or API client, use it to generate traffic.

### Option B: Use curl to generate test traffic

```bash
# Example: Send requests to services
curl http://localhost:3000/api/delivery
curl http://localhost:3001/api/orders
curl http://localhost:3002/api/restaurants
curl http://localhost:8080/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'
```

### Option C: Generate errors to trigger alerts

Send invalid requests to trigger error burst alerts:

```bash
# Send multiple invalid requests quickly
for i in {1..10}; do
  curl http://localhost:3001/api/orders/invalid-id-$i
done
```

---

## Step 5: Verify Alert Data Files

After generating traffic, check that alert data files are being created:

```bash
# Check Node.js services
ls -la delivery-service/logs/alert/
ls -la orders-service/logs/alert/
ls -la restaurants-service/logs/alert/

# Check Java service
ls -la users-service/logs/alert/
```

You should see files like:
- `delivery-service-alert-data.ndjson`
- `orders-service-alert-data.ndjson`
- `restaurants-service-alert-data.ndjson`
- `users-service-alert-data.ndjson`

### View alert data

```bash
# View delivery service alerts
cat delivery-service/logs/alert/delivery-service-alert-data.ndjson
```

---

## Step 6: Run Central Alert Data Collector

Once services have generated alert data:

```bash
cd alert-agent-data-collect-service
npm start
```

You should see output like:

```
============================================================
Alert Agent Data Collection Service
Collecting alert data for AATA (Adaptive Alert Tuning Agent)
============================================================

[Collector] Starting alert data collection...
[Collector] Read 5 alert events from delivery-service
[Collector] Read 8 alert events from orders-service
[Collector] Read 3 alert events from restaurants-service
[Collector] Read 6 alert events from users-service
[Collector] Total alerts collected: 22
[Collector] Combined alert history written to: .../output/combined-alert-history.json
[Collector] Summary written to: .../output/alert-summary.json

============================================================
COLLECTION SUMMARY
============================================================
Total Alerts: 22

Alerts by Service:
  - delivery-service: 5
  - orders-service: 8
  - restaurants-service: 3
  - users-service: 6

Alerts by Type:
  - error: 10
  - latency: 7
  - availability: 5

Alerts by Severity:
  - low: 6
  - medium: 9
  - high: 7

Alerts by State:
  - fired: 11
  - resolved: 11

============================================================
Collection complete!
Output files:
  - .../alert-agent-data-collect-service/output/combined-alert-history.json
  - .../alert-agent-data-collect-service/output/alert-summary.json
============================================================
```

---

## Step 7: View Combined Alert Data

```bash
# View combined alert history
cat alert-agent-data-collect-service/output/combined-alert-history.json

# View summary
cat alert-agent-data-collect-service/output/alert-summary.json
```

---

## What's Happening?

### In Each Service:

1. **Alert Detector** monitors all HTTP requests
2. **Detects alert conditions**:
   - Error Burst: 5+ errors in 1 minute
   - High Latency: 3 consecutive slow requests (>3s)
   - Availability Issue: 50%+ error rate
3. **Records alert events** to local NDJSON file with:
   - Alert metadata (name, type, state, severity)
   - Runtime context (request count, error count, CPU, memory)

### In Central Collector:

1. **Reads** all service alert data files
2. **Normalizes** data across Node.js and Java services
3. **Merges** into unified dataset
4. **Generates** combined history and summary

---

## Alert Detection Frequency

- **Immediate**: After every HTTP request
- **Periodic**: Every 30 seconds (background check)

---

## Troubleshooting

### No alert data files generated

**Problem**: Services haven't detected any alert conditions yet.

**Solution**: Generate more traffic, especially error conditions:
```bash
# Generate error burst
for i in {1..10}; do curl http://localhost:3001/api/orders/invalid-$i; done
```

### Alert collector shows "No alert data found"

**Problem**: Services haven't created alert files yet.

**Solution**: 
1. Verify services are running
2. Generate traffic to trigger alerts
3. Wait 30 seconds for periodic check
4. Check logs/alert/ directories exist

### Service won't start

**Problem**: Port already in use or dependencies missing.

**Solution**:
1. Check if MongoDB is running
2. Check if ports are available
3. Run `npm install` or `mvn clean install`

---

## Next Steps

1. **Generate more traffic** to collect diverse alert data
2. **Run collector periodically** to aggregate latest alerts
3. **Analyze combined-alert-history.json** for patterns
4. **Use data for AATA** (Adaptive Alert Tuning Agent) in the future

---

## File Locations Reference

### Service Alert Data Files
```
delivery-service/logs/alert/delivery-service-alert-data.ndjson
orders-service/logs/alert/orders-service-alert-data.ndjson
restaurants-service/logs/alert/restaurants-service-alert-data.ndjson
users-service/logs/alert/users-service-alert-data.ndjson
```

### Combined Output Files
```
alert-agent-data-collect-service/output/combined-alert-history.json
alert-agent-data-collect-service/output/alert-summary.json
```

---

## Important Notes

✅ **This system collects ALERT DATA ONLY**  
✅ **NO OpenTelemetry, NO Prometheus**  
✅ **NO modification to logger.ts files**  
✅ **NO alert tuning or ML**  
✅ **Services are independent** - no inter-service communication  

---

## For More Information

- **Detailed Guide**: See `ALERT_DATA_COLLECTION_GUIDE.md`
- **Example Data**: See `EXAMPLE_ALERT_DATA.md`
- **Central Collector**: See `alert-agent-data-collect-service/README.md`

---

## Quick Command Reference

```bash
# Start all services (in separate terminals)
cd delivery-service && npm run dev
cd orders-service && npm run dev
cd restaurants-service && npm run dev
cd users-service && mvn spring-boot:run

# Generate test traffic
curl http://localhost:3000/api/delivery
curl http://localhost:3001/api/orders
curl http://localhost:3002/api/restaurants

# Run alert data collector
cd alert-agent-data-collect-service && npm start

# View results
cat alert-agent-data-collect-service/output/combined-alert-history.json
cat alert-agent-data-collect-service/output/alert-summary.json
```

---

**You're all set! The alert data collection system is now running and collecting data for AATA.**

