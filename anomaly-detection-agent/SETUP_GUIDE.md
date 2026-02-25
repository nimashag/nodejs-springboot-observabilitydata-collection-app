# Anomaly Detection Agent - Setup & Run Guide

## Overview

The anomaly detection agent monitors logs and metrics from microservices to detect anomalous behavior using machine learning (Random Forest classifier).

## Prerequisites

### 1. Python Installation

- **Python 3.8+** required
- Verify installation:
  ```bash
  python --version
  # or
  python3 --version
  ```

### 2. Required Services Running

The agent needs these services to collect data:

- **log-aggregation-service** - Provides aggregated logs
- **orders-service** - Microservice with metrics
- **restaurants-service** - Microservice with metrics
- **delivery-service** - Microservice with metrics
- **users-service** - Microservice with metrics
- **email-service** (optional) - Sends incident alerts (runs on port 4000)

### 3. Data Requirements

The agent expects:

- Aggregated logs in: `../log-aggregation-service/aggregated-logs/*.jsonl`
- Service metrics in: `../{service-name}/metrics/metrics.jsonl`

---

## Setup Steps

### Step 1: Create Python Virtual Environment

**On Windows (PowerShell):**

```powershell
cd anomaly-detection-agent
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**On Windows (Command Prompt):**

```cmd
cd anomaly-detection-agent
python -m venv .venv
.venv\Scripts\activate.bat
```

**On Linux/Mac:**

```bash
cd anomaly-detection-agent
python3 -m venv .venv
source .venv/bin/activate
```

**Troubleshooting venv creation:**

- If `python3 -m venv .venv` fails on Windows, use `python -m venv .venv`
- Ensure Python is installed and added to PATH
- Try running as Administrator if permission errors occur

### Step 2: Install Python Dependencies

```bash
pip install --upgrade pip
pip install pandas scikit-learn joblib requests
```

**Required packages:**

- `pandas` - Data manipulation and CSV processing
- `scikit-learn` - Machine learning models
- `joblib` - Model serialization
- `requests` - HTTP requests to email service

**Save dependencies (optional):**

```bash
pip freeze > requirements.txt
```

### Step 3: Verify Model Exists

Check that the trained model is present:

```bash
# Windows PowerShell
Test-Path "model_experiments\models\random_forest\rf_model.pkl"

# Linux/Mac/Git Bash
ls -la model_experiments/models/random_forest/rf_model.pkl
```

If the model doesn't exist, you need to train it first (see Training section below).

### Step 4: Verify Directory Structure

Ensure these directories exist:

```
anomaly-detection-agent/
├── data/
│   ├── raw/
│   │   ├── logs/          # Collected from log-aggregation-service
│   │   └── metrics/       # Collected from microservices
│   ├── processed/
│   ├── merged/
│   └── metrics/
├── outputs/               # Will store predictions
├── models/
└── scripts/
```

The pipeline will create missing directories automatically.

---

## Running the Service

### Method 1: Run Once (Recommended for Testing)

```bash
npm start
# or
npm run start:once
# or
python scripts/run_realtime_pipeline.py --once
```

This runs the pipeline once and exits. Good for:

- Initial testing
- Debugging issues
- Manual checks

### Method 2: Continuous Monitoring (Watch Mode)

```bash
npm run start:watch
# or
python scripts/run_realtime_pipeline.py --interval 2
```

This runs the pipeline every 2 seconds continuously.

### Method 3: Without Email Alerts

```bash
npm run start:no-email
# or
set ANOMALY_SEND_EMAIL=0 && python scripts/run_realtime_pipeline.py --interval 2
```

### Method 4: Custom Options

```bash
python scripts/run_realtime_pipeline.py \
  --interval 5 \
  --model model_experiments/models/random_forest/rf_model.pkl \
  --no-threshold-label
```

**Options:**

- `--once` - Run once and exit
- `--interval N` - Loop interval in seconds (default: 2)
- `--model PATH` - Path to trained model (default: model_experiments/models/random_forest/rf_model.pkl)
- `--no-threshold-label` - Skip threshold labeling step

---

## Pipeline Steps Explained

When you run the service, it executes these steps:

1. **Collect Logs** (`collect_logs_from_aggregation.py`)
   - Syncs logs from `log-aggregation-service/aggregated-logs/`
   - Copies to `data/raw/logs/`

2. **Collect Metrics** (`collect_metrics_from_services.py`)
   - Reads `metrics.jsonl` from each microservice
   - Combines into `data/raw/metrics/combined_metrics.jsonl`

3. **Parse Logs** (`jsonl_to_csv_filtered.py`)
   - Converts JSONL logs to CSV format
   - Outputs to `data/processed/logs.csv`

4. **Merge Logs + Metrics** (`merge_logs_and_metrics.py`)
   - Joins logs with metrics by request_id
   - Creates `data/merged/logs_with_metrics.csv`

5. **Clean Data** (`drop_log_duration.py`)
   - Removes duplicate duration column
   - Creates `data/merged/logs_with_metrics_clean.csv`

6. **Threshold Labeling** (optional - `threshold_label.py`)
   - Labels data based on thresholds

7. **Predict Incidents** (`rf_predict_incidents.py`)
   - Uses trained Random Forest model
   - Outputs:
     - `outputs/predictions_latest.csv` - All predictions
     - `outputs/incidents_latest.json` - Detected incidents
   - Sends email alerts if incidents found (when email service running)

---

## Common Issues & Solutions

### Issue 1: Virtual Environment Creation Fails

**Error:** `python3: command not found` or `Access denied`

**Solutions:**

- Use `python` instead of `python3` on Windows
- Install Python from python.org if not installed
- Run PowerShell/CMD as Administrator
- Check Python is in PATH: `echo $env:PATH` (PowerShell) or `echo %PATH%` (CMD)

### Issue 2: Module Import Errors

**Error:** `ModuleNotFoundError: No module named 'pandas'`

**Solution:**

```bash
# Ensure virtual environment is activated (you should see (.venv) in prompt)
pip install pandas scikit-learn joblib requests
```

### Issue 3: Model File Not Found

**Error:** `FileNotFoundError: model_experiments/models/random_forest/rf_model.pkl`

**Solution:**
Train the model first:

```bash
python scripts/model_training/train_random_forest_classifier.py
```

### Issue 4: No Logs/Metrics Found

**Error:** Pipeline completes but no incidents detected

**Causes:**

- Services not running
- No data in log-aggregation-service
- No metrics.jsonl files in service directories

**Solution:**

1. Start required services first (see Prerequisites)
2. Verify logs exist: `ls ../log-aggregation-service/aggregated-logs/`
3. Verify metrics exist: `ls ../orders-service/metrics/metrics.jsonl`
4. Generate some traffic to services first

### Issue 5: Email Service Connection Fails

**Error:** `Connection refused to localhost:4000`

**Solutions:**

- Start email-service: `cd ../email-service && npm start`
- Or disable email: `export ANOMALY_SEND_EMAIL=0` (Linux/Mac) or `set ANOMALY_SEND_EMAIL=0` (Windows)

### Issue 6: Permission Errors on Windows

**Error:** `Cannot be loaded because running scripts is disabled`

**Solution (PowerShell):**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate venv again.

---

## Training the Model (If Needed)

If the model doesn't exist or you want to retrain:

### Step 1: Prepare Training Data

Ensure you have labeled data in:

- `data/merged/logs_with_metrics_only_matches_labeled_custom.csv`
- Or use existing test data in `data/test/`

### Step 2: Train Random Forest Model

```bash
python scripts/model_training/train_random_forest_classifier.py
```

This creates: `model_experiments/models/random_forest/rf_model.pkl`

### Step 3: Test Model (Optional)

```bash
python scripts/model_training/test_random_forest_classifier.py
```

---

## Verify Installation

Run this checklist:

```bash
# 1. Check Python
python --version  # Should be 3.8+

# 2. Check virtual environment is activated
# You should see (.venv) in your prompt

# 3. Check packages installed
pip list | grep pandas
pip list | grep scikit-learn
pip list | grep joblib
pip list | grep requests

# 4. Check model exists (Windows)
dir model_experiments\models\random_forest\rf_model.pkl

# 5. Check data directories exist
dir data\raw\logs
dir data\raw\metrics

# 6. Run once to test
npm run start:once
```

---

## Quick Start Command Sequence

**Windows (PowerShell):**

```powershell
cd c:\Users\User\Desktop\Research-Project\nodejs-springboot-observabilitydata-collection-app\anomaly-detection-agent

# Create and activate venv
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install pandas scikit-learn joblib requests

# Run once to test
npm run start:once

# If successful, run continuously
npm run start:watch
```

**Linux/Mac:**

```bash
cd anomaly-detection-agent

# Create and activate venv
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install pandas scikit-learn joblib requests

# Run once to test
npm run start:once

# If successful, run continuously
npm run start:watch
```

---

## Output Files

After running, check these outputs:

1. **`outputs/predictions_latest.csv`**
   - All predictions with anomaly scores
   - Columns: request_id, anomaly (0/1), confidence, etc.

2. **`outputs/incidents_latest.json`**
   - Grouped incidents by request_id
   - Includes affected services, events, timing

3. **Console Output**
   - Shows pipeline progress
   - Displays number of incidents found
   - Shows email status if enabled

---

## Environment Variables

- `ANOMALY_SEND_EMAIL` - Set to `0` to disable email alerts (default: `1`)

---

## Additional Scripts

Run individual pipeline steps for debugging:

```bash
# Just collect logs
python scripts/collect_logs_from_aggregation.py

# Just collect metrics
python scripts/collect_metrics_from_services.py

# Convert logs to CSV
python scripts/jsonl_to_csv_filtered.py

# Merge logs and metrics
python scripts/merge_logs_and_metrics.py

# Run prediction on specific file
python scripts/rf_predict_incidents.py data/merged/logs_with_metrics_clean.csv model_experiments/models/random_forest/rf_model.pkl
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│       Anomaly Detection Pipeline                │
│                                                 │
│  1. Collect Logs ──────────► data/raw/logs/    │
│  2. Collect Metrics ───────► data/raw/metrics/ │
│  3. Parse & Filter ────────► data/processed/   │
│  4. Merge ─────────────────► data/merged/      │
│  5. Predict (RF Model) ────► outputs/          │
│  6. Send Email (optional) ─► Email Service     │
└─────────────────────────────────────────────────┘
```

---

## Support

For issues:

1. Check error logs in console output
2. Verify all prerequisites are met
3. Run with `--once` flag first to debug
4. Check that source services are running and producing data
5. Review individual script outputs in `data/` folders

---

## Performance Notes

- Default interval: 2 seconds (adjustable with `--interval`)
- Processes all available logs/metrics each run
- Model inference is fast (~100ms for typical datasets)
- Email sending adds ~100-500ms overhead (if enabled)
