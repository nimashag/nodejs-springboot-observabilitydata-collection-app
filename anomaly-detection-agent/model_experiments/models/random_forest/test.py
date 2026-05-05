import pandas as pd
import joblib
from sklearn.metrics import classification_report, accuracy_score

TEST_DATA = "../../data/logs_test.csv"

LEVEL_MAP = {"debug": 0, "info": 1, "warn": 2, "warning": 2, "error": 3, "fatal": 4}

def encode_level(x):
    if not isinstance(x, str):
        return LEVEL_MAP["info"]
    return LEVEL_MAP.get(x.strip().lower(), LEVEL_MAP["info"])

df = pd.read_csv(TEST_DATA)

# Ensure same feature set as training
df["level_encoded"] = df["level"].apply(encode_level) if "level" in df.columns else LEVEL_MAP["info"]
for c in ["duration_ms", "cpu_percent", "memory_mb", "db_query_time_ms", "status_code"]:
    if c in df.columns:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)
    else:
        df[c] = 0

FEATURES = ["duration_ms", "cpu_percent", "memory_mb", "db_query_time_ms", "status_code", "level_encoded"]
X = df[FEATURES]
y = pd.to_numeric(df["anomaly_label"], errors="coerce").fillna(0).astype(int)

model = joblib.load("rf_model.pkl")
y_pred = model.predict(X)

print("🎯 Accuracy:", accuracy_score(y, y_pred))
print(classification_report(y, y_pred))
