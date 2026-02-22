import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

df = pd.read_csv("../../../data/merged/logs_with_metrics_only_matches_labeled_custom.csv")



X = df[["cpu_percent", "memory_mb", "db_query_time_ms", "duration_ms", "status_code"]]

model = IsolationForest(contamination=0.1, random_state=42)
model.fit(X)

joblib.dump(model, "if_model.pkl")
print("✅ Isolation Forest trained")
