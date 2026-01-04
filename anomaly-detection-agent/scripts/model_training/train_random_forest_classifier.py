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

FEATURES = ["level", "status_code", "anomaly_score"]
TARGET = "anomaly_label"

# -------------------------
# LOAD DATA
# -------------------------
df = pd.read_csv(DATASET)

X = df[FEATURES]
y = df[TARGET]

print(f"✅ Loaded dataset: {X.shape[0]} rows")

# -------------------------
# PREPROCESSING
# -------------------------
categorical_features = ["level"]
numeric_features = ["status_code", "anomaly_score"]

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
