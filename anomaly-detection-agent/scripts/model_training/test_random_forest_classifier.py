#!/usr/bin/env python3

import pandas as pd
import joblib
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

# -------------------------
# CONFIG
# -------------------------
MODEL_PATH = "models/random_forest_anomaly_classifier.joblib"
TEST_DATA = "data/test/logs_test2.csv"   # <--  test CSV

# Use raw metrics instead of anomaly_score to avoid label leakage
FEATURES = [
    "level",
    "status_code",
    "duration_ms",
    "cpu_percent",
    "memory_mb",
    "db_query_time_ms",
]
TARGET = "anomaly_label"

# -------------------------
# LOAD MODEL
# -------------------------
model = joblib.load(MODEL_PATH)
print("✅ Model loaded")

# -------------------------
# LOAD TEST DATA
# -------------------------
df = pd.read_csv(TEST_DATA)

X_test = df[FEATURES].copy()
y_true = df[TARGET]

numeric_features = ["status_code", "duration_ms", "cpu_percent", "memory_mb", "db_query_time_ms"]
for col in numeric_features:
    X_test[col] = pd.to_numeric(X_test[col], errors="coerce").fillna(0)

print(f"✅ Test rows: {len(df)}")

# -------------------------
# PREDICT
# -------------------------
y_pred = model.predict(X_test)

# -------------------------
# METRICS
# -------------------------
accuracy = accuracy_score(y_true, y_pred)

print("\n🎯 Accuracy:", round(accuracy, 4))

print("\n📊 Classification Report:")
print(classification_report(y_true, y_pred))

print("🧩 Confusion Matrix:")
print(confusion_matrix(y_true, y_pred))
