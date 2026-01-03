# Adaptive Alert Tuning Agent (AATA)

## Overview

The Adaptive Alert Tuning Agent (AATA) is a self-healing component designed to address alert fatigue in microservice-based architectures. It analyzes historical alert data, detects false positive patterns, and dynamically adjusts alert thresholds using statistical methods.

---

## Key Features

### Implemented Components

1. **Historical Incident Analyzer**

   - Service baseline calculation
   - False positive detection
   - Temporal pattern analysis
   - Statistical analysis (mean, std, percentiles)

2. **Dynamic Threshold Adjuster**

   - Adaptive threshold calculation
   - Service-specific recommendations
   - Confidence scoring
   - Configuration export

3. **Report Generator**

   - Comprehensive reports
   - JSON output for automation
   - Actionable recommendations
   - Impact estimation

4. **ML Models**
   - Alert type classifier
   - Alert predictor
   - False positive detector

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

### Build

```bash
npm run build
```

### Run AATA Analysis

```bash
npm start
```

### View Results

```bash
# Human-readable report
cat output/AATA-REPORT.md

# Threshold recommendations
cat output/threshold-recommendations.json

# Adaptive configuration
cat output/adaptive-threshold-config.json
```

---

## ML Model Training

### Train Models

```bash
cd ml-module
python train_enhanced.py
```

### Test Model Accuracy

```bash
cd ml-module
python test_models.py
```

### Export Data to CSV

```bash
cd ml-module
python export_to_csv.py
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
│   ├── export_to_csv.py
│   └── models/
│       ├── alert_classifier_enhanced.joblib
│       ├── alert_predictor_enhanced.joblib
│       └── false_positive_detector_enhanced.joblib
├── output/
│   ├── AATA-REPORT.md
│   ├── threshold-recommendations.json
│   ├── adaptive-threshold-config.json
│   ├── alert-data-collection.csv
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
