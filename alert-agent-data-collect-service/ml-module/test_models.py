import json
import pandas as pd
import joblib
from pathlib import Path
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder

# Load data
data_file = Path(__file__).parent.parent / 'output' / 'combined-alert-history.json'
df = pd.DataFrame(json.load(open(data_file)))

print(f"\nData: {len(df)} alerts\n")

# Prepare features
df['timestamp'] = pd.to_datetime(df['timestamp'])
df['error_rate'] = df['error_count'] / (df['request_count'] + 1)

features = ['request_count', 'error_count', 'average_response_time', 
            'process_cpu_usage', 'process_memory_usage', 'error_rate']

X = StandardScaler().fit_transform(df[features])
y_type = LabelEncoder().fit_transform(df['alert_type'])
y_trigger = (df['alert_state'] == 'fired').astype(int)

# Load models
models_dir = Path(__file__).parent / 'models'
classifier = joblib.load(models_dir / 'alert_classifier_enhanced.joblib')
predictor = joblib.load(models_dir / 'alert_predictor_enhanced.joblib')

# Test accuracy
print("Model Accuracy (5-fold CV):\n")
acc1 = cross_val_score(classifier, X, y_type, cv=5).mean()
acc2 = cross_val_score(predictor, X, y_trigger, cv=5).mean()

print(f"Alert Classifier:  {acc1*100:.2f}%")
print(f"Alert Predictor:   {acc2*100:.2f}%\n")

