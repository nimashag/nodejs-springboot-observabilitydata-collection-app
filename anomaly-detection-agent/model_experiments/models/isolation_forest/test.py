import pandas as pd
import joblib
from sklearn.metrics import accuracy_score, classification_report

df = pd.read_csv("../../data/logs_test.csv")


X = df[["cpu_percent", "memory_mb", "db_query_time_ms", "duration_ms", "status_code"]]
y_true = df["anomaly_label"]

model = joblib.load("if_model.pkl")

y_pred = model.predict(X)
y_pred = [1 if x == -1 else 0 for x in y_pred]

print("🎯 Accuracy:", accuracy_score(y_true, y_pred))
print(classification_report(y_true, y_pred))
