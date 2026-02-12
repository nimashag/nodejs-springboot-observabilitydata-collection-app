# Models Directory - Production Ready Files

**Last Updated:** 2026-02-12  
**Status:** Cleaned and Organized

---

## ✅ Production Models (14 .joblib files)

### Core Alert Models
1. **alert_classifier_enhanced.joblib** - Alert Type Classifier (95.34% accuracy)
2. **alert_predictor_enhanced.joblib** - Alert Predictor LightGBM (79.79% accuracy)
3. **alert_predictor_final.joblib** - Backup of best predictor model
4. **false_positive_detector_enhanced.joblib** - False Positive Detector

### Scalers & Encoders
5. **scaler.joblib** - Feature scaler (StandardScaler)
6. **scaler_final.joblib** - Backup scaler
7. **alert_type_encoder.joblib** - Alert type label encoder
8. **severity_encoder.joblib** - Severity label encoder

### Phase 1 Models (Priority & TTR)
9. **priority_classifier.joblib** - Priority level classifier (P0-P3)
10. **priority_scorer.joblib** - Priority score predictor (0-100)
11. **priority_encoders.joblib** - Priority encoders
12. **ttr_predictor.joblib** - Time-to-Resolve predictor
13. **ttr_confidence_model.joblib** - TTR confidence model
14. **ttr_encoders.joblib** - TTR encoders

---

## 📊 Reports & Logs (9 .json files)

### Training Reports
1. **training_report_enhanced.json** - Main training report
2. **training_report_final.json** - Final model training report
3. **phase1_training_results.json** - Phase 1 models results
4. **priority_scoring_report.json** - Priority scoring metrics
5. **ttr_prediction_report.json** - TTR prediction metrics

### System Logs
6. **confidence_tracking.json** - Model confidence tracking
7. **drift_detection_log.json** - Model drift detection log
8. **retrain_log.json** - Retraining history
9. **threshold_config.json** - Threshold configurations

---

## 📄 Documentation (1 .md file)
1. **TRAINING_REPORT_ENHANCED.md** - Detailed training report

---

## 🗑️ Removed Files (12 files)

### Duplicates & Old Versions:
- ❌ alert_classifier.joblib (old version)
- ❌ alert_predictor.joblib (old version)
- ❌ false_positive_detector.joblib (old version)

### Experimental Models:
- ❌ alert_predictor_improved.joblib (intermediate)
- ❌ alert_predictor_synthetic.joblib (failed experiment)
- ❌ false_positive_detector_improved.joblib (intermediate)

### Duplicate Scalers/Encoders:
- ❌ scaler_improved.joblib (duplicate)
- ❌ scaler_synthetic.joblib (synthetic experiment)
- ❌ alert_type_encoder_improved.joblib (duplicate)

### Holt-Winters (Removed Feature):
- ❌ hourly_patterns.joblib
- ❌ seasonal_models_params.joblib
- ❌ resolution_patterns.joblib

---

## 📈 Total Files

**Before Cleanup:** 26 .joblib files + 9 .json files = 35 files  
**After Cleanup:** 14 .joblib files + 9 .json files = 23 files  
**Removed:** 12 duplicate/experimental files

---

## 🎯 Usage

### Load Alert Classifier (95.34%):
```python
import joblib
classifier = joblib.load('models/alert_classifier_enhanced.joblib')
encoder = joblib.load('models/alert_type_encoder.joblib')
```

### Load Alert Predictor (79.79%):
```python
import joblib
predictor = joblib.load('models/alert_predictor_enhanced.joblib')
scaler = joblib.load('models/scaler.joblib')
```

### Load Priority Scoring:
```python
import joblib
priority_clf = joblib.load('models/priority_classifier.joblib')
priority_scorer = joblib.load('models/priority_scorer.joblib')
```

### Load TTR Predictor:
```python
import joblib
ttr_predictor = joblib.load('models/ttr_predictor.joblib')
ttr_encoders = joblib.load('models/ttr_encoders.joblib')
```

---

**Status:** ✅ Clean, organized, and production-ready!

