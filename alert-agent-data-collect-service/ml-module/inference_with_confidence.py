import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json
import pandas as pd
import numpy as np
from pathlib import Path
import joblib
from datetime import datetime
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

BASE_DIR = Path(__file__).parent
MODEL_DIR = BASE_DIR / 'models'
CONFIDENCE_LOG = MODEL_DIR / 'confidence_tracking.json'

def load_models():
    """Load all trained models and preprocessors"""
    classifier = joblib.load(MODEL_DIR / 'alert_classifier_enhanced.joblib')
    predictor = joblib.load(MODEL_DIR / 'alert_predictor_enhanced.joblib')
    fp_detector = joblib.load(MODEL_DIR / 'false_positive_detector_enhanced.joblib')
    scaler = joblib.load(MODEL_DIR / 'scaler.joblib')
    alert_type_encoder = joblib.load(MODEL_DIR / 'alert_type_encoder.joblib')
    severity_encoder = joblib.load(MODEL_DIR / 'severity_encoder.joblib')
    
    return {
        'classifier': classifier,
        'predictor': predictor,
        'fp_detector': fp_detector,
        'scaler': scaler,
        'alert_type_encoder': alert_type_encoder,
        'severity_encoder': severity_encoder
    }

def prepare_features(df):
    """Prepare features for prediction (same as training)"""
    df = df.copy()
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Error rate
    df['error_rate'] = df['error_count'] / (df['request_count'] + 1)
    
    # Time-based features
    df['hour_of_day'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    # Rolling statistics
    for service in df['service_name'].unique():
        mask = df['service_name'] == service
        df.loc[mask, 'error_count_rolling_mean'] = df.loc[mask, 'error_count'].rolling(window=5, min_periods=1).mean()
        df.loc[mask, 'error_count_rolling_std'] = df.loc[mask, 'error_count'].rolling(window=5, min_periods=1).std().fillna(0)
        df.loc[mask, 'response_time_rolling_mean'] = df.loc[mask, 'average_response_time'].rolling(window=5, min_periods=1).mean()
        df.loc[mask, 'response_time_rolling_std'] = df.loc[mask, 'average_response_time'].rolling(window=5, min_periods=1).std().fillna(0)
    
    df['time_since_last_alert'] = df.groupby('service_name')['timestamp'].diff().dt.total_seconds().fillna(0)
    df['error_rate_change'] = df.groupby('service_name')['error_rate'].diff().fillna(0)
    df['cpu_change'] = df.groupby('service_name')['process_cpu_usage'].diff().fillna(0)
    
    # Error burst features
    df['error_burst_1min'] = df.groupby('service_name')['error_count'].transform(lambda x: x.rolling(window=5, min_periods=1).sum())
    df['error_burst_5min'] = df.groupby('service_name')['error_count'].transform(lambda x: x.rolling(window=25, min_periods=1).sum())
    error_rolling_mean = df.groupby('service_name')['error_count'].transform(lambda x: x.rolling(window=10, min_periods=1).mean())
    df['error_burst_indicator'] = (df['error_count'] > error_rolling_mean * 2).astype(int)
    df = df.fillna(0)
    
    return df

def predict_with_confidence(models, df, feature_columns):
    """Make predictions with confidence scores"""
    X = df[feature_columns].copy()
    X_scaled = models['scaler'].transform(X)
    
    # Alert Type Classification
    type_pred = models['classifier'].predict(X_scaled)
    type_proba = models['classifier'].predict_proba(X_scaled)
    type_confidence = type_proba.max(axis=1)
    type_classes = models['alert_type_encoder'].inverse_transform(type_pred)
    
    # Alert Trigger Prediction
    trigger_pred = models['predictor'].predict(X_scaled)
    trigger_proba = models['predictor'].predict_proba(X_scaled)
    trigger_confidence = trigger_proba.max(axis=1)
    
    # False Positive Detection
    fp_pred = models['fp_detector'].predict(X_scaled)
    fp_proba = models['fp_detector'].predict_proba(X_scaled)
    fp_confidence = fp_proba.max(axis=1)
    
    results = []
    for i in range(len(df)):
        results.append({
            'index': i,
            'service_name': df.iloc[i]['service_name'],
            'alert_type_predicted': type_classes[i],
            'alert_type_confidence': float(type_confidence[i]),
            'alert_trigger_predicted': bool(trigger_pred[i]),
            'alert_trigger_confidence': float(trigger_confidence[i]),
            'false_positive_predicted': bool(fp_pred[i]),
            'false_positive_confidence': float(fp_confidence[i]),
            'low_confidence_flag': (
                type_confidence[i] < 0.7 or 
                trigger_confidence[i] < 0.7 or 
                fp_confidence[i] < 0.7
            )
        })
    
    return results

def log_confidence_metrics(results):
    """Log confidence metrics to file"""
    if len(results) == 0:
        return
    
    type_confidences = [r['alert_type_confidence'] for r in results]
    trigger_confidences = [r['alert_trigger_confidence'] for r in results]
    fp_confidences = [r['false_positive_confidence'] for r in results]
    low_confidence_count = sum(1 for r in results if r['low_confidence_flag'])
    
    metrics = {
        'timestamp': datetime.now().isoformat(),
        'sample_count': len(results),
        'alert_classifier': {
            'mean_confidence': float(np.mean(type_confidences)),
            'min_confidence': float(np.min(type_confidences)),
            'max_confidence': float(np.max(type_confidences)),
            'std_confidence': float(np.std(type_confidences)),
            'low_confidence_rate': float(low_confidence_count / len(results))
        },
        'alert_predictor': {
            'mean_confidence': float(np.mean(trigger_confidences)),
            'min_confidence': float(np.min(trigger_confidences)),
            'max_confidence': float(np.max(trigger_confidences)),
            'std_confidence': float(np.std(trigger_confidences))
        },
        'false_positive_detector': {
            'mean_confidence': float(np.mean(fp_confidences)),
            'min_confidence': float(np.min(fp_confidences)),
            'max_confidence': float(np.max(fp_confidences)),
            'std_confidence': float(np.std(fp_confidences))
        },
        'low_confidence_samples': low_confidence_count
    }
    
    # Load existing log or create new
    if CONFIDENCE_LOG.exists():
        with open(CONFIDENCE_LOG, 'r') as f:
            log = json.load(f)
    else:
        log = {'tracking': []}
    
    log['tracking'].append(metrics)
    log['last_updated'] = datetime.now().isoformat()
    
    # Keep only last 1000 entries
    if len(log['tracking']) > 1000:
        log['tracking'] = log['tracking'][-1000:]
    
    CONFIDENCE_LOG.parent.mkdir(exist_ok=True)
    with open(CONFIDENCE_LOG, 'w') as f:
        json.dump(log, f, indent=2)
    
    return metrics

def main():
    """Example usage"""
    print("=" * 80)
    print("ML INFERENCE WITH CONFIDENCE TRACKING")
    print("=" * 80)
    
    # Load models
    print("\nLoading models...")
    models = load_models()
    print("Models loaded")
    
    # Load sample data (use recent alerts)
    data_file = BASE_DIR.parent / 'output' / 'combined-alert-history.json'
    if not data_file.exists():
        print(f"Data file not found: {data_file}")
        return
    
    with open(data_file, 'r') as f:
        alerts = json.load(f)
    
    df = pd.DataFrame(alerts)
    print(f"Loaded {len(df)} alerts")
    
    # Use last 100 samples for inference
    df_sample = df.tail(100).copy()
    
    # Prepare features
    print("\nPreparing features...")
    df_prepared = prepare_features(df_sample)
    
    feature_columns = [
        'request_count', 'error_count', 'average_response_time',
        'process_cpu_usage', 'process_memory_usage',
        'error_rate', 'hour_of_day', 'day_of_week', 'is_weekend',
        'error_count_rolling_mean', 'error_count_rolling_std',
        'response_time_rolling_mean', 'response_time_rolling_std',
        'time_since_last_alert', 'error_rate_change', 'cpu_change',
        'error_burst_1min', 'error_burst_5min', 'error_burst_indicator'
    ]
    
    # Add optional features if they exist in data, otherwise add with default value 0
    optional_features = ['traffic_rate', 'event_loop_lag']
    for feat in optional_features:
        if feat not in df_prepared.columns:
            df_prepared[feat] = 0  # Add missing optional feature with default value
        if feat not in feature_columns:
            feature_columns.append(feat)
    
    # Predict with confidence
    print("\nMaking predictions with confidence scores...")
    results = predict_with_confidence(models, df_prepared, feature_columns)
    
    # Log metrics
    metrics = log_confidence_metrics(results)
    
    # Display summary
    print("\n" + "=" * 80)
    print("CONFIDENCE SUMMARY")
    print("=" * 80)
    if metrics:
        print(f"\nAlert Classifier:")
        print(f"   Mean Confidence: {metrics['alert_classifier']['mean_confidence']:.4f}")
        print(f"   Low Confidence Rate: {metrics['alert_classifier']['low_confidence_rate']:.2%}")
        
        print(f"\nAlert Predictor:")
        print(f"   Mean Confidence: {metrics['alert_predictor']['mean_confidence']:.4f}")
        
        print(f"\nFalse Positive Detector:")
        print(f"   Mean Confidence: {metrics['false_positive_detector']['mean_confidence']:.4f}")
        
        print(f"\nLow Confidence Samples: {metrics['low_confidence_samples']}/{metrics['sample_count']}")
        print(f"\nResults logged to: {CONFIDENCE_LOG}")
    
    # Show some examples
    print("\nSample Predictions (first 5):")
    for i, result in enumerate(results[:5]):
        print(f"\n  Sample {i+1} ({result['service_name']}):")
        print(f"    Alert Type: {result['alert_type_predicted']} (confidence: {result['alert_type_confidence']:.3f})")
        print(f"    Trigger: {result['alert_trigger_predicted']} (confidence: {result['alert_trigger_confidence']:.3f})")
        print(f"    False Positive: {result['false_positive_predicted']} (confidence: {result['false_positive_confidence']:.3f})")
        if result['low_confidence_flag']:
            print(f"    Warning: Low Confidence Flag")

if __name__ == '__main__':
    main()

