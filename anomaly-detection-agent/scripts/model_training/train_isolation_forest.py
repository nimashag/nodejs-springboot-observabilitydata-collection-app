#!/usr/bin/env python3
import pandas as pd
import sys
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

# Fix Windows console encoding for Unicode characters
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# -----------------------------
# Config
# -----------------------------
DATA_PATH = "data/merged/logs_with_metrics_only_matches_labeled_custom.csv"
MODEL_PATH = "models/isolation_forest_model.joblib"
CONTAMINATION = 0.1   # expected anomaly ratio (tuneable)

# -----------------------------
# Load data
# -----------------------------
df = pd.read_csv(DATA_PATH)

FEATURES = ["level", "status_code", "anomaly_score"]
X = df[FEATURES]

# -----------------------------
# Preprocessing
# -----------------------------
preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), ["level"]),
        ("num", "passthrough", ["status_code", "anomaly_score"])
    ]
)

# -----------------------------
# Isolation Forest
# -----------------------------
iso_forest = IsolationForest(
    n_estimators=200,
    contamination=CONTAMINATION,
    random_state=42
)

pipeline = Pipeline([
    ("preprocess", preprocessor),
    ("model", iso_forest)
])

# -----------------------------
# Train
# -----------------------------
pipeline.fit(X)

joblib.dump(pipeline, MODEL_PATH)

print("✅ Isolation Forest trained")
print(f"💾 Model saved to: {MODEL_PATH}")
print(f"📊 Features used: {FEATURES}")
print(f"⚠️ Contamination: {CONTAMINATION}")
