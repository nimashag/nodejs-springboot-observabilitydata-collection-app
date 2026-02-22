import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import json
from datetime import datetime, timedelta
from pathlib import Path

class TTRPredictionEngine:
    def __init__(self, model_dir='models'):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        self.ttr_model = None
        self.confidence_model = None
        self.encoders = {}
        
        # SLA thresholds (in seconds)
        self.sla_thresholds = {
            'P0': 15 * 60,      # 15 minutes
            'P1': 60 * 60,      # 1 hour
            'P2': 4 * 60 * 60,  # 4 hours
            'P3': 24 * 60 * 60  # 24 hours
        }
        
        # Historical resolution patterns (will be learned from data)
        self.resolution_patterns = {}
    
    def load_data(self, csv_path='../output/alert-data-collection.csv'):
        """Load and preprocess alert data for TTR prediction"""
        df = pd.read_csv(csv_path)
        
        # Convert timestamp to datetime
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Filter only resolved alerts (they have resolution time)
        df_resolved = df[df['alert_state'] == 'resolved'].copy()
        
        if len(df_resolved) == 0:
            print("[!]  No resolved alerts found in dataset. Using synthetic data for training.")
            return self._create_synthetic_data(df)
        
        # Convert alert_duration from ms to seconds
        df_resolved['ttr_seconds'] = df_resolved['alert_duration'] / 1000
        
        # Extract temporal features
        df_resolved['hour_of_day'] = df_resolved['timestamp'].dt.hour
        df_resolved['day_of_week'] = df_resolved['timestamp'].dt.dayofweek
        df_resolved['is_weekend'] = df_resolved['day_of_week'].isin([5, 6]).astype(int)
        df_resolved['is_peak_hours'] = df_resolved['hour_of_day'].between(9, 18).astype(int)
        
        # Calculate moving averages of error counts
        df_resolved = df_resolved.sort_values('timestamp')
        df_resolved['error_rate_ma'] = df_resolved.groupby('service_name')['error_count'].transform(
            lambda x: x.rolling(window=5, min_periods=1).mean()
        )
        
        return df_resolved
    
    def _create_synthetic_data(self, df):
        """Create synthetic TTR data based on logical patterns"""
        print("[W] Creating synthetic resolution time data...")
        
        df_synthetic = df.copy()
        
        # Generate synthetic TTR based on alert characteristics
        ttr_seconds = []
        
        for idx, row in df_synthetic.iterrows():
            base_ttr = 300  # 5 minutes base
            
            # Severity impact
            if row['severity'] == 'critical':
                base_ttr *= 3
            elif row['severity'] == 'high':
                base_ttr *= 2
            elif row['severity'] == 'medium':
                base_ttr *= 1.5
            
            # Alert type impact
            if row['alert_type'] == 'availability':
                base_ttr *= 2
            
            # Error count impact
            base_ttr += row['error_count'] * 10
            
            # Service impact
            if row['service_name'] == 'users-service':
                base_ttr *= 0.8  # Java service, more stable
            else:
                base_ttr *= 1.0
            
            # Add randomness
            ttr = base_ttr * np.random.uniform(0.7, 1.3)
            ttr_seconds.append(max(ttr, 60))  # Minimum 1 minute
        
        df_synthetic['ttr_seconds'] = ttr_seconds
        df_synthetic['hour_of_day'] = df_synthetic['timestamp'].dt.hour
        df_synthetic['day_of_week'] = df_synthetic['timestamp'].dt.dayofweek
        df_synthetic['is_weekend'] = df_synthetic['day_of_week'].isin([5, 6]).astype(int)
        df_synthetic['is_peak_hours'] = df_synthetic['hour_of_day'].between(9, 18).astype(int)
        df_synthetic['error_rate_ma'] = df_synthetic.groupby('service_name')['error_count'].transform('mean')
        
        return df_synthetic
    
    def prepare_features(self, df):
        """Prepare features for TTR prediction"""
        feature_columns = [
            'error_count', 'request_count', 'average_response_time',
            'process_cpu_usage', 'process_memory_usage',
            'hour_of_day', 'day_of_week', 'is_weekend', 'is_peak_hours',
            'error_rate_ma'
        ]
        
        # Encode categorical variables with handling for unseen labels
        if 'service_name' not in self.encoders:
            self.encoders['service_name'] = LabelEncoder()
            df['service_name_encoded'] = self.encoders['service_name'].fit_transform(df['service_name'])
        else:
            # Handle unseen service names
            known_services = set(self.encoders['service_name'].classes_)
            df['service_name_encoded'] = df['service_name'].apply(
                lambda x: self.encoders['service_name'].transform([x])[0] 
                if x in known_services 
                else self.encoders['service_name'].transform(['users-service'])[0]  # Default fallback
            )
        
        if 'alert_type' not in self.encoders:
            self.encoders['alert_type'] = LabelEncoder()
            df['alert_type_encoded'] = self.encoders['alert_type'].fit_transform(df['alert_type'])
        else:
            # Handle unseen alert types
            known_types = set(self.encoders['alert_type'].classes_)
            df['alert_type_encoded'] = df['alert_type'].apply(
                lambda x: self.encoders['alert_type'].transform([x])[0] 
                if x in known_types 
                else self.encoders['alert_type'].transform(['error'])[0]  # Default fallback
            )
        
        if 'severity' not in self.encoders:
            self.encoders['severity'] = LabelEncoder()
            df['severity_encoded'] = self.encoders['severity'].fit_transform(df['severity'])
        else:
            # Handle unseen severity labels - map to closest known severity
            known_severities = set(self.encoders['severity'].classes_)
            
            def map_severity(severity):
                if severity in known_severities:
                    return self.encoders['severity'].transform([severity])[0]
                # Map unseen severities to closest known ones
                severity_lower = severity.lower()
                if severity_lower in ['critical', 'high']:
                    # Try 'high' first, then 'critical', then 'medium'
                    for fallback in ['high', 'critical', 'medium']:
                        if fallback in known_severities:
                            return self.encoders['severity'].transform([fallback])[0]
                elif severity_lower == 'medium':
                    # Try 'medium' first, then 'low'
                    for fallback in ['medium', 'low']:
                        if fallback in known_severities:
                            return self.encoders['severity'].transform([fallback])[0]
                else:  # low or unknown
                    # Try 'low' first, then 'medium'
                    for fallback in ['low', 'medium']:
                        if fallback in known_severities:
                            return self.encoders['severity'].transform([fallback])[0]
                # Ultimate fallback: use first known severity
                return self.encoders['severity'].transform([self.encoders['severity'].classes_[0]])[0]
            
            df['severity_encoded'] = df['severity'].apply(map_severity)
        
        feature_columns.extend(['service_name_encoded', 'alert_type_encoded', 'severity_encoded'])
        
        # Handle missing values
        X = df[feature_columns].fillna(0)
        
        return X
    
    def train(self, csv_path='../output/alert-data-collection.csv'):
        """Train TTR prediction model"""
        print("[>] Loading data...")
        df = self.load_data(csv_path)
        
        print(f"[#] Dataset: {len(df)} alerts with resolution times")
        print(f"TTR Statistics (seconds):")
        print(f"  Mean: {df['ttr_seconds'].mean():.1f}s ({df['ttr_seconds'].mean()/60:.1f} min)")
        print(f"  Median: {df['ttr_seconds'].median():.1f}s ({df['ttr_seconds'].median()/60:.1f} min)")
        print(f"  Max: {df['ttr_seconds'].max():.1f}s ({df['ttr_seconds'].max()/60:.1f} min)")
        
        X = self.prepare_features(df)
        y = df['ttr_seconds']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        print("\n[>] Training TTR Prediction Model (Random Forest)...")
        self.ttr_model = RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        )
        self.ttr_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred_train = self.ttr_model.predict(X_train)
        y_pred_test = self.ttr_model.predict(X_test)
        
        train_mae = mean_absolute_error(y_train, y_pred_train)
        test_mae = mean_absolute_error(y_test, y_pred_test)
        train_r2 = r2_score(y_train, y_pred_train)
        test_r2 = r2_score(y_test, y_pred_test)
        
        print(f"\n[^] Model Performance:")
        print(f"  Train MAE: {train_mae:.1f}s ({train_mae/60:.1f} min)")
        print(f"  Test MAE: {test_mae:.1f}s ({test_mae/60:.1f} min)")
        print(f"  Train R²: {train_r2:.3f}")
        print(f"  Test R²: {test_r2:.3f}")
        
        # Calculate prediction intervals (confidence bounds)
        print("\n[>] Training Confidence Interval Model...")
        residuals = np.abs(y_train - y_pred_train)
        
        # Train a model to predict uncertainty
        self.confidence_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            random_state=42
        )
        self.confidence_model.fit(X_train, residuals)
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': self.ttr_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\n[^] Top 10 Important Features:")
        print(feature_importance.head(10))
        
        # Learn resolution patterns
        self._learn_resolution_patterns(df)
        
        # Save models
        self._save_models()
        
        # Generate report
        self._generate_report(df, feature_importance, test_mae, test_r2)
        
        return {
            'mae': test_mae,
            'r2': test_r2,
            'feature_importance': feature_importance.to_dict('records')
        }
    
    def predict(self, alert_data, priority_level='P2'):
        """
        Predict TTR for new alert with confidence intervals
        
        Args:
            alert_data: dict with alert features
            priority_level: Priority level (P0-P3) for SLA comparison
            
        Returns:
            dict with ttr_seconds, ttr_minutes, confidence_lower, confidence_upper, sla_breach_risk
        """
        if self.ttr_model is None:
            self._load_models()
        
        # Convert to DataFrame
        df = pd.DataFrame([alert_data])
        
        # Add derived features
        df['hour_of_day'] = pd.to_datetime(df.get('timestamp', datetime.now())).dt.hour.iloc[0] if 'timestamp' in df else datetime.now().hour
        df['day_of_week'] = pd.to_datetime(df.get('timestamp', datetime.now())).dt.dayofweek.iloc[0] if 'timestamp' in df else datetime.now().weekday()
        df['is_weekend'] = 1 if df['day_of_week'].iloc[0] in [5, 6] else 0
        df['is_peak_hours'] = 1 if 9 <= df['hour_of_day'].iloc[0] <= 18 else 0
        df['error_rate_ma'] = df.get('error_count', 5)
        
        X = self.prepare_features(df)
        
        # Predict TTR
        ttr_seconds = self.ttr_model.predict(X)[0]
        
        # Predict confidence interval
        uncertainty = self.confidence_model.predict(X)[0] if self.confidence_model else ttr_seconds * 0.3
        
        confidence_lower = max(ttr_seconds - uncertainty, 60)  # Minimum 1 minute
        confidence_upper = ttr_seconds + uncertainty
        
        # SLA breach risk
        sla_threshold = self.sla_thresholds.get(priority_level, 3600)
        sla_breach_risk = confidence_upper > sla_threshold
        sla_breach_probability = min((ttr_seconds / sla_threshold) * 100, 100)
        
        # Categorize TTR
        if ttr_seconds < 300:  # 5 minutes
            category = "Quick Fix"
        elif ttr_seconds < 1800:  # 30 minutes
            category = "Standard"
        elif ttr_seconds < 7200:  # 2 hours
            category = "Complex"
        else:
            category = "Extended"
        
        return {
            'ttr_seconds': float(ttr_seconds),
            'ttr_minutes': float(ttr_seconds / 60),
            'ttr_hours': float(ttr_seconds / 3600),
            'ttr_category': category,
            'confidence_lower_minutes': float(confidence_lower / 60),
            'confidence_upper_minutes': float(confidence_upper / 60),
            'sla_threshold_minutes': float(sla_threshold / 60),
            'sla_breach_risk': bool(sla_breach_risk),
            'sla_breach_probability': float(sla_breach_probability),
            'timestamp': datetime.now().isoformat()
        }
    
    def _learn_resolution_patterns(self, df):
        """Learn common resolution patterns from historical data"""
        patterns = {}
        
        for service in df['service_name'].unique():
            service_data = df[df['service_name'] == service]
            
            for alert_type in service_data['alert_type'].unique():
                alert_data = service_data[service_data['alert_type'] == alert_type]
                
                key = f"{service}_{alert_type}"
                patterns[key] = {
                    'count': len(alert_data),
                    'avg_ttr': float(alert_data['ttr_seconds'].mean()),
                    'median_ttr': float(alert_data['ttr_seconds'].median()),
                    'max_ttr': float(alert_data['ttr_seconds'].max()),
                    'min_ttr': float(alert_data['ttr_seconds'].min())
                }
        
        self.resolution_patterns = patterns
    
    def _save_models(self):
        """Save trained models and encoders"""
        joblib.dump(self.ttr_model, self.model_dir / 'ttr_predictor.joblib')
        if self.confidence_model:
            joblib.dump(self.confidence_model, self.model_dir / 'ttr_confidence_model.joblib')
        joblib.dump(self.encoders, self.model_dir / 'ttr_encoders.joblib')
        joblib.dump(self.resolution_patterns, self.model_dir / 'resolution_patterns.joblib')
        print(f"\n[OK] Models saved to {self.model_dir}")
    
    def _load_models(self):
        """Load trained models"""
        self.ttr_model = joblib.load(self.model_dir / 'ttr_predictor.joblib')
        try:
            self.confidence_model = joblib.load(self.model_dir / 'ttr_confidence_model.joblib')
        except FileNotFoundError:
            self.confidence_model = None
        self.encoders = joblib.load(self.model_dir / 'ttr_encoders.joblib')
        try:
            self.resolution_patterns = joblib.load(self.model_dir / 'resolution_patterns.joblib')
        except FileNotFoundError:
            self.resolution_patterns = {}
    
    def _generate_report(self, df, feature_importance, mae, r2):
        """Generate training report"""
        report = {
            'training_timestamp': datetime.now().isoformat(),
            'dataset_size': len(df),
            'ttr_statistics': {
                'mean_seconds': float(df['ttr_seconds'].mean()),
                'median_seconds': float(df['ttr_seconds'].median()),
                'std_seconds': float(df['ttr_seconds'].std()),
                'min_seconds': float(df['ttr_seconds'].min()),
                'max_seconds': float(df['ttr_seconds'].max())
            },
            'model_performance': {
                'mae_seconds': float(mae),
                'mae_minutes': float(mae / 60),
                'r2_score': float(r2)
            },
            'top_features': feature_importance.head(10).to_dict('records'),
            'sla_thresholds': {k: v/60 for k, v in self.sla_thresholds.items()},
            'resolution_patterns': self.resolution_patterns
        }
        
        with open(self.model_dir / 'ttr_prediction_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n[i] Report saved to {self.model_dir / 'ttr_prediction_report.json'}")

if __name__ == '__main__':
    print("=" * 80)
    print("[*] Phase 1: Time-to-Resolve (TTR) Prediction Engine")
    print("=" * 80)
    
    engine = TTRPredictionEngine()
    results = engine.train()
    
    print("\n" + "=" * 80)
    print("[OK] Training Complete!")
    print(f"MAE: {results['mae']/60:.1f} minutes")
    print(f"R²: {results['r2']:.3f}")
    print("=" * 80)
    
    # Test prediction
    print("\n[T] Testing prediction on sample alert...")
    sample_alert = {
        'service_name': 'users-service',
        'alert_type': 'availability',
        'severity': 'high',
        'error_count': 25,
        'request_count': 100,
        'average_response_time': 1500,
        'process_cpu_usage': 85.0,
        'process_memory_usage': 2000000000,
        'timestamp': datetime.now().isoformat()
    }
    
    prediction = engine.predict(sample_alert, priority_level='P1')
    print(f"\n[!] Prediction:")
    print(f"   Estimated TTR: {prediction['ttr_minutes']:.1f} minutes ({prediction['ttr_category']})")
    print(f"   Confidence Range: {prediction['confidence_lower_minutes']:.1f} - {prediction['confidence_upper_minutes']:.1f} minutes")
    print(f"   SLA Threshold: {prediction['sla_threshold_minutes']:.1f} minutes (P1)")
    print(f"   SLA Breach Risk: {'[!] YES' if prediction['sla_breach_risk'] else '[OK] NO'} ({prediction['sla_breach_probability']:.1f}%)")

