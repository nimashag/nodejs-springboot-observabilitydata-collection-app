import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json
import os
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, ExtraTreesClassifier, VotingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
import joblib
import warnings
warnings.filterwarnings('ignore')

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False

# Paths
BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR.parent / 'output' / 'combined-alert-history.json'
MODEL_DIR = BASE_DIR / 'models'
MODEL_DIR.mkdir(exist_ok=True)

print("=" * 80)
print("FINAL ML MODEL TRAINING - Alert Predictor >91% Accuracy")
print("=" * 80)

# ============================================================================
# STEP 1: DATA LOADING & CLEANING
# ============================================================================
print("\nSTEP 1: Loading and Cleaning Data...")

with open(DATA_FILE, 'r') as f:
    alerts = json.load(f)

df = pd.DataFrame(alerts)
print(f"Loaded {len(df)} alert samples")

# Remove duplicates
initial_count = len(df)
df = df.drop_duplicates()
print(f"Removed {initial_count - len(df)} duplicates")

# Remove NaN values
df = df.dropna(subset=['error_count', 'request_count', 'average_response_time'])
print(f"Cleaned data: {len(df)} samples remaining")

# ============================================================================
# STEP 2: ENHANCED FEATURE ENGINEERING
# ============================================================================
print("\nSTEP 2: Enhanced Feature Engineering...")

# Convert timestamp
df['timestamp'] = pd.to_datetime(df['timestamp'])
df = df.sort_values('timestamp').reset_index(drop=True)

# Time-based features
df['hour_of_day'] = df['timestamp'].dt.hour
df['day_of_week'] = df['timestamp'].dt.dayofweek
df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
df['is_business_hours'] = df['hour_of_day'].between(9, 17).astype(int)

# Error rate and ratios
df['error_rate'] = df['error_count'] / (df['request_count'] + 1)
df['cpu_memory_ratio'] = df['process_cpu_usage'] / (df['process_memory_usage'] / 1e9 + 1)

# Rolling statistics (per service)
for service in df['service_name'].unique():
    mask = df['service_name'] == service
    df.loc[mask, 'error_count_rolling_mean'] = df.loc[mask, 'error_count'].rolling(window=5, min_periods=1).mean()
    df.loc[mask, 'error_count_rolling_std'] = df.loc[mask, 'error_count'].rolling(window=5, min_periods=1).std().fillna(0)
    df.loc[mask, 'response_time_rolling_mean'] = df.loc[mask, 'average_response_time'].rolling(window=5, min_periods=1).mean()
    df.loc[mask, 'response_time_rolling_std'] = df.loc[mask, 'average_response_time'].rolling(window=5, min_periods=1).std().fillna(0)
    df.loc[mask, 'error_rate_rolling_mean'] = df.loc[mask, 'error_rate'].rolling(window=5, min_periods=1).mean()

# Time since last alert
df['time_since_last_alert'] = df.groupby('service_name')['timestamp'].diff().dt.total_seconds().fillna(0)
df['time_since_last_alert_log'] = np.log1p(df['time_since_last_alert'])

# Rate of change
df['error_rate_change'] = df.groupby('service_name')['error_rate'].diff().fillna(0)
df['cpu_change'] = df.groupby('service_name')['process_cpu_usage'].diff().fillna(0)
df['response_time_change'] = df.groupby('service_name')['average_response_time'].diff().fillna(0)

# Error burst detection features
df['error_burst_1min'] = df.groupby('service_name')['error_count'].transform(lambda x: x.rolling(window=5, min_periods=1).sum())
df['error_burst_5min'] = df.groupby('service_name')['error_count'].transform(lambda x: x.rolling(window=25, min_periods=1).sum())
error_rolling_mean = df.groupby('service_name')['error_count'].transform(lambda x: x.rolling(window=10, min_periods=1).mean())
df['error_burst_indicator'] = (df['error_count'] > error_rolling_mean * 2).astype(int)
df['error_deviation'] = (df['error_count'] - error_rolling_mean) / (error_rolling_mean + 1)

# Severity encoding (ordinal)
severity_map = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
df['severity_encoded'] = df['severity'].map(severity_map)

# Alert type encoding
alert_type_map = {'error': 1, 'latency': 2, 'availability': 3, 'traffic': 4, 'resource': 5}
df['alert_type_encoded'] = df['alert_type'].map(alert_type_map)

# Service encoding (based on criticality)
service_map = {'users-service': 4, 'orders-service': 3, 'delivery-service': 2, 'restaurants-service': 1}
df['service_criticality'] = df['service_name'].map(service_map).fillna(1)

# Fill remaining NaN
df = df.fillna(0)

print(f"Engineered {len(df.columns)} total features")

# ============================================================================
# STEP 3: FEATURE SELECTION
# ============================================================================
print("\nSTEP 3: Selecting Features...")

feature_columns = [
    'request_count', 'error_count', 'average_response_time',
    'process_cpu_usage', 'process_memory_usage',
    'error_rate', 'hour_of_day', 'day_of_week', 'is_weekend', 'is_business_hours',
    'error_count_rolling_mean', 'error_count_rolling_std',
    'response_time_rolling_mean', 'response_time_rolling_std',
    'error_rate_rolling_mean',
    'time_since_last_alert', 'time_since_last_alert_log',
    'error_rate_change', 'cpu_change', 'response_time_change',
    'error_burst_1min', 'error_burst_5min', 'error_burst_indicator', 'error_deviation',
    'severity_encoded', 'alert_type_encoded', 'service_criticality',
    'cpu_memory_ratio'
]

X = df[feature_columns].copy()
print(f"Selected {len(feature_columns)} features")

# ============================================================================
# STEP 4: TARGET ENCODING
# ============================================================================
print("\nSTEP 4: Encoding Target...")

# Create binary target for alert prediction (fired vs resolved)
y_alert_trigger = (df['alert_state'] == 'fired').astype(int)

print(f"Alert trigger distribution: fired={y_alert_trigger.sum()}, resolved={(1-y_alert_trigger).sum()}")
print(f"Class balance: {y_alert_trigger.mean():.1%} fired")

# ============================================================================
# STEP 5: DATA PREPROCESSING
# ============================================================================
print("\nSTEP 5: Data Preprocessing...")

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print(f"Applied StandardScaler normalization")

# ============================================================================
# STEP 6: TRAIN/TEST SPLIT
# ============================================================================
print("\nSTEP 6: Train/Test Split (Stratified)...")

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y_alert_trigger, test_size=0.2, random_state=42, stratify=y_alert_trigger
)

print(f"Training samples: {len(X_train)}")
print(f"Test samples: {len(X_test)}")

# ============================================================================
# STEP 7: TRAIN MULTIPLE MODELS
# ============================================================================
print("\n" + "=" * 80)
print("STEP 7: Training Alert Predictor with Multiple Algorithms")
print("=" * 80)

models = {}
scores = {}
cv = StratifiedKFold(n_splits=10, shuffle=True, random_state=42)

# 1. Extra Trees
print("\n[1/6] Training Extra Trees Classifier...")
et = ExtraTreesClassifier(
    n_estimators=300,
    max_depth=20,
    min_samples_split=10,
    min_samples_leaf=4,
    max_features='sqrt',
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
et.fit(X_train, y_train)
et_score = cross_val_score(et, X_train, y_train, cv=cv, scoring='accuracy', n_jobs=-1).mean()
models['ExtraTrees'] = et
scores['ExtraTrees'] = et_score
print(f"   CV Score: {et_score:.4f} ({et_score*100:.2f}%)")

# 2. Random Forest
print("\n[2/6] Training Random Forest...")
rf = RandomForestClassifier(
    n_estimators=300,
    max_depth=20,
    min_samples_split=8,
    min_samples_leaf=4,
    max_features='sqrt',
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
rf.fit(X_train, y_train)
rf_score = cross_val_score(rf, X_train, y_train, cv=cv, scoring='accuracy', n_jobs=-1).mean()
models['RandomForest'] = rf
scores['RandomForest'] = rf_score
print(f"   CV Score: {rf_score:.4f} ({rf_score*100:.2f}%)")

# 3. Gradient Boosting
print("\n[3/6] Training Gradient Boosting...")
gb = GradientBoostingClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    min_samples_split=10,
    min_samples_leaf=4,
    subsample=0.8,
    max_features='sqrt',
    random_state=42
)
gb.fit(X_train, y_train)
gb_score = cross_val_score(gb, X_train, y_train, cv=cv, scoring='accuracy', n_jobs=-1).mean()
models['GradientBoosting'] = gb
scores['GradientBoosting'] = gb_score
print(f"   CV Score: {gb_score:.4f} ({gb_score*100:.2f}%)")

# 4. XGBoost
if HAS_XGBOOST:
    print("\n[4/6] Training XGBoost...")
    xgb_model = xgb.XGBClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        min_child_weight=4,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=1,
        random_state=42,
        n_jobs=-1,
        eval_metric='logloss'
    )
    xgb_model.fit(X_train, y_train)
    xgb_score = cross_val_score(xgb_model, X_train, y_train, cv=cv, scoring='accuracy', n_jobs=-1).mean()
    models['XGBoost'] = xgb_model
    scores['XGBoost'] = xgb_score
    print(f"   CV Score: {xgb_score:.4f} ({xgb_score*100:.2f}%)")

# 5. LightGBM
if HAS_LIGHTGBM:
    print("\n[5/6] Training LightGBM...")
    lgb_model = lgb.LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        num_leaves=31,
        min_child_samples=10,
        subsample=0.8,
        colsample_bytree=0.8,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
        verbose=-1
    )
    lgb_model.fit(X_train, y_train)
    lgb_score = cross_val_score(lgb_model, X_train, y_train, cv=cv, scoring='accuracy', n_jobs=-1).mean()
    models['LightGBM'] = lgb_model
    scores['LightGBM'] = lgb_score
    print(f"   CV Score: {lgb_score:.4f} ({lgb_score*100:.2f}%)")

# 6. Voting Ensemble (combine top 3 models)
print("\n[6/6] Training Voting Ensemble...")
top_3_models = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
ensemble_estimators = [(name, models[name]) for name, _ in top_3_models]
print(f"   Combining: {[name for name, _ in top_3_models]}")

voting = VotingClassifier(
    estimators=ensemble_estimators,
    voting='soft',
    n_jobs=-1
)
voting.fit(X_train, y_train)
voting_score = cross_val_score(voting, X_train, y_train, cv=cv, scoring='accuracy', n_jobs=-1).mean()
models['VotingEnsemble'] = voting
scores['VotingEnsemble'] = voting_score
print(f"   CV Score: {voting_score:.4f} ({voting_score*100:.2f}%)")

# Select best model
best_name = max(scores, key=scores.get)
best_model = models[best_name]
best_score = scores[best_name]

print(f"\n[SELECTED] Best Model: {best_name} (CV: {best_score:.4f})")

# ============================================================================
# STEP 8: FINAL EVALUATION
# ============================================================================
print("\n" + "=" * 80)
print("STEP 8: Final Evaluation on Test Set")
print("=" * 80)

y_pred = best_model.predict(X_test)
y_pred_proba = best_model.predict_proba(X_test)

test_accuracy = accuracy_score(y_test, y_pred)
test_precision = precision_score(y_test, y_pred, zero_division=0)
test_recall = recall_score(y_test, y_pred, zero_division=0)
test_f1 = f1_score(y_test, y_pred, zero_division=0)
confidence_scores = y_pred_proba.max(axis=1)
mean_confidence = confidence_scores.mean()
low_conf_rate = (confidence_scores < 0.7).mean()

print(f"\n[{best_name}] Alert Predictor Performance:")
print(f"   Test Accuracy: {test_accuracy:.4f} ({test_accuracy*100:.2f}%)")
print(f"   Precision: {test_precision:.4f} ({test_precision*100:.2f}%)")
print(f"   Recall: {test_recall:.4f} ({test_recall*100:.2f}%)")
print(f"   F1 Score: {test_f1:.4f} ({test_f1*100:.2f}%)")
print(f"   Mean Confidence: {mean_confidence:.4f}")
print(f"   Low Confidence Rate: {low_conf_rate:.2%}")
print(f"   CV-Test Gap: {abs(best_score - test_accuracy):.4f} ({abs(best_score - test_accuracy)*100:.2f}%)")
print(f"   Status: {'✅ PASS' if test_accuracy >= 0.91 else '❌ FAIL'} (Target: >91%)")

# Feature importance
if hasattr(best_model, 'feature_importances_'):
    feature_importance = pd.DataFrame({
        'feature': feature_columns,
        'importance': best_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 10 Most Important Features:")
    for idx, row in feature_importance.head(10).iterrows():
        print(f"   {row['feature']:30s}: {row['importance']:.4f}")

# ============================================================================
# STEP 9: SAVE MODELS
# ============================================================================
print("\n" + "=" * 80)
print("STEP 9: Saving Final Models")
print("=" * 80)

# Save best model
joblib.dump(best_model, MODEL_DIR / 'alert_predictor_final.joblib')
joblib.dump(scaler, MODEL_DIR / 'scaler_final.joblib')

# Also save the enhanced model to replace the old one
joblib.dump(best_model, MODEL_DIR / 'alert_predictor_enhanced.joblib')
joblib.dump(scaler, MODEL_DIR / 'scaler.joblib')

print(f"Saved models to {MODEL_DIR}")

# Save training report
report = {
    "training_date": datetime.now().isoformat(),
    "pipeline_version": "final_v4",
    "data_stats": {
        "total_samples": len(df),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "features_count": len(feature_columns)
    },
    "alert_predictor": {
        "model_type": best_name,
        "cv_accuracy": float(best_score),
        "test_accuracy": float(test_accuracy),
        "precision": float(test_precision),
        "recall": float(test_recall),
        "f1_score": float(test_f1),
        "mean_confidence": float(mean_confidence),
        "low_confidence_rate": float(low_conf_rate),
        "cv_test_gap": float(abs(best_score - test_accuracy)),
        "status": "PASS" if test_accuracy >= 0.91 else "FAIL"
    },
    "all_models_tested": {k: float(v) for k, v in scores.items()},
    "note": "False Positive Detector skipped - insufficient reliable labeling data"
}

with open(MODEL_DIR / 'training_report_final.json', 'w') as f:
    json.dump(report, f, indent=2)

print(f"Saved training report")

print("\n" + "=" * 80)
print("TRAINING COMPLETE!")
print("=" * 80)
print(f"\nFinal Results:")
print(f"   Alert Predictor ({best_name}): {test_accuracy*100:.2f}%")
print(f"   CV-Test Gap: {abs(best_score - test_accuracy)*100:.2f}%")
print(f"\nModels saved to: {MODEL_DIR}")

if test_accuracy >= 0.91:
    print("\n✅ SUCCESS! Model meets the >91% accuracy target!")
else:
    print(f"\n⚠️ WARNING: Model accuracy ({test_accuracy*100:.2f}%) below 91% target.")
    print("   This may be due to limited data or inherent difficulty in the prediction task.")

