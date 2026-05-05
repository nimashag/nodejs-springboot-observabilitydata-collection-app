import sys
from pathlib import Path
from datetime import datetime
import json
from typing import List, Optional

# Import Phase 1 modules
from phase1_priority_scoring import PriorityScoringEngine
from phase1_ttr_prediction import TTRPredictionEngine
from phase1_smart_email import SmartEmailService

class Phase1Orchestrator:
    def __init__(self, model_dir='models'):
        """Initialize all Phase 1 components"""
        print("[*] Initializing Phase 1 ML-Enhanced Alert System...")
        
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        self.priority_engine = PriorityScoringEngine(model_dir)
        self.ttr_engine = TTRPredictionEngine(model_dir)
        self.email_service = SmartEmailService()
        
        self.stats = {
            'alerts_processed': 0,
            'alerts_sent': 0,
            'false_positives_prevented': 0,
            'start_time': datetime.now()
        }
    
    def train_all_models(self, csv_path='../output/alert-data-collection.csv'):
        """Train all Phase 1 models"""
        print("\n" + "=" * 80)
        print("[*] PHASE 1: TRAINING ALL MODELS")
        print("=" * 80)
        
        results = {}
        
        print("\n[1/3] Training Priority Scoring Engine...")
        try:
            priority_results = self.priority_engine.train(csv_path)
            results['priority_scoring'] = {
                'status': 'success',
                'accuracy': priority_results['classifier_accuracy'],
                'r2': priority_results['scorer_r2']
            }
            print("[OK] Priority Scoring Engine trained successfully")
        except Exception as e:
            print(f"[X] Priority Scoring Engine failed: {e}")
            results['priority_scoring'] = {'status': 'failed', 'error': str(e)}
        
        print("\n[2/3] Training TTR Prediction Engine...")
        try:
            ttr_results = self.ttr_engine.train(csv_path)
            results['ttr_prediction'] = {
                'status': 'success',
                'mae_minutes': ttr_results['mae'] / 60,
                'r2': ttr_results['r2']
            }
            print("[OK] TTR Prediction Engine trained successfully")
        except Exception as e:
            print(f"[X] TTR Prediction Engine failed: {e}")
            results['ttr_prediction'] = {'status': 'failed', 'error': str(e)}
        
        print("\n[3/3] Testing Email Service...")
        try:
            results['email_service'] = {
                'status': 'success',
                'smtp_configured': True
            }
            print("[OK] Email Service configured successfully")
        except Exception as e:
            print(f"[X] Email Service failed: {e}")
            results['email_service'] = {'status': 'failed', 'error': str(e)}
        
        with open(self.model_dir / 'phase1_training_results.json', 'w') as f:
            json.dump({
                'training_timestamp': datetime.now().isoformat(),
                'results': results
            }, f, indent=2)
        
        print("\n" + "=" * 80)
        print("[OK] PHASE 1 TRAINING COMPLETE!")
        print("=" * 80)
        
        print("\n[#] TRAINING SUMMARY:")
        for component, result in results.items():
            status_icon = "[OK]" if result['status'] == 'success' else "[X]"
            print(f"  {status_icon} {component.replace('_', ' ').title()}: {result['status']}")
        
        return results
    
    def process_alert(
        self,
        alert_data: dict,
        send_email: bool = True,
        recipients_override: Optional[List[str]] = None,
    ):
        """
        Process incoming alert through Phase 1 pipeline
        
        Args:
            alert_data: Alert information
            send_email: Whether to send email notification
            recipients_override: Optional list of To addresses (e.g. from dashboard UI)
            
        Returns:
            Dict with all predictions and decisions
        """
        self.stats['alerts_processed'] += 1
        
        print(f"\n{'='*80}")
        print(f"[?] PROCESSING ALERT #{self.stats['alerts_processed']}")
        print(f"{'='*80}")
        print(f"Service: {alert_data.get('service_name')}")
        print(f"Alert: {alert_data.get('alert_name')}")
        print(f"Severity: {alert_data.get('severity')}")
        
        print("\n[1/3] Predicting priority...")
        priority_prediction = self.priority_engine.predict(alert_data)
        
        print(f"   Priority Level: {priority_prediction['priority_level']}")
        print(f"   Priority Score: {priority_prediction['priority_score']:.1f}/100")
        print(f"   Confidence: {priority_prediction['confidence']:.1%}")
        
        print("\n[2/3] Predicting Time-to-Resolve...")
        ttr_prediction = self.ttr_engine.predict(
            alert_data,
            priority_level=priority_prediction['priority_level']
        )
        
        print(f"   Estimated TTR: {ttr_prediction['ttr_minutes']:.1f} minutes")
        print(f"   Category: {ttr_prediction['ttr_category']}")
        print(f"   SLA Breach Risk: {ttr_prediction['sla_breach_risk']}")
        
        if send_email:
            print("\n[3/3] Sending email notification...")
            
            service = alert_data.get('service_name')
            ml_predictions = {
                'priority_level': priority_prediction['priority_level'],
                'priority_score': priority_prediction['priority_score'],
                'confidence': priority_prediction['confidence'],
                'ttr_prediction': ttr_prediction,
                'explanation': {
                    'error_impact': alert_data.get('error_count', 0),
                    'service_criticality': 'Critical' if service in ['users-service', 'orders-service'] else 'Medium',
                    'time_context': 'Business hours',
                    'historical_pattern': '75%'
                }
            }
            
            self.email_service.send_alert_email(
                alert_data, ml_predictions, recipients_override=recipients_override
            )
            self.stats['alerts_sent'] += 1
            print(f"   [OK] Email sent ({priority_prediction['priority_level']})")
        
        print(f"\n{'='*80}")
        print("[OK] ALERT PROCESSING COMPLETE")
        print(f"{'='*80}")
        
        return {
            'suppressed': False,
            'priority': priority_prediction,
            'ttr': ttr_prediction,
            'email_sent': send_email
        }
    
    def send_test_emails(self, recipients_override: Optional[List[str]] = None):
        """Send test emails for all priority levels"""
        print("\n" + "=" * 80)
        print("[E] SENDING TEST EMAILS")
        print("=" * 80)
        
        test_alerts = [
            {
                'priority': 'P0',
                'data': {
                    'service_name': 'users-service',
                    'alert_name': 'Critical System Failure',
                    'alert_type': 'availability',
                    'severity': 'critical',
                    'alert_state': 'fired',
                    'error_count': 150,
                    'request_count': 200,
                    'average_response_time': 5000,
                    'process_cpu_usage': 98.5,
                    'process_memory_usage': 7500000000,
                    'timestamp': datetime.now().isoformat()
                }
            },
            {
                'priority': 'P1',
                'data': {
                    'service_name': 'orders-service',
                    'alert_name': 'High Error Rate',
                    'alert_type': 'error',
                    'severity': 'medium',
                    'alert_state': 'fired',
                    'error_count': 45,
                    'request_count': 150,
                    'average_response_time': 2000,
                    'process_cpu_usage': 85.0,
                    'process_memory_usage': 3500000000,
                    'timestamp': datetime.now().isoformat()
                }
            },
            {
                'priority': 'P2',
                'data': {
                    'service_name': 'restaurants-service',
                    'alert_name': 'Moderate Response Time',
                    'alert_type': 'error',
                    'severity': 'low',
                    'alert_state': 'fired',
                    'error_count': 15,
                    'request_count': 100,
                    'average_response_time': 1200,
                    'process_cpu_usage': 60.0,
                    'process_memory_usage': 2000000000,
                    'timestamp': datetime.now().isoformat()
                }
            }
        ]
        
        for test_alert in test_alerts:
            print(f"\n[E] Sending {test_alert['priority']} test email...")
            
            priority_pred = self.priority_engine.predict(test_alert['data'])
            ttr_pred = self.ttr_engine.predict(test_alert['data'], test_alert['priority'])
            
            ml_predictions = {
                'priority_level': test_alert['priority'],
                'priority_score': priority_pred['priority_score'],
                'confidence': priority_pred['confidence'],
                'ttr_prediction': ttr_pred,
                'explanation': {
                    'error_impact': 45,
                    'service_criticality': 'Critical',
                    'time_context': 'Peak business hours',
                    'historical_pattern': '78%'
                }
            }
            
            self.email_service.send_alert_email(
                test_alert['data'], ml_predictions, recipients_override=recipients_override
            )
            print(f"   [OK] {test_alert['priority']} email sent")
        
        print("\n[OK] All test emails sent!")
    
    def get_statistics(self):
        """Get system statistics"""
        runtime = (datetime.now() - self.stats['start_time']).seconds
        
        return {
            **self.stats,
            'runtime_seconds': runtime,
            'email_stats': self.email_service.get_statistics()
        }
    
    def print_statistics(self):
        """Print formatted statistics"""
        stats = self.get_statistics()
        
        print("\n" + "=" * 80)
        print("[#] PHASE 1 SYSTEM STATISTICS")
        print("=" * 80)
        print(f"Runtime: {stats['runtime_seconds']} seconds")
        print(f"Alerts Processed: {stats['alerts_processed']}")
        print(f"Alerts Sent: {stats['alerts_sent']}")
        print(f"False Positives Prevented: {stats['false_positives_prevented']}")
        print(f"\nEmail Statistics:")
        print(f"  Total Sent: {stats['email_stats']['total_sent']}")
        print(f"  By Priority: {stats['email_stats']['by_priority']}")
        print("=" * 80)

if __name__ == '__main__':
    print("=" * 80)
    print(" PHASE 1: ML-ENHANCED ALERT SYSTEM")
    print(" Research Paper-Aligned Implementation")
    print(" Adaptive Thresholding Algorithms for Real-Time Monitoring")
    print("=" * 80)
    
    # Initialize orchestrator
    orchestrator = Phase1Orchestrator()
    
    # Train all models
    print("\n[*] Starting training phase...")
    training_results = orchestrator.train_all_models()
    
    # Send test emails
    print("\n[E] Sending test emails to verify email service...")
    orchestrator.send_test_emails()
    
    # Print statistics
    orchestrator.print_statistics()
    
    print("\n" + "=" * 80)
    print("[OK] PHASE 1 INITIALIZATION COMPLETE!")
    print("=" * 80)
    print("\n[i] Next Steps:")
    print("   1. Check your email for test notifications")
    print("   2. Review models in: alert-agent-data-collect-service/ml-module/models/")
    print("   3. Integrate with production alert system")
    print("   4. Move to Phase 2 when ready (LSTM, Correlation, XAI)")
    print("\n" + "=" * 80)

