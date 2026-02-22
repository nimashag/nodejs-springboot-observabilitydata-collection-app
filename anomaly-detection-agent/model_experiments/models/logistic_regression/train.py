import pandas as pd
from sklearn.linear_model import LogisticRegression
import joblib

df = pd.read_csv("../../../data/merged/logs_with_metrics_only_matches_labeled_custom.csv")


X = df[["cpu_percent", "memory_mb", "db_query_time_ms", "duration_ms", "status_code"]]
y = df["anomaly_label"]

model = LogisticRegression(max_iter=1000, class_weight="balanced")
model.fit(X, y)

joblib.dump(model, "lr_model.pkl")
print("✅ Logistic Regression trained")
