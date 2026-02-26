# Anomaly Detection Agent

AI-powered anomaly detection service that continuously monitors microservice logs and metrics to identify and predict abnormal behavior patterns in real-time.

## 🎯 Overview

The Anomaly Detection Agent is a hybrid Python/Node.js service that combines machine learning-based anomaly detection with a REST API for real-time incident reporting. It analyzes aggregated logs and service metrics to detect anomalous requests and generates detailed incident reports with root cause analysis.

## ✨ Key Features

### 🤖 Machine Learning Detection

- **Random Forest Model**: Pre-trained ML model for anomaly prediction
- **Multi-dimensional Analysis**: Evaluates duration, CPU, memory, database query times, and status codes
- **Severity Classification**: Automatic incident severity determination based on log levels and status codes
- **Confidence Scoring**: Provides anomaly probability scores for each prediction

### 📊 Historical Tracking

- **Timestamped Snapshots**: Saves every prediction run with timestamp
- **Automatic Archiving**: Preserves last 100 incident files automatically
- **Historical API**: Query all past incidents across time
- **Data Preservation**: Never lose anomaly data from previous runs

### 🔄 Real-time Pipeline

- **Continuous Monitoring**: Runs every 2 seconds (configurable)
- **7-Step Process**: Comprehensive data collection and analysis
- **Concurrent Execution**: Pipeline and API server run simultaneously
- **Auto-refresh**: Updates predictions and incidents continuously

### 📬 Alert System

- **Email Notifications**: Automatic incident alerts via email service
- **HTML Reports**: Rich formatted email with incident details
- **Configurable Triggers**: Set minimum incident threshold for alerts
- **Toggle Control**: Enable/disable emails via environment variable

### 🌐 REST API

- **Multiple Endpoints**: Latest incidents, historical data, predictions, and status
- **CORS Enabled**: Cross-origin requests supported
- **Health Checks**: Service monitoring endpoints
- **CSV Export**: Download predictions as CSV

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Anomaly Detection Agent                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌─────────────────────────┐   │
│  │  Pipeline (Python)│◄────────│  Real-time Data Sources │   │
│  │  - Collect logs   │         │  - Log aggregation      │   │
│  │  - Collect metrics│         │  - Service metrics      │   │
│  │  - Merge data    │         └─────────────────────────┘   │
│  │  - Predict       │                                        │
│  │  - Generate      │         ┌─────────────────────────┐   │
│  └────────┬─────────┘         │   ML Model (Random Forest)  │
│           │                   │   - Pre-trained            │
│           │                   │   - Feature engineering    │
│           └──────────────────►│   - Anomaly scoring        │
│                               └─────────────────────────┘   │
│  ┌──────────────────┐                                        │
│  │  API Server (Node)│         ┌─────────────────────────┐   │
│  │  - Express REST  │◄────────│  Outputs Directory       │   │
│  │  - CORS enabled  │         │  ├─ incidents_latest.json │   │
│  │  - Health checks │         │  ├─ predictions_latest.csv│   │
│  │  - Historical API │         │  └─ incidents/           │   │
│  └────────┬─────────┘         │     ├─ incidents_T1.json │   │
│           │                   │     ├─ incidents_T2.json │   │
│           │                   │     └─ incidents_T3.json │   │
│           │                   └─────────────────────────┘   │
│           ▼                                                  │
│  ┌──────────────────┐         ┌─────────────────────────┐   │
│  │  Email Service   │         │  Dashboard Frontend      │   │
│  │  (Notifications) │         │  (Visualization)         │   │
│  └──────────────────┘         └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### Pipeline Process (Every 2 seconds)

```
1. Sync Logs
   └─ Read aggregated logs from log-aggregation-service

2. Collect Metrics
   ├─ delivery-service/metrics/*.json
   ├─ orders-service/metrics/*.json
   ├─ restaurants-service/metrics/*.json
   └─ users-service/metrics/*.json

3. Merge Data
   └─ Combine logs + metrics by request_id

4. Clean Data
   └─ Remove duplicates, handle missing values

5. Label Data
   └─ Encode log levels, extract features

6. Predict Anomalies
   ├─ Load Random Forest model
   ├─ Generate predictions
   └─ Calculate anomaly scores

7. Generate Incidents
   ├─ Group anomalies by request_id
   ├─ Build incident narratives
   ├─ Save timestamped file (incidents/incidents_TIMESTAMP.json)
   ├─ Update latest file (incidents_latest.json)
   ├─ Auto-cleanup old files (keep last 100)
   └─ Send email alerts (if enabled)
```

### Output Structure

```
outputs/
├── incidents_latest.json          # Latest snapshot (backward compatible)
├── predictions_latest.csv         # Recent predictions with anomaly scores
└── incidents/                     # Historical archive
    ├── incidents_2026-02-26T05-50-30.json
    ├── incidents_2026-02-26T05-50-32.json
    └── incidents_2026-02-26T05-50-34.json
```

## 📡 API Endpoints

### Core Endpoints

| Method | Endpoint                                  | Description                                      |
| ------ | ----------------------------------------- | ------------------------------------------------ |
| `GET`  | `/health`                                 | Health check status                              |
| `GET`  | `/api/anomaly/incidents`                  | Latest incident snapshot                         |
| `GET`  | `/api/anomaly/incidents/history?limit=50` | Historical snapshots (default: last 50)          |
| `GET`  | `/api/anomaly/incidents/all?limit=50`     | All incidents flattened (default: last 50 files) |
| `GET`  | `/api/anomaly/status`                     | Service status and file info                     |
| `GET`  | `/api/anomaly/predictions`                | Latest predictions as JSON                       |
| `GET`  | `/api/anomaly/predictions/download`       | Download predictions CSV                         |

### Response Examples

**Latest Incidents (`/api/anomaly/incidents`)**

```json
{
  "generated_at": "2026-02-26T07:06:07.541630Z",
  "input_csv": "data/merged/logs_with_metrics_clean.csv",
  "model_path": "model_experiments/models/random_forest/rf_model.pkl",
  "total_rows": 84,
  "predicted_anomaly_count": 9,
  "predicted_normal_count": 75,
  "predicted_anomaly_request_count": 2,
  "incident_story": {
    "title": "Incident Story (Auto-Generated)",
    "summary": "2 anomalous request(s) detected. Most impacted service: orders-service.",
    "top_services": [
      ["orders-service", 1],
      ["users-service", 1]
    ],
    "top_events": [
      ["order.created", 5],
      ["user.login", 3]
    ],
    "top_status_codes": [
      ["500", 1],
      ["503", 1]
    ]
  },
  "incidents": [
    {
      "request_id": "req-abc-123",
      "service": "orders-service",
      "status_code": 500,
      "level": "error",
      "level_encoded": 3,
      "events": ["order.created", "payment.failed"],
      "reason": "duration_ms>=3000;status_code>=500",
      "row_count": 5
    }
  ]
}
```

**All Historical Incidents (`/api/anomaly/incidents/all`)**

```json
{
  "all_incidents": [
    {
      "request_id": "req-abc-123",
      "service": "orders-service",
      "status_code": 500,
      "level": "error",
      "level_encoded": 3,
      "events": ["order.created"],
      "reason": "status_code>=500",
      "detected_at": "2026-02-26T05:50:30Z",
      "source_file": "incidents_2026-02-26T05-50-30.json"
    }
  ],
  "total_count": 156,
  "files_scanned": 50,
  "total_files": 78
}
```

## 🚀 Setup & Installation

### Prerequisites

- **Python 3.8+** (for ML pipeline)
- **Node.js 16+** (for API server)
- **Docker & Docker Compose** (for containerized deployment)

### Local Development

#### 1. Install Dependencies

**Python:**

```bash
cd anomaly-detection-agent
pip install -r requirements.txt
```

**Node.js:**

```bash
npm install
```

#### 2. Verify Model & Data Paths

Ensure these exist:

```
model_experiments/models/random_forest/rf_model.pkl
data/merged/logs_with_metrics_clean.csv
```

#### 3. Run the Service

**Option A: Pipeline + API (Concurrent - Recommended)**

```bash
npm run dev:no-email
# Runs both pipeline (2s intervals) and API server on port 3007
```

**Option B: API Only**

```bash
npm run api-only
# Just the API server, uses existing output files
```

**Option C: Pipeline Once**

```bash
npm run start:once
# Run pipeline one time, then exit
```

**Option D: Pipeline with Email**

```bash
npm run dev
# Pipeline + API with email notifications enabled
```

#### 4. Test the API

```bash
# Health check
curl http://localhost:3007/health

# Latest incidents
curl http://localhost:3007/api/anomaly/incidents

# Historical incidents
curl http://localhost:3007/api/anomaly/incidents/all?limit=20
```

### Docker Deployment

#### 1. Update docker-compose.yml

The anomaly-detection-agent service is already configured:

```yaml
anomaly-detection-agent:
  build:
    context: ../anomaly-detection-agent
    dockerfile: Dockerfile
  container_name: anomaly-detection-agent
  ports:
    - "31007:3007"
  environment:
    - PORT=3007
    - PYTHONIOENCODING=utf-8
    - ANOMALY_SEND_EMAIL=0 # 0 = disabled, 1 = enabled
    - EMAIL_SERVICE_URL=http://email-service:4000/v1/email/send
    - DOCKER_ENV=true
    - RUN_PIPELINE=true # true = pipeline+API, false = API only
  volumes:
    - ../anomaly-detection-agent/outputs:/app/outputs
    - ~/temp/docker-files/log-aggregation-service/aggregated-logs:/app/log-aggregation-service/aggregated-logs:ro
    # Service metrics volumes...
  networks:
    - app-network
  restart: unless-stopped
```

#### 2. Build & Start

```bash
cd docker
docker-compose up --build -d anomaly-detection-agent
```

#### 3. Verify

```bash
# Check logs
docker logs -f anomaly-detection-agent

# Check historical files
docker exec anomaly-detection-agent ls -la outputs/incidents/

# Test API (via nginx gateway)
curl http://localhost:31000/api/anomaly/incidents
```

#### 4. Access via Nginx Gateway

The service is accessible through the nginx gateway on port 31000:

```
http://localhost:31000/api/anomaly/incidents
http://localhost:31000/api/anomaly/status
```

## ⚙️ Configuration

### Environment Variables

| Variable             | Default                               | Description                       |
| -------------------- | ------------------------------------- | --------------------------------- |
| `PORT`               | `3007`                                | API server port                   |
| `PYTHONIOENCODING`   | `utf-8`                               | Python encoding                   |
| `ANOMALY_SEND_EMAIL` | `1`                                   | Enable email alerts (0=off, 1=on) |
| `EMAIL_SERVICE_URL`  | `http://localhost:4000/v1/email/send` | Email service endpoint            |
| `DOCKER_ENV`         | `false`                               | Docker environment flag           |
| `RUN_PIPELINE`       | `true`                                | Run pipeline+API or API only      |

### Pipeline Configuration

Edit `run_realtime_pipeline.py`:

```python
# Interval between runs (seconds)
--interval 2

# Run once and exit
--once

# Custom model path
--model path/to/model.pkl
```

### Threshold Configuration

Edit `rf_predict_incidents.py`:

```python
# Email alert threshold
MIN_INCIDENTS_TO_EMAIL = 1  # Send email if >= 1 incident

# Anomaly thresholds
DURATION_THRESHOLD = 3000    # milliseconds
CPU_THRESHOLD = 80           # percent
DB_THRESHOLD = 300           # milliseconds
STATUS_THRESHOLD = 500       # HTTP status code

# History retention
KEEP_HISTORICAL_FILES = 100  # Number of timestamped files to keep
```

## 📊 Integration with Dashboard

The service integrates with the Observability Dashboard Frontend:

```
http://localhost:3010/anomalies          # Local dev
http://localhost:30011/anomalies         # Docker
```

### Dashboard Features

- **View Mode Toggle**: Switch between "Latest Snapshot" and "All Historical"
- **Filtering**: By severity (high/medium/low) and service
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Visualizations**: Trend charts, service impact, root cause analysis
- **Incident Timeline**: Shows detection timestamp for each anomaly

## 📝 NPM Scripts

| Script           | Command                                                | Description                   |
| ---------------- | ------------------------------------------------------ | ----------------------------- |
| `start`          | `python scripts/run_realtime_pipeline.py --once`       | Run pipeline once             |
| `start:watch`    | `python scripts/run_realtime_pipeline.py --interval 2` | Pipeline with 2s intervals    |
| `start:no-email` | `ANOMALY_SEND_EMAIL=0 python scripts/...`              | Pipeline without emails       |
| `api`            | `node api-server.js`                                   | Start API server only         |
| `api:stop`       | PowerShell stop command                                | Stop API server on port 3007  |
| `dev`            | `concurrently "npm run start:watch" "npm run api"`     | Pipeline + API with emails    |
| `dev:no-email`   | `concurrently "npm run start:no-email" "npm run api"`  | Pipeline + API without emails |
| `api-only`       | `node api-server.js`                                   | API server only               |

## 🧪 Testing

### Manual Testing

```bash
# Generate test data
cd anomaly-detection-agent
npm run start:once

# Check outputs
ls -la outputs/
ls -la outputs/incidents/

# Test API endpoints
curl http://localhost:3007/health
curl http://localhost:3007/api/anomaly/status
curl http://localhost:3007/api/anomaly/incidents/all?limit=10
```

### Expected Output

**Console logs:**

```
[DEBUG] Environment: Local
[DEBUG] Input CSV: data/merged/logs_with_metrics_clean.csv
✅ Loaded rows: 84
🚨 Predicted anomalies: 9
🟢 Predicted normals: 75
📁 Saved predictions CSV: outputs/predictions_latest.csv
✅ Saved timestamped: outputs/incidents/incidents_2026-02-26T07-06-07.json
✅ Updated latest: outputs/incidents_latest.json
ℹ️ No email sent (no incidents)
```

## 🔧 Troubleshooting

### Issue: No incidents generated

**Check:**

1. Verify input CSV has data: `cat data/merged/logs_with_metrics_clean.csv`
2. Check model exists: `ls model_experiments/models/random_forest/rf_model.pkl`
3. Run pipeline once: `npm run start:once`

### Issue: API returns 404

**Check:**

1. Ensure outputs directory exists: `mkdir -p outputs/incidents`
2. Run pipeline to generate data: `npm run start:once`
3. Verify files exist: `ls outputs/incidents_latest.json`

### Issue: Historical incidents not showing

**Check:**

1. Verify incidents directory: `ls outputs/incidents/`
2. Check API endpoint: `curl http://localhost:3007/api/anomaly/incidents/all`
3. Ensure pipeline has run multiple times

### Issue: Docker volume mount issues

**Check:**

```bash
# Inspect volumes
docker inspect anomaly-detection-agent | grep Mounts -A 20

# Verify permissions
docker exec anomaly-detection-agent ls -la /app/outputs
```

## 📚 Dependencies

### Python

- `pandas` - Data manipulation
- `scikit-learn` / `joblib` - ML model loading
- `requests` - HTTP client for email service

### Node.js

- `express` - Web framework
- `concurrently` - Run multiple commands
- `cross-env` - Cross-platform environment variables

## 📄 File Structure

```
anomaly-detection-agent/
├── api-server.js                 # Express API server
├── Dockerfile                    # Container definition
├── package.json                  # Node.js dependencies
├── requirements.txt              # Python dependencies
├── README.md                     # This file
├── scripts/
│   ├── run_realtime_pipeline.py  # Pipeline orchestrator
│   ├── rf_predict_incidents.py   # ML prediction + incident generation
│   ├── sync_aggregated_logs.py   # Log collection
│   ├── collect_service_metrics.py # Metrics collection
│   ├── merge_logs_metrics.py     # Data merging
│   ├── clean_merged_data.py      # Data cleaning
│   └── label_events_levels.py    # Feature engineering
├── model_experiments/
│   └── models/random_forest/
│       └── rf_model.pkl          # Pre-trained ML model
├── data/
│   └── merged/                   # Processed data
├── outputs/
│   ├── incidents_latest.json     # Latest snapshot
│   ├── predictions_latest.csv    # Latest predictions
│   └── incidents/                # Historical archive
└── wait-for-ml.js                # Startup health check
```

## 🤝 Contributing

This service is part of a larger observability platform. When making changes:

1. Maintain backward compatibility with existing APIs
2. Update tests for new features
3. Document configuration changes
4. Test both local and Docker deployments

## 📞 Support

For issues or questions:

- Check logs: `docker logs anomaly-detection-agent`
- Verify health: `curl http://localhost:3007/health`
- Review configuration in `docker-compose.yml`

## 📜 License

Part of the nodejs-springboot-observabilitydata-collection-app project.

---

**Built with ❤️ for microservice observability**
