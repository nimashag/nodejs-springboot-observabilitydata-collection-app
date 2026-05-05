#!/usr/bin/env python3
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

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

# Use raw metrics instead of anomaly_score to avoid leakage
FEATURES = [
    "level",
    "status_code",
    "duration_ms",
    "cpu_percent",
    "memory_mb",
    "db_query_time_ms",
]
X = df[FEATURES].copy()

numeric_features = ["status_code", "duration_ms", "cpu_percent", "memory_mb", "db_query_time_ms"]
for col in numeric_features:
    X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0)

# -----------------------------
# Preprocessing
# -----------------------------
preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), ["level"]),
        ("num", "passthrough", numeric_features)
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
