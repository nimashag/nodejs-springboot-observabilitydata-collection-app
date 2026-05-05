import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from pathlib import Path

DATASET = "../../../data/merged/logs_with_metrics_only_matches_labeled_custom.csv"

MODEL_OUT = "rf_model.pkl"
TEST_SIZE = 0.2

LEVEL_MAP = {"debug":0,"info":1,"warn":2,"warning":2,"error":3,"fatal":4}

def encode_level(x):
    if not isinstance(x, str): return 1
    return LEVEL_MAP.get(x.strip().lower(), 1)

df = pd.read_csv(DATASET)

# clean / ensure numeric
df["level_encoded"] = df["level"].apply(encode_level)

for c in ["duration_ms","cpu_percent","memory_mb","db_query_time_ms","status_code"]:
    df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

df["anomaly_label"] = pd.to_numeric(df["anomaly_label"], errors="coerce").fillna(0).astype(int)

FEATURES = ["duration_ms","cpu_percent","memory_mb","db_query_time_ms","status_code","level_encoded"]

X = df[FEATURES]
y = df["anomaly_label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=TEST_SIZE, random_state=42, stratify=y
)

model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced"
)

model.fit(X_train, y_train)

y_pred = model.predict(X_test)

print(f"✅ Train rows: {len(X_train)} | Test rows: {len(X_test)} | Test size: {TEST_SIZE}")
print("🎯 Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

joblib.dump(model, MODEL_OUT)
print(f"💾 Saved model: {MODEL_OUT}")
print("✅ Features used:", list(X.columns))
