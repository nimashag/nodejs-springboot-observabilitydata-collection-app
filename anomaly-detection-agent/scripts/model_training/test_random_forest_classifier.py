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

FEATURES = ["level", "status_code", "anomaly_score"]
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

X_test = df[FEATURES]
y_true = df[TARGET]

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
