#!/usr/bin/env python3

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import joblib

# -------------------------
# CONFIG
# -------------------------
DATASET = "data/merged/logs_with_metrics_only_matches_labeled_custom.csv"
MODEL_OUT = "models/random_forest_anomaly_classifier.joblib"

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
# LOAD DATA
# -------------------------
df = pd.read_csv(DATASET)

X = df[FEATURES].copy()
y = df[TARGET]

# Coerce numeric columns safely
numeric_features = ["status_code", "duration_ms", "cpu_percent", "memory_mb", "db_query_time_ms"]
for col in numeric_features:
    X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0)

print(f"✅ Loaded dataset: {X.shape[0]} rows")

# -------------------------
# PREPROCESSING
# -------------------------
categorical_features = ["level"]

preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ("num", "passthrough", numeric_features)
    ]
)

# -------------------------
# MODEL
# -------------------------
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=6,
    class_weight="balanced",
    random_state=42
)

pipeline = Pipeline(steps=[
    ("preprocess", preprocessor),
    ("classifier", model)
])

# -------------------------
# TRAIN / TEST SPLIT
# -------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# -------------------------
# TRAIN
# -------------------------
pipeline.fit(X_train, y_train)

# -------------------------
# EVALUATION
# -------------------------
y_pred = pipeline.predict(X_test)

print("\n📊 Classification Report:")
print(classification_report(y_test, y_pred))

print("🧩 Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# -------------------------
# SAVE MODEL
# -------------------------
joblib.dump(pipeline, MODEL_OUT)
print(f"\n💾 Model saved to: {MODEL_OUT}")
