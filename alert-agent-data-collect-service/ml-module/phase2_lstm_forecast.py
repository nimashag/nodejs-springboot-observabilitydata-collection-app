"""
Phase 2: LSTM-Based Predictive Alert Forecasting
Research Paper Reference: "LSTM networks capable of capturing long-term dependencies and complex temporal dynamics"

Features:
- Predict alerts 15-30 minutes before they fire
- Train separate models per service
- Input: Last 10 time points of error_count, response_time, cpu_usage, memory_usage
- Output: Probability of alert firing in next 15/30/60 minutes
- Proactive incident prevention
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import json
import joblib

try:
    import tensorflow as tf
    from tensorflow import keras
    from keras import layers, models
    from sklearn.preprocessing import MinMaxScaler
    TENSORFLOW_AVAILABLE = True
except ImportError:
    print("[!] TensorFlow not available. Install with: pip install tensorflow")
    TENSORFLOW_AVAILABLE = False

class LSTMAlertForecaster:
    def __init__(self, model_dir='models'):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        # LSTM models per service
        self.lstm_models = {}
        self.scalers = {}
        
        # Configuration
        self.sequence_length = 10  # Look back 10 time points
        self.forecast_horizons = [15, 30, 60]  # Minutes ahead to forecast
        
        # Feature columns
        self.feature_columns = ['error_count', 'average_response_time', 
                               'process_cpu_usage', 'process_memory_usage']
        
        # Thresholds for alert prediction
        self.alert_thresholds = {
            'error_count': 10,
            'average_response_time': 1000,
            'process_cpu_usage': 80,
            'process_memory_usage': 3 * 1024**3  # 3 GB
        }
    
    def load_data(self, csv_path='../output/alert-data-collection.csv'):
        """Load and preprocess time-series data"""
        df = pd.read_csv(csv_path)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp')
        
        return df
    
    def prepare_time_series(self, df, service_name):
        """
        Prepare time series data for LSTM training
        
        Args:
            df: Alert dataframe
            service_name: Service to prepare data for
            
        Returns:
            X: Input sequences (samples, sequence_length, features)
            y: Target values (samples, features)
        """
        # Filter service data
        service_data = df[df['service_name'] == service_name].copy()
        
        # Aggregate by 5-minute intervals
        service_data.set_index('timestamp', inplace=True)
        ts_data = service_data[self.feature_columns].resample('5T').agg({
            'error_count': 'sum',
            'average_response_time': 'mean',
            'process_cpu_usage': 'mean',
            'process_memory_usage': 'mean'
        }).fillna(method='ffill').fillna(0)
        
        if len(ts_data) < self.sequence_length + 5:
            print(f"   [!] Insufficient data for {service_name} (need {self.sequence_length + 5}+ points)")
            return None, None
        
        # Scale features
        scaler = MinMaxScaler()
        scaled_data = scaler.fit_transform(ts_data.values)
        
        # Store scaler
        self.scalers[service_name] = scaler
        
        # Create sequences
        X, y = [], []
        
        for i in range(len(scaled_data) - self.sequence_length - 1):
            X.append(scaled_data[i:i+self.sequence_length])
            y.append(scaled_data[i+self.sequence_length])
        
        return np.array(X), np.array(y)
    
    def build_lstm_model(self, input_shape):
        """
        Build LSTM model architecture
        
        Args:
            input_shape: (sequence_length, num_features)
            
        Returns:
            Compiled Keras model
        """
        model = models.Sequential([
            layers.LSTM(64, return_sequences=True, input_shape=input_shape),
            layers.Dropout(0.2),
            layers.LSTM(32, return_sequences=False),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(input_shape[1])  # Predict same number of features
        ])
        
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def train(self, csv_path='../output/alert-data-collection.csv', epochs=50):
        """Train LSTM models for each service"""
        if not TENSORFLOW_AVAILABLE:
            print("[X] TensorFlow not available. Skipping LSTM training.")
            return {'status': 'skipped', 'reason': 'TensorFlow not installed'}
        
        print("[>] Loading data...")
        df = self.load_data(csv_path)
        
        services = df['service_name'].unique()
        print(f"[#] Training LSTM models for {len(services)} services")
        
        results = {}
        
        for service in services:
            print(f"\n[>] Training LSTM for {service}...")
            
            # Prepare sequences
            X, y = self.prepare_time_series(df, service)
            
            if X is None:
                results[service] = {'status': 'skipped', 'reason': 'insufficient_data'}
                continue
            
            # Split train/test
            split_idx = int(len(X) * 0.8)
            X_train, X_test = X[:split_idx], X[split_idx:]
            y_train, y_test = y[:split_idx], y[split_idx:]
            
            print(f"   Training samples: {len(X_train)}, Test samples: {len(X_test)}")
            
            # Build and train model
            model = self.build_lstm_model(input_shape=(self.sequence_length, len(self.feature_columns)))
            
            # Early stopping
            early_stopping = keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True
            )
            
            history = model.fit(
                X_train, y_train,
                validation_data=(X_test, y_test),
                epochs=epochs,
                batch_size=32,
                callbacks=[early_stopping],
                verbose=0
            )
            
            # Evaluate
            test_loss, test_mae = model.evaluate(X_test, y_test, verbose=0)
            
            print(f"   Test Loss: {test_loss:.4f}, Test MAE: {test_mae:.4f}")
            
            # Save model
            model_path = self.model_dir / f'lstm_{service}.keras'
            model.save(model_path)
            
            self.lstm_models[service] = model
            
            results[service] = {
                'status': 'success',
                'test_loss': float(test_loss),
                'test_mae': float(test_mae),
                'train_samples': len(X_train),
                'test_samples': len(X_test)
            }
        
        # Save scalers
        joblib.dump(self.scalers, self.model_dir / 'lstm_scalers.joblib')
        
        # Save configuration
        config = {
            'sequence_length': self.sequence_length,
            'forecast_horizons': self.forecast_horizons,
            'feature_columns': self.feature_columns,
            'alert_thresholds': self.alert_thresholds
        }
        
        with open(self.model_dir / 'lstm_config.json', 'w') as f:
            json.dump(config, f, indent=2)
        
        # Save results
        with open(self.model_dir / 'lstm_training_results.json', 'w') as f:
            json.dump({
                'training_timestamp': datetime.now().isoformat(),
                'results': results
            }, f, indent=2)
        
        print(f"\n[OK] Models saved to {self.model_dir}")
        
        return results
    
    def predict_breach(self, service_name, recent_data, horizon_minutes=15):
        """
        Predict probability of alert breach in next N minutes
        
        Args:
            service_name: Service to forecast
            recent_data: List of recent metric dictionaries (last 10 time points)
            horizon_minutes: How far ahead to forecast (15, 30, or 60 minutes)
            
        Returns:
            Dict with predictions, probabilities, and confidence
        """
        if not TENSORFLOW_AVAILABLE:
            return {'error': 'TensorFlow not available'}
        
        if service_name not in self.lstm_models:
            # Load model if not in memory
            model_path = self.model_dir / f'lstm_{service_name}.keras'
            if not model_path.exists():
                return {'error': f'No model found for {service_name}'}
            
            self.lstm_models[service_name] = keras.models.load_model(model_path)
            self.scalers = joblib.load(self.model_dir / 'lstm_scalers.joblib')
        
        model = self.lstm_models[service_name]
        scaler = self.scalers[service_name]
        
        # Prepare input sequence
        if len(recent_data) < self.sequence_length:
            return {'error': f'Need at least {self.sequence_length} time points'}
        
        # Extract features from recent data
        features = []
        for data_point in recent_data[-self.sequence_length:]:
            features.append([
                data_point.get('error_count', 0),
                data_point.get('average_response_time', 0),
                data_point.get('process_cpu_usage', 0),
                data_point.get('process_memory_usage', 0)
            ])
        
        # Scale
        scaled_features = scaler.transform(np.array(features))
        X = scaled_features.reshape(1, self.sequence_length, len(self.feature_columns))
        
        # Forecast multiple steps ahead
        forecasts = []
        current_sequence = X[0]
        
        steps_ahead = horizon_minutes // 5  # Each step is 5 minutes
        
        for step in range(steps_ahead):
            # Predict next step
            prediction = model.predict(current_sequence.reshape(1, self.sequence_length, -1), verbose=0)
            forecasts.append(prediction[0])
            
            # Update sequence (shift left, add prediction)
            current_sequence = np.vstack([current_sequence[1:], prediction[0]])
        
        # Inverse transform predictions
        forecasts_original = scaler.inverse_transform(np.array(forecasts))
        
        # Check for threshold breaches
        breaches = {}
        breach_probabilities = {}
        
        for i, feature in enumerate(self.feature_columns):
            threshold = self.alert_thresholds[feature]
            feature_forecasts = forecasts_original[:, i]
            
            # Check if any forecast exceeds threshold
            breach_detected = any(val > threshold for val in feature_forecasts)
            
            # Calculate breach probability (how far above threshold)
            if breach_detected:
                breach_idx = next(idx for idx, val in enumerate(feature_forecasts) if val > threshold)
                breach_time = (breach_idx + 1) * 5  # Minutes
                breach_magnitude = (feature_forecasts[breach_idx] - threshold) / threshold * 100
                
                breaches[feature] = {
                    'breach_detected': True,
                    'time_to_breach_minutes': breach_time,
                    'forecasted_value': float(feature_forecasts[breach_idx]),
                    'threshold': threshold,
                    'breach_magnitude_percent': float(breach_magnitude)
                }
                breach_probabilities[feature] = min(breach_magnitude / 100, 1.0)
            else:
                breaches[feature] = {
                    'breach_detected': False,
                    'forecasted_value': float(feature_forecasts[-1]),
                    'threshold': threshold
                }
                breach_probabilities[feature] = 0.0
        
        # Overall breach probability (max of all features)
        overall_breach_probability = max(breach_probabilities.values())
        any_breach = any(b['breach_detected'] for b in breaches.values())
        
        return {
            'service': service_name,
            'horizon_minutes': horizon_minutes,
            'any_breach_predicted': any_breach,
            'overall_breach_probability': float(overall_breach_probability),
            'breaches_by_metric': breaches,
            'forecasted_values': {
                feature: float(forecasts_original[-1, i])
                for i, feature in enumerate(self.feature_columns)
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def get_forecast_series(self, service_name, recent_data, hours=1):
        """
        Get detailed forecast series for visualization
        
        Args:
            service_name: Service name
            recent_data: Recent data points
            hours: Hours to forecast ahead
            
        Returns:
            Time series of forecasts
        """
        if not TENSORFLOW_AVAILABLE:
            return {'error': 'TensorFlow not available'}
        
        steps = hours * 12  # 5-minute intervals
        
        if service_name not in self.lstm_models:
            model_path = self.model_dir / f'lstm_{service_name}.keras'
            if not model_path.exists():
                return {'error': f'No model found for {service_name}'}
            
            self.lstm_models[service_name] = keras.models.load_model(model_path)
            self.scalers = joblib.load(self.model_dir / 'lstm_scalers.joblib')
        
        model = self.lstm_models[service_name]
        scaler = self.scalers[service_name]
        
        # Prepare input
        features = []
        for data_point in recent_data[-self.sequence_length:]:
            features.append([
                data_point.get('error_count', 0),
                data_point.get('average_response_time', 0),
                data_point.get('process_cpu_usage', 0),
                data_point.get('process_memory_usage', 0)
            ])
        
        scaled_features = scaler.transform(np.array(features))
        current_sequence = scaled_features
        
        # Generate forecast series
        forecast_series = []
        now = datetime.now()
        
        for step in range(steps):
            prediction = model.predict(current_sequence.reshape(1, self.sequence_length, -1), verbose=0)
            forecast_series.append(prediction[0])
            current_sequence = np.vstack([current_sequence[1:], prediction[0]])
        
        # Inverse transform
        forecast_series = scaler.inverse_transform(np.array(forecast_series))
        
        # Format results
        timestamps = [now + timedelta(minutes=(i+1)*5) for i in range(steps)]
        
        return {
            'service': service_name,
            'forecast': [
                {
                    'timestamp': timestamps[i].isoformat(),
                    'minutes_ahead': (i+1) * 5,
                    **{self.feature_columns[j]: float(forecast_series[i, j])
                       for j in range(len(self.feature_columns))}
                }
                for i in range(steps)
            ]
        }

if __name__ == '__main__':
    print("=" * 80)
    print("[*] Phase 2: LSTM Predictive Alert Forecasting")
    print("=" * 80)
    
    if not TENSORFLOW_AVAILABLE:
        print("\n[X] TensorFlow not installed. Install with:")
        print("    pip install tensorflow")
        exit(1)
    
    forecaster = LSTMAlertForecaster()
    results = forecaster.train(epochs=50)
    
    print("\n" + "=" * 80)
    print("[OK] Training Complete!")
    print("=" * 80)
    
    for service, result in results.items():
        print(f"\n{service}:")
        print(f"  Status: {result['status']}")
        if result['status'] == 'success':
            print(f"  Test MAE: {result['test_mae']:.4f}")
            print(f"  Samples: {result['train_samples']} train, {result['test_samples']} test")
    
    print("\n" + "=" * 80)
    print("[OK] LSTM Forecasting Models Ready!")
    print("=" * 80)


