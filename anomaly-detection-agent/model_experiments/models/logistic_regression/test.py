import pandas as pd
import joblib
from sklearn.metrics import accuracy_score, classification_report

df = pd.read_csv("../../data/logs_test.csv")


X = df[["cpu_percent", "memory_mb", "db_query_time_ms", "duration_ms", "status_code"]]
y = df["anomaly_label"]

model = joblib.load("lr_model.pkl")
y_pred = model.predict(X)

print("🎯 Accuracy:", accuracy_score(y, y_pred))
print(classification_report(y, y_pred))
