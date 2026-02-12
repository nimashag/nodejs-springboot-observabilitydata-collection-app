"""
Phase 1: ML-Driven Priority Scoring Engine
Research Paper Reference: "Machine intelligence to dynamically adjust thresholds based on environmental context"

Features:
- Gradient Boosting for alert priority classification (P0-P3)
- Business-impact-aware scoring (0-100)
- Historical pattern learning
- Auto-triage capabilities
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import json
from datetime import datetime, timedelta
from pathlib import Path

class PriorityScoringEngine:
    def __init__(self, model_dir='models'):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        self.priority_classifier = None
        self.priority_scorer = None
        self.encoders = {}
        
        # Service criticality weights (business impact)
        self.service_criticality = {
            'users-service': 1.0,  # Most critical - authentication/authorization
            'orders-service': 0.9,  # High - core business logic
            'restaurants-service': 0.8,  # Medium-high - content management
            'delivery-service': 0.85  # High - customer experience
        }
        
        # Severity multipliers
        self.severity_weights = {
            'critical': 1.0,
            'high': 0.75,
            'medium': 0.5,
            'low': 0.25
        }
        
        # Time-of-day factors
        self.time_factors = {
            'peak_hours': (9, 18),  # 9 AM - 6 PM
            'peak_multiplier': 1.2,
            'off_hours_multiplier': 0.8
        }
    
    def load_data(self, csv_path='../output/alert-data-collection.csv'):
        """Load and preprocess alert data"""
        df = pd.read_csv(csv_path)
        
        # Convert timestamp to datetime
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Extract temporal features
        df['hour_of_day'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        df['is_peak_hours'] = df['hour_of_day'].between(
            self.time_factors['peak_hours'][0], 
            self.time_factors['peak_hours'][1]
        ).astype(int)
        
        # Calculate alert frequency (alerts per hour per service)
        df['alert_frequency'] = df.groupby(['service_name', df['timestamp'].dt.floor('H')])['alert_name'].transform('count')
        
        # Resolution time calculation (for resolved alerts)
        df['resolution_time'] = df['alert_duration'].fillna(0) / 1000  # Convert ms to seconds
        
        # Create target variable: Priority Level (P0-P3)
        # This is synthetic but based on logical rules - in production, use historical labels
        df['priority_level'] = self._assign_synthetic_priority(df)
        df['priority_score'] = self._calculate_priority_score(df)
        
        return df
    
    def _assign_synthetic_priority(self, df):
        """
        Assign priority levels based on logical rules
        P0 (Critical): high/critical severity + critical service + peak hours + high error rate
        P1 (High): high severity OR critical service + errors
        P2 (Medium): medium severity or low frequency
        P3 (Low): low severity + low frequency + off-hours
        """
        priority = []
        
        for idx, row in df.iterrows():
            score = 0
            
            # Severity contribution
            if row['severity'] in ['critical', 'high']:
                score += 40
            elif row['severity'] == 'medium':
                score += 20
            else:
                score += 5
            
            # Service criticality
            score += self.service_criticality.get(row['service_name'], 0.5) * 30
            
            # Error rate
            if row['error_count'] > 20:
                score += 20
            elif row['error_count'] > 10:
                score += 10
            
            # Time factors
            if row.get('is_peak_hours', 0) == 1:
                score += 10
            
            # Alert type
            if row['alert_type'] == 'availability':
                score += 15
            
            # Assign priority level
            if score >= 80:
                priority.append('P0')
            elif score >= 60:
                priority.append('P1')
            elif score >= 40:
                priority.append('P2')
            else:
                priority.append('P3')
        
        return priority
    
    def _calculate_priority_score(self, df):
        """Calculate continuous priority score (0-100)"""
        scores = []
        
        for idx, row in df.iterrows():
            score = 0.0
            
            # Base severity score
            score += self.severity_weights.get(row['severity'], 0.25) * 35
            
            # Service criticality
            score += self.service_criticality.get(row['service_name'], 0.5) * 25
            
            # Error rate impact
            error_ratio = min(row['error_count'] / 50, 1.0)
            score += error_ratio * 20
            
            # Time-of-day adjustment
            if row.get('is_peak_hours', 0) == 1:
                score *= self.time_factors['peak_multiplier']
            else:
                score *= self.time_factors['off_hours_multiplier']
            
            # Alert frequency (high frequency = higher priority)
            freq_factor = min(row.get('alert_frequency', 1) / 10, 1.0)
            score += freq_factor * 10
            
            # Response time impact
            if row['average_response_time'] > 1000:
                score += 10
            
            scores.append(min(score, 100))  # Cap at 100
        
        return scores
    
    def prepare_features(self, df):
        """Prepare features for ML models"""
        feature_columns = [
            'error_count', 'request_count', 'average_response_time',
            'process_cpu_usage', 'process_memory_usage',
            'hour_of_day', 'day_of_week', 'is_weekend', 'is_peak_hours',
            'alert_frequency', 'resolution_time'
        ]
        
        # Encode categorical variables
        if 'service_name' not in self.encoders:
            self.encoders['service_name'] = LabelEncoder()
            df['service_name_encoded'] = self.encoders['service_name'].fit_transform(df['service_name'])
        else:
            df['service_name_encoded'] = self.encoders['service_name'].transform(df['service_name'])
        
        if 'alert_type' not in self.encoders:
            self.encoders['alert_type'] = LabelEncoder()
            df['alert_type_encoded'] = self.encoders['alert_type'].fit_transform(df['alert_type'])
        else:
            df['alert_type_encoded'] = self.encoders['alert_type'].transform(df['alert_type'])
        
        if 'severity' not in self.encoders:
            self.encoders['severity'] = LabelEncoder()
            df['severity_encoded'] = self.encoders['severity'].fit_transform(df['severity'])
        else:
            df['severity_encoded'] = self.encoders['severity'].transform(df['severity'])
        
        feature_columns.extend(['service_name_encoded', 'alert_type_encoded', 'severity_encoded'])
        
        # Handle missing values
        X = df[feature_columns].fillna(0)
        
        return X
    
    def train(self, csv_path='../output/alert-data-collection.csv'):
        """Train priority scoring models"""
        print("[>] Loading data...")
        df = self.load_data(csv_path)
        
        print(f"[#] Dataset: {len(df)} alerts")
        print(f"Priority Distribution:\n{df['priority_level'].value_counts()}")
        
        X = self.prepare_features(df)
        y_class = df['priority_level']
        y_score = df['priority_score']
        
        # Split data
        X_train, X_test, y_class_train, y_class_test, y_score_train, y_score_test = train_test_split(
            X, y_class, y_score, test_size=0.2, random_state=42, stratify=y_class
        )
        
        print("\n[>] Training Priority Classifier (P0-P3)...")
        self.priority_classifier = GradientBoostingClassifier(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        self.priority_classifier.fit(X_train, y_class_train)
        
        # Evaluate classifier
        y_pred_class = self.priority_classifier.predict(X_test)
        print("\n[^] Classification Report:")
        print(classification_report(y_class_test, y_pred_class))
        
        print("\n[>] Training Priority Scorer (0-100)...")
        self.priority_scorer = RandomForestRegressor(
            n_estimators=200,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.priority_scorer.fit(X_train, y_score_train)
        
        # Evaluate scorer
        score_train = self.priority_scorer.score(X_train, y_score_train)
        score_test = self.priority_scorer.score(X_test, y_score_test)
        print(f"Scorer R² - Train: {score_train:.3f}, Test: {score_test:.3f}")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': self.priority_classifier.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\n[^] Top 10 Important Features:")
        print(feature_importance.head(10))
        
        # Save models
        self._save_models()
        
        # Generate report
        self._generate_report(df, feature_importance, y_class_test, y_pred_class)
        
        return {
            'classifier_accuracy': (y_pred_class == y_class_test).mean(),
            'scorer_r2': score_test,
            'feature_importance': feature_importance.to_dict('records')
        }
    
    def predict(self, alert_data):
        """
        Predict priority for new alert
        
        Args:
            alert_data: dict with alert features
            
        Returns:
            dict with priority_level, priority_score, confidence
        """
        if self.priority_classifier is None:
            self._load_models()
        
        # Convert to DataFrame
        df = pd.DataFrame([alert_data])
        
        # Add derived features
        df['hour_of_day'] = pd.to_datetime(df.get('timestamp', datetime.now())).dt.hour.iloc[0] if 'timestamp' in df else datetime.now().hour
        df['day_of_week'] = pd.to_datetime(df.get('timestamp', datetime.now())).dt.dayofweek.iloc[0] if 'timestamp' in df else datetime.now().weekday()
        df['is_weekend'] = 1 if df['day_of_week'].iloc[0] in [5, 6] else 0
        df['is_peak_hours'] = 1 if 9 <= df['hour_of_day'].iloc[0] <= 18 else 0
        df['alert_frequency'] = df.get('alert_frequency', 1)
        df['resolution_time'] = df.get('resolution_time', 0)
        
        X = self.prepare_features(df)
        
        # Predict
        priority_level = self.priority_classifier.predict(X)[0]
        priority_score = self.priority_scorer.predict(X)[0]
        confidence = self.priority_classifier.predict_proba(X).max()
        
        return {
            'priority_level': priority_level,
            'priority_score': float(priority_score),
            'confidence': float(confidence),
            'timestamp': datetime.now().isoformat()
        }
    
    def _save_models(self):
        """Save trained models and encoders"""
        joblib.dump(self.priority_classifier, self.model_dir / 'priority_classifier.joblib')
        joblib.dump(self.priority_scorer, self.model_dir / 'priority_scorer.joblib')
        joblib.dump(self.encoders, self.model_dir / 'priority_encoders.joblib')
        print(f"\n[OK] Models saved to {self.model_dir}")
    
    def _load_models(self):
        """Load trained models"""
        self.priority_classifier = joblib.load(self.model_dir / 'priority_classifier.joblib')
        self.priority_scorer = joblib.load(self.model_dir / 'priority_scorer.joblib')
        self.encoders = joblib.load(self.model_dir / 'priority_encoders.joblib')
    
    def _generate_report(self, df, feature_importance, y_test, y_pred):
        """Generate training report"""
        report = {
            'training_timestamp': datetime.now().isoformat(),
            'dataset_size': len(df),
            'priority_distribution': df['priority_level'].value_counts().to_dict(),
            'accuracy': float((y_test == y_pred).mean()),
            'top_features': feature_importance.head(10).to_dict('records'),
            'service_criticality': self.service_criticality,
            'severity_weights': self.severity_weights
        }
        
        with open(self.model_dir / 'priority_scoring_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n[i] Report saved to {self.model_dir / 'priority_scoring_report.json'}")

if __name__ == '__main__':
    print("=" * 80)
    print("[*] Phase 1: ML-Driven Priority Scoring Engine")
    print("=" * 80)
    
    engine = PriorityScoringEngine()
    results = engine.train()
    
    print("\n" + "=" * 80)
    print("[OK] Training Complete!")
    print(f"Classifier Accuracy: {results['classifier_accuracy']:.2%}")
    print(f"Scorer R²: {results['scorer_r2']:.3f}")
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
    
    prediction = engine.predict(sample_alert)
    print(f"\n[!] Prediction:")
    print(f"   Priority Level: {prediction['priority_level']}")
    print(f"   Priority Score: {prediction['priority_score']:.1f}/100")
    print(f"   Confidence: {prediction['confidence']:.2%}")

