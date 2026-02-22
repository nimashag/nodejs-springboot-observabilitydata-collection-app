#!/usr/bin/env python3
import pandas as pd
import joblib
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# -----------------------------
# Config
# -----------------------------
TEST_PATH = "data/test/logs_test2.csv"
MODEL_PATH = "models/isolation_forest_model.joblib"

# -----------------------------
# Load
# -----------------------------
df = pd.read_csv(TEST_PATH)
model = joblib.load(MODEL_PATH)

FEATURES = ["level", "status_code", "anomaly_score"]
X_test = df[FEATURES]
y_true = df["anomaly_label"]

# -----------------------------
# Predict
# IsolationForest:
#   -1 = anomaly
#    1 = normal
# -----------------------------
raw_preds = model.predict(X_test)
y_pred = [1 if p == -1 else 0 for p in raw_preds]

# -----------------------------
# Evaluation
# -----------------------------
acc = accuracy_score(y_true, y_pred)
cm = confusion_matrix(y_true, y_pred)

print(f"\n🎯 Accuracy: {acc:.3f}\n")
print("📊 Classification Report:")
print(classification_report(y_true, y_pred))
print("🧩 Confusion Matrix:")
print(cm)
