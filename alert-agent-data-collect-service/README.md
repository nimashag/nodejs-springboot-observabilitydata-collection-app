# Adaptive Alert Tuning Agent (AATA)

## Overview

The Adaptive Alert Tuning Agent (AATA) is a self-healing component designed to address alert fatigue in microservice-based architectures. It analyzes historical alert data, detects false positive patterns, and dynamically adjusts alert thresholds using statistical methods.

---

## Key Features

### Implemented Components

1. **HTTP API Service** 

   - RESTful API endpoints for all analysis data
   - Authentication via API keys
   - CORS support with configurable origins
   - Pagination for large datasets
   - Graceful shutdown handling
   - Comprehensive error handling

2. **Historical Incident Analyzer**

   - Service baseline calculation
   - False positive detection
   - Temporal pattern analysis
   - Statistical analysis (mean, std, percentiles)

3. **Dynamic Threshold Adjuster**

   - Adaptive threshold calculation
   - Service-specific recommendations
   - Confidence scoring
   - Configuration export

4. **Report Generator**

   - Comprehensive reports
   - JSON output for automation
   - Actionable recommendations
   - Impact estimation

5. **ML Models**
   - Alert type classifier
   - Alert predictor
   - False positive detector
   - Model confidence tracking
   - Drift detection
   - Periodic retraining
   - Error burst detection features

### API Endpoints

- `GET /api/health` - Service health check (no auth required)
- `GET /api/summary` - High-level analysis summary
- `GET /api/alerts?page=1&limit=100` - Paginated alert data
- `GET /api/recommendations` - Threshold recommendations
- `GET /api/routing` - Alert routing analysis
- `GET /api/analysis` - Complete analysis data

---

## Quick Start

### Prerequisites

- Node.js 18+
- TypeScript 5+
- Python 3.8+ (for ML models)
- Alert data collected from microservices

### Installation

```bash
npm install
```

### Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` file with your configuration:

```bash
# Server Configuration
PORT=3008

# Security Configuration
API_KEY=your-secret-api-key-here

# CORS Configuration (comma-separated origins)
ALLOWED_ORIGINS=http://localhost:3000,https://dashboard.example.com

# Alert Collection Configuration
ALERT_COLLECTION_INTERVAL=60000
```

**Environment Variables:**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port number | 3008 | No |
| `API_KEY` | API key for webhook authentication | (empty) | No |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | (empty) | No |
| `ALERT_COLLECTION_INTERVAL` | Alert collection interval in ms | 60000 | No |

### Build

```bash
npm run build
```

### Run AATA as HTTP API Service

**Option 1: Start AATA with ML Service (Recommended)**

```bash
# Starts both ML service and AATA together
npm start

# This will:
# 1. Build the TypeScript code
# 2. Start ML prediction service (Python Flask on port 5001)
# 3. Wait for ML service to be ready (automatic retry with health checks)
# 4. Start AATA service (Node.js on port 3008)
# 5. Both services run in parallel with color-coded logs
```

**Option 2: Start AATA Only (Without ML)**

```bash
# Start AATA without ML predictions
npm run start:aata-only

# Or override environment variables
PORT=8080 API_KEY=your-secret-key npm run start:aata-only
```

**Note:** When running without ML service, AATA will continue to work using statistical methods only. ML predictions (priority scoring, TTR prediction) will be disabled gracefully.


### View File-Based Results

```bash
# Human-readable report
cat output/AATA-REPORT.md

# Threshold recommendations
cat output/threshold-recommendations.json

# Adaptive configuration
cat output/adaptive-threshold-config.json
```

### API Documentation

See detailed API documentation:
- **[API.md](./API.md)** - Complete API reference
- **[QUICK-START.md](./QUICK-START.md)** - Quick reference guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture

---

## ML Model Training

### Train Models

```bash
cd ml-module
python train_enhanced.py
```

This script trains three ML models:
- **Alert Type Classifier**: Classifies alert types (error, latency, availability)
- **Alert Predictor**: Predicts alert triggers
- **False Positive Detector**: Identifies false positive alerts

Features include:
- Hyperparameter tuning with GridSearchCV
- Cross-validation with confidence intervals
- Error burst detection features
- Model confidence tracking
- Feature importance analysis

### Test Model Accuracy

```bash
cd ml-module
python test_models.py
```

### Periodic Retraining

Automatically retrain models based on time or drift detection:

```bash
# Check if retraining is needed (does not train)
cd ml-module
python retrain_periodic.py --check-only

# Perform retraining if needed
python retrain_periodic.py

# Force retraining (skip checks)
python retrain_periodic.py --force

# Custom thresholds
python retrain_periodic.py --days-threshold 14 --min-accuracy-drop 0.03
```

**Setup Cron Job** (Linux/Mac):
```bash
# Add to crontab (retrain weekly, every Sunday at 2 AM)
0 2 * * 0 cd /path/to/alert-agent-data-collect-service/ml-module && python retrain_periodic.py >> retrain.log 2>&1
```

### Drift Detection

Monitor model performance and data distribution changes:

```bash
cd ml-module
python drift_detection.py
```

This script detects:
- **Statistical Drift**: Data distribution changes using Kolmogorov-Smirnov test
- **Performance Drift**: Model accuracy degradation on recent data
- Results are logged to `models/drift_detection_log.json`

### Inference with Confidence Tracking

Use models with confidence scores:

```bash
cd ml-module
python inference_with_confidence.py
```

This demonstrates:
- Making predictions with confidence scores
- Tracking low-confidence predictions
- Logging confidence metrics over time
- Results logged to `models/confidence_tracking.json`

### Export Data to CSV

```bash
cd alert-agent-data-collect-service
python scripts/export_to_csv.py
```

---

## Results

### Current System (Static Thresholds)

- False Positive Rate: 27.5%
- Quick Resolves: 114 alerts (< 30s)
- Repetitive Patterns: 2,324 instances
- Static Threshold: 5 errors (one-size-fits-all)

### AATA System (Adaptive Thresholds)

- Service-Specific Thresholds: 65-155 errors
- Expected FP Reduction: 40%
- Alerts Saved: ~92 alerts
- Noise Reduction: 11.2%

### Service-Specific Recommendations

| Service             | Current | Recommended | Change       | Confidence |
| ------------------- | ------- | ----------- | ------------ | ---------- |
| orders-service      | 5       | 65          | 13x higher   | high       |
| restaurants-service | 5       | 67          | 13.4x higher | high       |
| delivery-service    | 5       | 142         | 28.4x higher | high       |
| users-service       | 5       | 155         | 31x higher   | high       |

### ML Model Performance

| Model                   | Accuracy  | Status    |
| ----------------------- | --------- | --------- |
| Alert Type Classifier   | 97.80%    | Excellent |
| Alert Predictor         | 80.46%    | Good      |
| False Positive Detector | 98.37% F1 | Excellent |

---

## Technical Methodology

### Statistical Analysis

**Formula:**

```
recommended_threshold = mean + k * std_deviation
```

**Sensitivity Factor (k):**

- k = 1.5 when FP rate < 20% (more sensitive)
- k = 2.0 when FP rate 20-40% (balanced)
- k = 2.5 when FP rate > 40% (less sensitive)

### False Positive Detection

**Criteria:**

1. Alerts resolved in < 30 seconds
2. Repetitive alerts within 5-minute windows
3. Low-impact alerts (low severity + quick resolve)

### Confidence Scoring

- **High:** > 20 samples
- **Medium:** 10-20 samples
- **Low:** < 10 samples

---

## Project Structure

```
alert-agent-data-collect-service/
├── src/
│   ├── analyzer/
│   │   ├── historical-analyzer.ts
│   │   └── statistics.ts
│   ├── tuner/
│   │   └── threshold-adjuster.ts
│   ├── reporter/
│   │   └── report-generator.ts
│   ├── collector.ts
│   ├── types.ts
│   └── index.ts
├── ml-module/
│   ├── train_enhanced.py
│   ├── test_models.py
│   └── models/
│       ├── alert_classifier_enhanced.joblib
│       ├── alert_predictor_enhanced.joblib
│       └── false_positive_detector_enhanced.joblib
├── scripts/
│   └── export_to_csv.py
├── output/
│   ├── alert-data-collection.csv
│   ├── alert-summary.json
│   └── combined-alert-history.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## Academic Alignment

### Research Problem

"Conventional alerting frameworks rely on static thresholds that fail to adapt to workload variability, resulting in excessive false positives and reduced operator trust in observability pipelines."

### Solution

AATA introduces dynamic alert optimization that continuously refines thresholds based on:

- Historical incident analysis
- Statistical methods (mean, std, percentiles)
- False positive pattern detection
- Service-specific behavior analysis
- Machine learning classification

### Novel Contributions

1. Adaptive Sensitivity Factor - Dynamically adjusts based on FP rate
2. Service-Specific Thresholds - Personalized per microservice
3. Confidence-Weighted Recommendations - Sample-size based reliability
4. ML-Enhanced Detection - 97.80% classification accuracy
5. Self-Healing Feedback Loop - Embedded in observability middleware

---

## Metrics & Validation

### Success Metrics

| Metric             | Target | Achieved   | Status   |
| ------------------ | ------ | ---------- | -------- |
| FP Reduction       | 40%    | 40%        | Complete |
| Processing Latency | < 2s   | < 1s       | Exceeded |
| Service Coverage   | 100%   | 100% (4/4) | Complete |
| ML Accuracy        | > 90%  | 97.80%     | Exceeded |

### Validation

- 865 real alerts analyzed
- Statistical methods validated
- Service-specific thresholds calculated
- Comprehensive reports generated
- ML models trained and tested with cross-validation

---

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Run Analysis

```bash
npm start
```

---

## Support

**Student:** Kusalanjani J. P. N.  
**ID:** IT22034540  
**Project:** 25-26J-478 RP  
**Component:** Adaptive Alert Tuning Agent

---

## License

This project is part of academic research for B.Sc. (Hons) Degree in Information Technology Specialising in Software Engineering at Sri Lanka Institute of Information Technology.
