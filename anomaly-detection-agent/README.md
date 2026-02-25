# Anomaly Detection Agent

AI-powered anomaly detection service that monitors logs and metrics from microservices to detect and alert on unusual behavior using machine learning.

## 🎯 What It Does

The anomaly detection agent:

1. Collects aggregated logs from log-aggregation-service
2. Collects metrics from microservices (orders, restaurants, delivery, users)
3. Merges logs with metrics by request ID
4. Uses a trained Random Forest model to detect anomalies
5. Outputs predictions and detected incidents
6. Sends email alerts for critical incidents (optional)

## 📋 Prerequisites

### Required

- **Python 3.8+** installed and added to PATH
- **Node.js & npm** for running scripts
- **Running services:**
  - `log-aggregation-service` - Provides aggregated logs
  - Microservices: `orders-service`, `restaurants-service`, `delivery-service`, `users-service`

### Optional

- **email-service** - For sending incident alerts (port 4000)

## 🚀 Quick Start

### 1. Setup Virtual Environment

**Windows (PowerShell):**

```powershell
# Navigate to service directory
cd anomaly-detection-agent

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# If you get execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Windows (Command Prompt):**

```cmd
cd anomaly-detection-agent
python -m venv .venv
.venv\Scripts\activate.bat
```

**Linux/Mac:**

```bash
cd anomaly-detection-agent
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies

**Install Python dependencies:**

```bash
pip install -r requirements.txt
```

**What gets installed:**

- `pandas` - Data processing
- `scikit-learn` - Machine learning
- `joblib` - Model serialization
- `requests` - HTTP requests

**Install Node.js dependencies (for API server):**

```bash
npm install
```

**What gets installed:**

- `express` - Web framework for API server
- `cors` - Cross-origin resource sharing
- `nodemon` - Auto-reload for development

### 3. Verify Setup

Run the pre-flight check to ensure everything is configured:

```bash
python scripts/preflight_check.py
```

This will verify:

- Python version
- Required packages
- Trained model exists
- Data directories
- Data sources available
- Email service status

### 4. Run the Service

**Run once (for testing):**

```bash
npm start
# or
npm run start:once
```

**Run continuously (every 2 seconds):**

```bash
npm run start:watch
```

**Run without email alerts:**

```bash
npm run start:no-email
```

## 📦 Available Commands

```bash
# Detection Pipeline Commands
npm start              # Run pipeline once and exit
npm run start:once     # Same as npm start
npm run start:watch    # Run continuously every 2 seconds
npm run start:no-email # Run continuously without sending emails

# API Server Commands
npm run api            # Start REST API server on port 3007
npm run api:dev        # Start API server with auto-reload (nodemon)

# Utility Commands
npm run preflight      # Check system requirements
npm run collect:logs   # Only collect logs
npm run collect:metrics # Only collect metrics
npm run merge          # Only merge logs and metrics
npm run predict        # Only run predictions
npm run train          # Train the Random Forest model
```

## 🌐 REST API Server

The service includes a REST API server that exposes incident and prediction data to other services (like the observability dashboard).

### Starting the API Server

**Run in production mode:**

```bash
npm run api
```

**Run in development mode (with auto-reload):**

```bash
npm run api:dev
```

The API server runs on **port 3007** by default.

### API Endpoints

#### GET /api/incidents

Returns the latest detected incidents.

**Response:**

```json
{
  "incidents": [
    {
      "request_id": "abc123",
      "service": "orders-service",
      "events": ["order.created"],
      "timestamp": "2026-02-25T10:30:00Z"
    }
  ],
  "story": {
    "title": "5 anomalies detected",
    "summary": "Multiple services showing unusual behavior",
    "top_services": ["orders-service"],
    "top_events": ["order.created"]
  },
  "total_incidents": 5,
  "last_updated": "2026-02-25T10:35:00Z"
}
```

#### GET /api/predictions

Returns predictions summary.

**Response:**

```json
{
  "available": true,
  "total_predictions": 150,
  "anomalies_detected": 5,
  "last_updated": "2026-02-25T10:35:00Z"
}
```

#### GET /api/predictions/download

Download the predictions CSV file.

#### GET /api/status

Returns service status and file availability.

**Response:**

```json
{
  "service": "anomaly-detection-agent",
  "status": "running",
  "port": 3007,
  "outputs": {
    "incidents": {
      "available": true,
      "size": 2048
    },
    "predictions": {
      "available": true,
      "size": 4096
    }
  }
}
```

#### GET /health

Health check endpoint.

### Running Detection + API Together

For full functionality, run both the detection pipeline and API server:

**Terminal 1 - API Server:**

```bash
npm run api
```

**Terminal 2 - Detection Pipeline:**

```bash
npm run start:watch
```

This setup:

- API serves existing incident data immediately
- Pipeline continuously updates the data
- Frontend can fetch latest incidents via API

## 🔧 Configuration

### Environment Variables

- `ANOMALY_SEND_EMAIL` - Set to `0` to disable email alerts (default: `1`)

**Examples:**

```powershell
# PowerShell
$env:ANOMALY_SEND_EMAIL="0"
npm start

# Command Prompt
set ANOMALY_SEND_EMAIL=0
npm start
```

### Custom Model Path

```bash
python scripts/run_realtime_pipeline.py --model path/to/custom_model.pkl --once
```

### Custom Interval

```bash
python scripts/run_realtime_pipeline.py --interval 5 --once
```

## 📊 Pipeline Workflow

```
┌─────────────────────────────────────────────────────┐
│              Anomaly Detection Pipeline             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Collect Logs                                    │
│     ↓                                               │
│     data/raw/logs/*.jsonl                           │
│                                                     │
│  2. Collect Metrics                                 │
│     ↓                                               │
│     data/raw/metrics/combined_metrics.jsonl         │
│                                                     │
│  3. Parse & Filter Logs                             │
│     ↓                                               │
│     data/csv/log-requests.csv                       │
│                                                     │
│  4. Merge Logs + Metrics                            │
│     ↓                                               │
│     data/merged/logs_with_metrics.csv               │
│                                                     │
│  5. Clean Data                                      │
│     ↓                                               │
│     data/merged/logs_with_metrics_clean.csv         │
│                                                     │
│  6. Threshold Labeling (optional)                   │
│     ↓                                               │
│     data/merged/logs_with_metrics_clean.csv         │
│                                                     │
│  7. Predict Anomalies (Random Forest)               │
│     ↓                                               │
│     outputs/predictions_latest.csv                  │
│     outputs/incidents_latest.json                   │
│                                                     │
│  8. Send Email Alerts (if incidents detected)       │
│     ↓                                               │
│     Email Service → Recipients                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 📁 Output Files

After running the pipeline, check these files:

### predictions_latest.csv

```
outputs/predictions_latest.csv
```

Contains all predictions with anomaly scores for each request.

**Columns:**

- `request_id` - Unique request identifier
- `anomaly` - Binary flag (0=normal, 1=anomaly)
- `probability` - Confidence score
- `service` - Service name
- `event` - Event type
- `status_code` - HTTP status code
- `duration_ms` - Request duration
- Additional metrics...

### incidents_latest.json

```
outputs/incidents_latest.json
```

Contains grouped incidents with context and metadata.

**Structure:**

```json
{
  "story": {
    "title": "Incident Summary",
    "summary": "Description of detected anomalies",
    "top_services": ["service1", "service2"],
    "top_events": ["event1", "event2"]
  },
  "incidents": [
    {
      "request_id": "abc123",
      "service": "orders-service",
      "events": ["order.created", "payment.processed"],
      "timestamp": "2026-02-25T10:30:00Z",
      "metrics": { ... }
    }
  ]
}
```

## 🔍 Troubleshooting

### Issue: Python not found

**Error:**

```
Python was not found; run without arguments to install from the Microsoft Store
```

**Solution:**

1. Install Python from [python.org](https://python.org)
2. During installation, check "Add Python to PATH"
3. Restart your terminal
4. Verify: `python --version`

### Issue: Module not found

**Error:**

```
ModuleNotFoundError: No module named 'pandas'
```

**Solution:**

```bash
# Make sure virtual environment is activated (you should see (.venv) in prompt)
pip install -r requirements.txt
```

### Issue: Model file not found

**Error:**

```
FileNotFoundError: model_experiments/models/random_forest/rf_model.pkl
```

**Solution:**
Train the model first:

```bash
python scripts/model_training/train_random_forest_classifier.py
```

### Issue: No logs or metrics found

**Error:**
Pipeline completes but no incidents detected or errors about missing files.

**Solution:**

1. Ensure required services are running:

   ```bash
   # In separate terminals
   cd ../log-aggregation-service && npm start
   cd ../orders-service && npm start
   cd ../restaurants-service && npm start
   cd ../delivery-service && npm start
   cd ../users-service && npm start
   ```

2. Generate some traffic to the services
3. Wait for logs to be aggregated
4. Run the anomaly detection agent again

### Issue: Email service connection failed

**Error:**

```
Connection refused to localhost:4000
```

**Solutions:**

**Option A:** Disable email alerts

```bash
npm run start:no-email
```

**Option B:** Start email service

```bash
cd ../email-service
# Configure .env file with email credentials first
npm start
```

### Issue: Virtual environment activation fails (PowerShell)

**Error:**

```
cannot be loaded because running scripts is disabled
```

**Solution:**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate again:

```powershell
.\.venv\Scripts\Activate.ps1
```

## 🧪 Training a New Model

If you need to retrain the model with new data:

### 1. Prepare Training Data

Ensure you have labeled data in:

```
data/merged/logs_with_metrics_only_matches_labeled_custom.csv
```

### 2. Train the Model

```bash
python scripts/model_training/train_random_forest_classifier.py
```

This creates:

```
model_experiments/models/random_forest/rf_model.pkl
```

### 3. Test the Model (Optional)

```bash
python scripts/model_training/test_random_forest_classifier.py
```

## 📊 Model Information

**Algorithm:** Random Forest Classifier

**Features Used:**

- `duration_ms` - Request duration
- `cpu_percent` - CPU usage
- `memory_mb` - Memory usage
- `db_query_time_ms` - Database query time
- `status_code` - HTTP status code
- `level` - Log level (encoded)

**Output:** Binary classification (0=normal, 1=anomaly)

## 🔐 Security Notes

- Never commit `.env` files
- Keep model files secure (they contain business logic)
- Monitor email service credentials
- Review incident reports before taking action

## 📝 Development

### Project Structure

```
anomaly-detection-agent/
├── data/                      # Data files
│   ├── raw/                  # Raw logs and metrics
│   ├── processed/            # Processed data
│   ├── merged/               # Merged logs + metrics
│   ├── csv/                  # CSV outputs
│   └── metrics/              # Metrics data
├── model_experiments/         # Model training experiments
│   └── models/
│       └── random_forest/
│           └── rf_model.pkl  # Trained model
├── outputs/                   # Prediction outputs
│   ├── predictions_latest.csv
│   └── incidents_latest.json
├── scripts/                   # Python scripts
│   ├── run_realtime_pipeline.py
│   ├── collect_logs_from_aggregation.py
│   ├── collect_metrics_from_services.py
│   ├── merge_logs_and_metrics.py
│   ├── rf_predict_incidents.py
│   ├── preflight_check.py
│   └── model_training/       # Training scripts
├── package.json              # npm scripts
├── requirements.txt          # Python dependencies
└── README.md                 # This file
```

### Adding Custom Scripts

Add scripts to `package.json`:

```json
{
  "scripts": {
    "my-script": "python scripts/my_custom_script.py"
  }
}
```

Then run:

```bash
npm run my-script
```

## 🤝 Integration

### With Other Services

The anomaly detection agent integrates with:

1. **log-aggregation-service** - Reads from `aggregated-logs/` directory
2. **Microservices** - Reads `metrics/metrics.jsonl` from each service
3. **email-service** - Sends POST requests to `/v1/email/send`

### API Format

When sending emails, uses this format:

```javascript
POST http://localhost:4000/v1/email/send
Content-Type: application/json

{
  "subject": "🚨 [INCIDENT] 5 anomalies detected",
  "text": "Plain text version",
  "html": "<h1>HTML formatted incident report</h1>"
}
```

## 📈 Performance

- **Processing time:** ~1-5 seconds per cycle (depends on data volume)
- **Memory usage:** ~100-500 MB
- **Model inference:** ~50-200ms
- **Recommended interval:** 2-10 seconds

## 📚 Additional Resources

- **Complete Setup Guide:** [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed troubleshooting
- **Email Service:** [../email-service/README.md](../email-service/README.md) - Email configuration

## 🐛 Known Issues

1. **Python 3.9 Type Hints:** Ensure `from __future__ import annotations` is in scripts using `str | None` syntax
2. **Windows Path Issues:** Use `python` not `python3` on Windows
3. **Large Log Files:** Processing may be slow with >10MB log files

## 📄 License

Private - Part of nodejs-springboot-observabilitydata-collection-app project

## 👥 Support

For issues or questions:

1. Run `python scripts/preflight_check.py` first
2. Check this README and SETUP_GUIDE.md
3. Verify all prerequisite services are running
4. Check console output for specific error messages

---

**Last Updated:** February 25, 2026  
**Version:** 1.0.0
