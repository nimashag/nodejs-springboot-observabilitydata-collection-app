"""
Model and Data Drift Detection
Monitors model performance and data distribution changes over time
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from scipy import stats
from sklearn.metrics import accuracy_score
import joblib
import warnings
warnings.filterwarnings('ignore')

# Paths
BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR.parent / 'output' / 'combined-alert-history.json'
MODEL_DIR = BASE_DIR / 'models'
DRIFT_LOG = MODEL_DIR / 'drift_detection_log.json'

print("=" * 80)
print("DRIFT DETECTION ANALYSIS")
print("=" * 80)

def load_reference_data():
    """Load reference training data statistics"""
    report_path = MODEL_DIR / 'training_report_enhanced.json'
    if not report_path.exists():
        return None
    
    with open(report_path, 'r') as f:
        report = json.load(f)
    
    return report

def load_current_data():
    """Load current production data"""
    if not DATA_FILE.exists():
        print(f"Data file not found: {DATA_FILE}")
        return None
    
    with open(DATA_FILE, 'r') as f:
        alerts = json.load(f)
    
    df = pd.DataFrame(alerts)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Filter to recent data (last 7 days for comparison)
    if len(df) > 0:
        cutoff_date = df['timestamp'].max() - timedelta(days=7)
        df_recent = df[df['timestamp'] >= cutoff_date].copy()
    else:
        df_recent = df.copy()
    
    return df, df_recent

def calculate_statistical_drift(df_reference, df_current, feature_cols):
    """Detect statistical drift using Kolmogorov-Smirnov test"""
    drift_results = {}
    
    for col in feature_cols:
        if col not in df_reference.columns or col not in df_current.columns:
            continue
        
        ref_values = df_reference[col].dropna()
        curr_values = df_current[col].dropna()
        
        if len(ref_values) < 10 or len(curr_values) < 10:
            continue
        
        # Kolmogorov-Smirnov test for distribution drift
        try:
            ks_statistic, p_value = stats.ks_2samp(ref_values, curr_values)
            
            # Calculate mean shift
            mean_shift = abs(curr_values.mean() - ref_values.mean())
            mean_shift_percent = (mean_shift / (ref_values.mean() + 1e-10)) * 100
            
            drift_results[col] = {
                'ks_statistic': float(ks_statistic),
                'p_value': float(p_value),
                'is_drifted': bool(p_value < 0.05),  # Significant drift
                'mean_shift': float(mean_shift),
                'mean_shift_percent': float(mean_shift_percent),
                'reference_mean': float(ref_values.mean()),
                'current_mean': float(curr_values.mean()),
                'reference_std': float(ref_values.std()),
                'current_std': float(curr_values.std())
            }
        except Exception as e:
            print(f"   Warning: Error calculating drift for {col}: {e}")
            continue
    
    return drift_results

def detect_performance_drift(df_current, models_dir):
    """Detect performance degradation by testing models on recent data"""
    try:
        # Load models and preprocessors
        classifier = joblib.load(models_dir / 'alert_classifier_enhanced.joblib')
        scaler = joblib.load(models_dir / 'scaler.joblib')
        alert_type_encoder = joblib.load(models_dir / 'alert_type_encoder.joblib')
        
        # Prepare features (same as training)
        df = df_current.copy()
        df['error_rate'] = df['error_count'] / (df['request_count'] + 1)
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
        
        # Select features
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
            if feat not in df.columns:
                df[feat] = 0  # Add missing optional feature with default value
            if feat not in feature_columns:
                feature_columns.append(feat)
        
        X = df[feature_columns].copy()
        X_scaled = scaler.transform(X)
        
        # Encode targets
        y_true = alert_type_encoder.transform(df['alert_type'])
        
        # Predict
        y_pred = classifier.predict(X_scaled)
        accuracy = accuracy_score(y_true, y_pred)
        
        return {
            'current_accuracy': float(accuracy),
            'sample_count': len(df)
        }
    except Exception as e:
        print(f"   Warning: Error in performance drift detection: {e}")
        return None

def load_drift_log():
    """Load historical drift detection logs"""
    if DRIFT_LOG.exists():
        try:
            with open(DRIFT_LOG, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, ValueError):
            # If file is corrupted, start fresh
            print(f"   Warning: Corrupted drift log file, starting fresh...")
            return {'detections': []}
    return {'detections': []}

def save_drift_log(drift_log):
    """Save drift detection results"""
    DRIFT_LOG.parent.mkdir(exist_ok=True)
    with open(DRIFT_LOG, 'w') as f:
        json.dump(drift_log, f, indent=2)

def main():
    # Load reference data
    print("\nLoading reference training data...")
    reference_report = load_reference_data()
    if not reference_report:
        print("No reference training report found. Train models first.")
        return
    
    reference_accuracy = reference_report.get('test_performance', {}).get('alert_classifier', {}).get('accuracy', 0)
    print(f"Reference accuracy: {reference_accuracy:.4f} ({reference_accuracy*100:.2f}%)")
    
    # Load current data
    print("\nLoading current production data...")
    df_all, df_recent = load_current_data()
    if df_all is None:
        return
    
    print(f"Total alerts: {len(df_all)}")
    print(f"Recent alerts (last 7 days): {len(df_recent)}")
    
    if len(df_recent) < 50:
        print("Warning: Insufficient recent data for drift detection (need at least 50 samples)")
        return
    
    # Feature engineering for reference comparison
    print("\nPreparing features for comparison...")
    df_recent['error_rate'] = df_recent['error_count'] / (df_recent['request_count'] + 1)
    df_recent['hour_of_day'] = df_recent['timestamp'].dt.hour
    df_recent['day_of_week'] = df_recent['timestamp'].dt.dayofweek
    
    # Calculate statistical drift
    print("\nDetecting statistical drift...")
    feature_cols = [
        'error_count', 'request_count', 'average_response_time',
        'process_cpu_usage', 'process_memory_usage', 'error_rate'
    ]
    
    # Use full dataset as reference (simplified - in production, use training set)
    df_reference = df_all.copy()
    df_reference['error_rate'] = df_reference['error_count'] / (df_reference['request_count'] + 1)
    
    statistical_drift = calculate_statistical_drift(df_reference, df_recent, feature_cols)
    
    drifted_features = [col for col, result in statistical_drift.items() if result['is_drifted']]
    print(f"   Detected drift in {len(drifted_features)} features:")
    for col in drifted_features[:5]:  # Show top 5
        result = statistical_drift[col]
        print(f"   - {col}: KS={result['ks_statistic']:.4f}, p={result['p_value']:.4f}, shift={result['mean_shift_percent']:.1f}%")
    
    # Performance drift
    print("\nDetecting performance drift...")
    perf_result = detect_performance_drift(df_recent, MODEL_DIR)
    performance_drifted = False
    
    if perf_result:
        current_accuracy = perf_result['current_accuracy']
        accuracy_drop = reference_accuracy - current_accuracy
        accuracy_drop_percent = (accuracy_drop / reference_accuracy) * 100 if reference_accuracy > 0 else 0
        
        print(f"   Current accuracy: {current_accuracy:.4f} ({current_accuracy*100:.2f}%)")
        print(f"   Accuracy drop: {accuracy_drop:.4f} ({accuracy_drop_percent:.1f}%)")
        
        performance_drifted = bool(accuracy_drop > 0.05)  # 5% threshold
        if performance_drifted:
            print(f"   Warning: Performance drift detected! (>5% drop)")
        else:
            print(f"   Performance stable")
    
    # Compile results
    drift_result = {
        'timestamp': datetime.now().isoformat(),
        'reference_accuracy': float(reference_accuracy),
        'statistical_drift': statistical_drift,
        'drifted_features_count': len(drifted_features),
        'drifted_features': drifted_features,
        'performance_drift': perf_result,
        'performance_drifted': performance_drifted,
        'data_sample_size': len(df_recent)
    }
    
    # Load and update drift log
    drift_log = load_drift_log()
    drift_log['detections'].append(drift_result)
    drift_log['last_updated'] = datetime.now().isoformat()
    
    # Keep only last 100 detections
    if len(drift_log['detections']) > 100:
        drift_log['detections'] = drift_log['detections'][-100:]
    
    save_drift_log(drift_log)
    
    print("\n" + "=" * 80)
    print("DRIFT DETECTION SUMMARY")
    print("=" * 80)
    print(f"Statistical Drift: {len(drifted_features)} features drifted")
    if perf_result:
        print(f"Performance Drift: {'DETECTED' if performance_drifted else 'Stable'}")
    print(f"Results saved to: {DRIFT_LOG}")
    
    return drift_result

if __name__ == '__main__':
    main()

