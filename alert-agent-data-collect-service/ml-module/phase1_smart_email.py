"""
Phase 1: Smart Email Service with ML-Enhanced Intelligence
Research Paper Reference: "Reduce alert fatigue" through intelligent email routing

Features:
- Priority-based email routing (Immediate, Digest, Daily, Weekly)
- Rich HTML emails with predictions, confidence, remediation suggestions
- Batch processing for medium/low priority alerts
- Email templates for different alert types
- SMTP integration with Gmail
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import json
from pathlib import Path
from typing import Dict, List, Optional
import time

class SmartEmailService:
    def __init__(self, smtp_config=None):
        """
        Initialize email service
        
        Args:
            smtp_config: Dict with 'server', 'port', 'username', 'password', 'use_ssl'
        """
        # Default SMTP configuration (Gmail)
        self.smtp_config = smtp_config or {
            'server': 'smtp.gmail.com',
            'port': 465,
            'username': 'nayanaharikusalanajani@gmail.com',
            'password': 'krhe erjc powm yxhu',
            'use_ssl': True
        }
        
        # Email routing configuration
        self.routing_config = {
            'P0': {
                'delivery': 'immediate',
                'recipients': ['nayanaharikusalanajani@gmail.com'],  # On-call team
                'subject_prefix': '[*] CRITICAL',
                'batch_interval': None
            },
            'P1': {
                'delivery': 'immediate',
                'recipients': ['nayanaharikusalanajani@gmail.com'],
                'subject_prefix': '[!] HIGH',
                'batch_interval': 300  # 5 minutes
            },
            'P2': {
                'delivery': 'digest',
                'recipients': ['nayanaharikusalanajani@gmail.com'],
                'subject_prefix': '[i] MEDIUM',
                'batch_interval': 900  # 15 minutes
            },
            'P3': {
                'delivery': 'digest',
                'recipients': ['nayanaharikusalanajani@gmail.com'],
                'subject_prefix': '[n] LOW',
                'batch_interval': 3600  # 1 hour
            }
        }
        
        # Pending alerts for batching
        self.pending_alerts = {
            'P0': [],
            'P1': [],
            'P2': [],
            'P3': []
        }
        
        self.last_batch_send = {
            'P0': None,
            'P1': None,
            'P2': None,
            'P3': None
        }
        
        # Email statistics
        self.stats = {
            'total_sent': 0,
            'by_priority': {'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0},
            'last_sent': None
        }
    
    def send_alert_email(self, alert_data: Dict, ml_predictions: Dict = None):
        """
        Send alert email based on priority and routing rules
        
        Args:
            alert_data: Alert information (service, type, severity, metrics)
            ml_predictions: ML model predictions (priority, TTR, etc.)
        """
        priority = ml_predictions.get('priority_level', 'P2') if ml_predictions else 'P2'
        routing = self.routing_config[priority]
        
        # Build email content
        email_content = self._build_email_content(alert_data, ml_predictions)
        
        # Check if should send immediately or batch
        if routing['delivery'] == 'immediate' or priority == 'P0':
            # Send immediately for critical alerts
            self._send_email(
                recipients=routing['recipients'],
                subject=f"{routing['subject_prefix']}: {alert_data['service_name']} - {alert_data['alert_name']}",
                body=email_content,
                priority=priority
            )
        else:
            # Add to batch for digest sending
            self.pending_alerts[priority].append({
                'alert_data': alert_data,
                'ml_predictions': ml_predictions,
                'timestamp': datetime.now()
            })
            
            # Check if batch should be sent
            self._check_and_send_batch(priority)
    
    def send_predictive_warning(self, prediction_data: Dict):
        """
        Send predictive alert warning (LSTM forecasting)
        
        Args:
            prediction_data: Forecasted alert with time, probability, service
        """
        subject = f"[!] Predictive Alert: {prediction_data['service']} likely to breach in {prediction_data['time_to_breach']} mins"
        
        body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .header {{ background-color: #ff9800; color: white; padding: 15px; }}
                .content {{ padding: 20px; }}
                .warning {{ background-color: #fff3cd; padding: 10px; border-left: 4px solid #ff9800; }}
                .metrics {{ background-color: #f8f9fa; padding: 15px; margin: 10px 0; }}
                .recommendations {{ background-color: #e7f3ff; padding: 15px; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>[P] Predictive Alert Warning</h2>
            </div>
            <div class="content">
                <div class="warning">
                    <strong>Prediction:</strong> {prediction_data['service']} is likely to breach thresholds in approximately {prediction_data['time_to_breach']} minutes.
                </div>
                
                <div class="metrics">
                    <h3>[#] Forecasted Values</h3>
                    <ul>
                        <li><strong>Service:</strong> {prediction_data['service']}</li>
                        <li><strong>Predicted Metric:</strong> {prediction_data.get('metric', 'error_rate')}</li>
                        <li><strong>Current Value:</strong> {prediction_data.get('current_value', 'N/A')}</li>
                        <li><strong>Forecasted Value:</strong> {prediction_data.get('forecasted_value', 'N/A')}</li>
                        <li><strong>Threshold:</strong> {prediction_data.get('threshold', 'N/A')}</li>
                        <li><strong>Confidence:</strong> {prediction_data.get('confidence', 0):.1%}</li>
                        <li><strong>Time to Breach:</strong> {prediction_data['time_to_breach']} minutes</li>
                    </ul>
                </div>
                
                <div class="recommendations">
                    <h3>[W] Recommended Actions</h3>
                    <ol>
                        <li>Review service health dashboard</li>
                        <li>Check recent deployments or config changes</li>
                        <li>Prepare rollback plan if needed</li>
                        <li>Monitor closely for next {prediction_data['time_to_breach']} minutes</li>
                    </ol>
                </div>
                
                <p><em>Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</em></p>
            </div>
        </body>
        </html>
        """
        
        self._send_email(
            recipients=self.routing_config['P1']['recipients'],
            subject=subject,
            body=body,
            priority='P1'
        )
    
    def send_daily_intelligence_report(self, report_data: Dict):
        """
        Send daily system intelligence report
        
        Args:
            report_data: Summary of alerts, predictions, patterns
        """
        subject = f"[#] Daily Intelligence Report - {datetime.now().strftime('%Y-%m-%d')}"
        
        body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .header {{ background-color: #2196F3; color: white; padding: 15px; }}
                .content {{ padding: 20px; }}
                .section {{ background-color: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .metric {{ display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 5px; }}
                .good {{ color: #28a745; }}
                .warning {{ color: #ffc107; }}
                .critical {{ color: #dc3545; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>[#] Daily Intelligence Report</h2>
                <p>{datetime.now().strftime('%A, %B %d, %Y')}</p>
            </div>
            <div class="content">
                <div class="section">
                    <h3>[!] Alert Summary</h3>
                    <div class="metric">
                        <strong>Total Alerts:</strong> {report_data.get('total_alerts', 0)}
                    </div>
                    <div class="metric">
                        <strong>P0 (Critical):</strong> <span class="critical">{report_data.get('P0_count', 0)}</span>
                    </div>
                    <div class="metric">
                        <strong>P1 (High):</strong> <span class="warning">{report_data.get('P1_count', 0)}</span>
                    </div>
                    <div class="metric">
                        <strong>P2 (Medium):</strong> {report_data.get('P2_count', 0)}
                    </div>
                    <div class="metric">
                        <strong>P3 (Low):</strong> {report_data.get('P3_count', 0)}
                    </div>
                </div>
                
                <div class="section">
                    <h3>[+] System Health</h3>
                    <p><strong>Overall Health Score:</strong> {report_data.get('health_score', 85)}/100</p>
                    <p><strong>At-Risk Services:</strong> {', '.join(report_data.get('at_risk_services', ['None']))}</p>
                    <p><strong>Predicted Issues (Next 24h):</strong> {report_data.get('predicted_issues', 0)} alerts likely</p>
                </div>
                
                <div class="section">
                    <h3>[^] Performance Metrics</h3>
                    <ul>
                        <li><strong>Avg Resolution Time:</strong> {report_data.get('avg_ttr_minutes', 0):.1f} minutes</li>
                        <li><strong>False Positive Rate:</strong> {report_data.get('false_positive_rate', 0):.1%}</li>
                        <li><strong>Auto-Remediated:</strong> {report_data.get('auto_remediated', 0)} alerts</li>
                        <li><strong>SLA Compliance:</strong> {report_data.get('sla_compliance', 0):.1%}</li>
                    </ul>
                </div>
                
                <div class="section">
                    <h3>[?] Pattern Insights</h3>
                    <ul>
                        {self._format_insights(report_data.get('insights', []))}
                    </ul>
                </div>
                
                <div class="section">
                    <h3>[i] Proactive Recommendations</h3>
                    <ol>
                        {self._format_recommendations(report_data.get('recommendations', []))}
                    </ol>
                </div>
            </div>
        </body>
        </html>
        """
        
        self._send_email(
            recipients=self.routing_config['P3']['recipients'],
            subject=subject,
            body=body,
            priority='P3'
        )
    
    def send_ml_health_report(self, ml_report: Dict):
        """
        Send weekly ML model health report
        
        Args:
            ml_report: ML model performance, retraining events, accuracy
        """
        subject = f"[ML] Weekly ML Health Report - {datetime.now().strftime('%Y-%m-%d')}"
        
        body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .header {{ background-color: #9c27b0; color: white; padding: 15px; }}
                .content {{ padding: 20px; }}
                .section {{ background-color: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .good {{ color: #28a745; font-weight: bold; }}
                .warning {{ color: #ffc107; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>[ML] ML System Health Report</h2>
                <p>Week of {datetime.now().strftime('%Y-%m-%d')}</p>
            </div>
            <div class="content">
                <div class="section">
                    <h3>[#] Model Performance</h3>
                    <ul>
                        <li><strong>Priority Classifier Accuracy:</strong> <span class="{self._get_status_class(ml_report.get('priority_accuracy', 0))}">{ml_report.get('priority_accuracy', 0):.1%}</span></li>
                        <li><strong>TTR Predictor R²:</strong> <span class="{self._get_status_class(ml_report.get('ttr_r2', 0))}">{ml_report.get('ttr_r2', 0):.3f}</span></li>
                        <li><strong>LSTM Forecast Accuracy:</strong> <span class="{self._get_status_class(ml_report.get('lstm_accuracy', 0))}">{ml_report.get('lstm_accuracy', 0):.1%}</span></li>
                    </ul>
                </div>
                
                <div class="section">
                    <h3>[R] Retraining Events</h3>
                    <p><strong>Retraining Triggered:</strong> {ml_report.get('retraining_count', 0)} times</p>
                    <p><strong>Reason:</strong> {ml_report.get('retraining_reason', 'Scheduled periodic retraining')}</p>
                    <p><strong>Performance Change:</strong> {ml_report.get('performance_delta', '+0.0%')}</p>
                </div>
                
                <div class="section">
                    <h3>[N] New Patterns Detected</h3>
                    <ul>
                        {self._format_patterns(ml_report.get('new_patterns', []))}
                    </ul>
                </div>
                
                <div class="section">
                    <h3>[$] ROI Metrics</h3>
                    <ul>
                        <li><strong>Alerts Prevented:</strong> {ml_report.get('alerts_prevented', 0)}</li>
                        <li><strong>Downtime Avoided:</strong> {ml_report.get('downtime_avoided_hours', 0):.1f} hours</li>
                        <li><strong>False Positives Reduced:</strong> {ml_report.get('false_positive_reduction', 0):.1%}</li>
                        <li><strong>MTTR Improvement:</strong> {ml_report.get('mttr_improvement', 0):.1%}</li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
        """
        
        self._send_email(
            recipients=self.routing_config['P3']['recipients'],
            subject=subject,
            body=body,
            priority='P3'
        )
    
    def _build_email_content(self, alert_data: Dict, ml_predictions: Dict = None) -> str:
        """Build rich HTML email content with ML insights"""
        priority = ml_predictions.get('priority_level', 'P2') if ml_predictions else 'P2'
        priority_score = ml_predictions.get('priority_score', 50) if ml_predictions else 50
        ttr_data = ml_predictions.get('ttr_prediction', {}) if ml_predictions else {}
        
        # Color scheme by priority
        priority_colors = {
            'P0': '#dc3545',
            'P1': '#ffc107',
            'P2': '#17a2b8',
            'P3': '#6c757d'
        }
        
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .header {{ background-color: {priority_colors[priority]}; color: white; padding: 15px; }}
                .content {{ padding: 20px; }}
                .alert-info {{ background-color: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .metrics {{ background-color: #e7f3ff; padding: 15px; margin: 10px 0; }}
                .predictions {{ background-color: #fff3cd; padding: 15px; margin: 10px 0; }}
                .explanation {{ background-color: #d1ecf1; padding: 15px; margin: 10px 0; }}
                .actions {{ background-color: #d4edda; padding: 15px; margin: 10px 0; }}
                .priority-badge {{ display: inline-block; padding: 5px 10px; background: {priority_colors[priority]}; color: white; border-radius: 3px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Alert: {alert_data.get('alert_name', 'Unknown Alert')}</h2>
                <p>Service: {alert_data.get('service_name', 'Unknown')} | Priority: <span class="priority-badge">{priority}</span></p>
            </div>
            
            <div class="content">
                <div class="alert-info">
                    <h3>[i] Alert Details</h3>
                    <ul>
                        <li><strong>Service:</strong> {alert_data.get('service_name', 'N/A')}</li>
                        <li><strong>Alert Type:</strong> {alert_data.get('alert_type', 'N/A')}</li>
                        <li><strong>Severity:</strong> {alert_data.get('severity', 'N/A')}</li>
                        <li><strong>State:</strong> {alert_data.get('alert_state', 'fired')}</li>
                        <li><strong>Timestamp:</strong> {alert_data.get('timestamp', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}</li>
                    </ul>
                </div>
                
                <div class="metrics">
                    <h3>[#] Current Metrics</h3>
                    <ul>
                        <li><strong>Error Count:</strong> {alert_data.get('error_count', 0)}</li>
                        <li><strong>Request Count:</strong> {alert_data.get('request_count', 0)}</li>
                        <li><strong>Avg Response Time:</strong> {alert_data.get('average_response_time', 0)} ms</li>
                        <li><strong>CPU Usage:</strong> {alert_data.get('process_cpu_usage', 0):.1f}%</li>
                        <li><strong>Memory Usage:</strong> {alert_data.get('process_memory_usage', 0) / (1024**3):.2f} GB</li>
                    </ul>
                </div>
                
                {self._build_ml_predictions_section(ml_predictions) if ml_predictions else ''}
                
                {self._build_explanation_section(ml_predictions) if ml_predictions else ''}
                
                {self._build_remediation_section(alert_data, ml_predictions) if ml_predictions else ''}
                
                <p style="margin-top: 20px; font-size: 12px; color: #6c757d;">
                    <em>Generated by ML-Enhanced Alert System at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</em>
                </p>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _build_ml_predictions_section(self, ml_predictions: Dict) -> str:
        """Build ML predictions section"""
        ttr_data = ml_predictions.get('ttr_prediction', {})
        
        return f"""
        <div class="predictions">
            <h3>[ML] ML Predictions</h3>
            <ul>
                <li><strong>Priority Score:</strong> {ml_predictions.get('priority_score', 50):.1f}/100</li>
                <li><strong>Confidence:</strong> {ml_predictions.get('confidence', 0):.1%}</li>
                <li><strong>[t] Estimated Resolution Time:</strong> {ttr_data.get('ttr_minutes', 0):.1f} minutes ({ttr_data.get('ttr_category', 'Standard')})</li>
                <li><strong>Confidence Range:</strong> {ttr_data.get('confidence_lower_minutes', 0):.1f} - {ttr_data.get('confidence_upper_minutes', 0):.1f} minutes</li>
                <li><strong>SLA Threshold:</strong> {ttr_data.get('sla_threshold_minutes', 0):.1f} minutes</li>
                <li><strong>SLA Breach Risk:</strong> {'[!] YES (' + str(ttr_data.get('sla_breach_probability', 0)) + '%)' if ttr_data.get('sla_breach_risk') else '[OK] NO'}</li>
            </ul>
        </div>
        """
    
    def _build_explanation_section(self, ml_predictions: Dict) -> str:
        """Build explainable AI section"""
        explanation = ml_predictions.get('explanation', {})
        
        if not explanation:
            return ""
        
        return f"""
        <div class="explanation">
            <h3>[#] Why This Priority?</h3>
            <p>This alert was classified based on the following factors:</p>
            <ul>
                <li>Error rate spike: <strong>+{explanation.get('error_impact', 0):.0f}%</strong> (weight: 0.35)</li>
                <li>Service criticality: <strong>{explanation.get('service_criticality', 'Medium')}</strong> (weight: 0.30)</li>
                <li>Time context: <strong>{explanation.get('time_context', 'Business hours')}</strong> (weight: 0.20)</li>
                <li>Historical pattern: <strong>{explanation.get('historical_pattern', '50%')} led to outages</strong> (weight: 0.15)</li>
            </ul>
        </div>
        """
    
    def _build_remediation_section(self, alert_data: Dict, ml_predictions: Dict) -> str:
        """Build automated remediation suggestions"""
        service = alert_data.get('service_name', '')
        alert_type = alert_data.get('alert_type', '')
        
        # Simple rule-based remediation suggestions
        suggestions = []
        
        if 'error' in alert_type.lower():
            suggestions.append({
                'action': f'Review recent logs for {service}',
                'confidence': 95,
                'auto_execute': False
            })
            suggestions.append({
                'action': f'Check {service} error rate dashboard',
                'confidence': 90,
                'auto_execute': False
            })
        
        if 'availability' in alert_type.lower():
            suggestions.append({
                'action': f'Restart {service} if health check fails',
                'confidence': 85,
                'auto_execute': False
            })
            suggestions.append({
                'action': f'Scale up {service} instances by 1',
                'confidence': 75,
                'auto_execute': False
            })
        
        if not suggestions:
            suggestions.append({
                'action': 'Manual investigation recommended',
                'confidence': 60,
                'auto_execute': False
            })
        
        suggestions_html = ""
        for i, suggestion in enumerate(suggestions, 1):
            suggestions_html += f"<li>{suggestion['action']} <em>(Confidence: {suggestion['confidence']}%)</em></li>"
        
        return f"""
        <div class="actions">
            <h3>[W] Recommended Actions</h3>
            <ol>
                {suggestions_html}
            </ol>
            <p><em>Historical success rate: Based on similar past incidents</em></p>
        </div>
        """
    
    def _send_email(self, recipients: List[str], subject: str, body: str, priority: str = 'P2'):
        """Send email via SMTP"""
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = self.smtp_config['username']
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = subject
            
            # Set priority headers
            if priority == 'P0':
                msg['X-Priority'] = '1'
                msg['X-MSMail-Priority'] = 'High'
            
            msg.attach(MIMEText(body, 'html'))
            
            # Connect and send
            if self.smtp_config['use_ssl']:
                server = smtplib.SMTP_SSL(self.smtp_config['server'], self.smtp_config['port'])
            else:
                server = smtplib.SMTP(self.smtp_config['server'], self.smtp_config['port'])
                server.starttls()
            
            server.login(self.smtp_config['username'], self.smtp_config['password'])
            server.sendmail(self.smtp_config['username'], recipients, msg.as_string())
            server.quit()
            
            # Update statistics
            self.stats['total_sent'] += 1
            self.stats['by_priority'][priority] += 1
            self.stats['last_sent'] = datetime.now()
            
            print(f"[OK] Email sent: {subject}")
            
        except Exception as e:
            print(f"[X] Failed to send email: {e}")
    
    def _check_and_send_batch(self, priority: str):
        """Check if batch should be sent and send if needed"""
        routing = self.routing_config[priority]
        batch_interval = routing['batch_interval']
        
        if not batch_interval:
            return
        
        last_send = self.last_batch_send[priority]
        now = datetime.now()
        
        if last_send is None or (now - last_send).seconds >= batch_interval:
            if self.pending_alerts[priority]:
                self._send_batch_email(priority)
    
    def _send_batch_email(self, priority: str):
        """Send batched digest email"""
        alerts = self.pending_alerts[priority]
        
        if not alerts:
            return
        
        routing = self.routing_config[priority]
        subject = f"{routing['subject_prefix']}: Digest - {len(alerts)} Alerts"
        
        alerts_html = ""
        for alert in alerts:
            alert_data = alert['alert_data']
            ml_pred = alert['ml_predictions']
            
            alerts_html += f"""
            <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px;">
                <h4>{alert_data.get('service_name')} - {alert_data.get('alert_name')}</h4>
                <p><strong>Priority:</strong> {ml_pred.get('priority_level', priority) if ml_pred else priority} | 
                   <strong>Score:</strong> {ml_pred.get('priority_score', 50) if ml_pred else 50:.1f}/100</p>
                <p><strong>Time:</strong> {alert['timestamp'].strftime('%H:%M:%S')}</p>
            </div>
            """
        
        body = f"""
        <html>
        <body>
            <h2>Alert Digest - {priority}</h2>
            <p>Summary of {len(alerts)} alerts in the last batch period.</p>
            {alerts_html}
            <p><em>Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</em></p>
        </body>
        </html>
        """
        
        self._send_email(
            recipients=routing['recipients'],
            subject=subject,
            body=body,
            priority=priority
        )
        
        # Clear pending alerts
        self.pending_alerts[priority] = []
        self.last_batch_send[priority] = datetime.now()
    
    def _format_insights(self, insights: List[str]) -> str:
        """Format insights list as HTML"""
        if not insights:
            return "<li>No significant patterns detected</li>"
        return "\n".join([f"<li>{insight}</li>" for insight in insights])
    
    def _format_recommendations(self, recommendations: List[str]) -> str:
        """Format recommendations list as HTML"""
        if not recommendations:
            return "<li>Continue monitoring system health</li>"
        return "\n".join([f"<li>{rec}</li>" for rec in recommendations])
    
    def _format_patterns(self, patterns: List[str]) -> str:
        """Format patterns list as HTML"""
        if not patterns:
            return "<li>No new patterns detected this week</li>"
        return "\n".join([f"<li>{pattern}</li>" for pattern in patterns])
    
    def _get_status_class(self, value: float) -> str:
        """Get CSS class based on metric value"""
        if value >= 0.85:
            return "good"
        elif value >= 0.70:
            return "warning"
        return "critical"
    
    def get_statistics(self) -> Dict:
        """Get email sending statistics"""
        return self.stats

if __name__ == '__main__':
    print("=" * 80)
    print("[E] Phase 1: Smart Email Service Test")
    print("=" * 80)
    
    # Initialize service
    email_service = SmartEmailService()
    
    # Test alert email
    print("\n[T] Sending test alert email...")
    
    sample_alert = {
        'service_name': 'users-service',
        'alert_name': 'High Error Rate',
        'alert_type': 'error',
        'severity': 'high',
        'alert_state': 'fired',
        'error_count': 35,
        'request_count': 150,
        'average_response_time': 1800,
        'process_cpu_usage': 92.5,
        'process_memory_usage': 3500000000,
        'timestamp': datetime.now().isoformat()
    }
    
    sample_predictions = {
        'priority_level': 'P1',
        'priority_score': 87.5,
        'confidence': 0.94,
        'ttr_prediction': {
            'ttr_minutes': 22.5,
            'ttr_category': 'Standard',
            'confidence_lower_minutes': 15.0,
            'confidence_upper_minutes': 30.0,
            'sla_threshold_minutes': 60.0,
            'sla_breach_risk': False,
            'sla_breach_probability': 35.0
        },
        'explanation': {
            'error_impact': 45,
            'service_criticality': 'Critical',
            'time_context': 'Peak business hours',
            'historical_pattern': '78%'
        }
    }
    
    email_service.send_alert_email(sample_alert, sample_predictions)
    
    print(f"\n[#] Email Statistics:")
    stats = email_service.get_statistics()
    print(f"   Total Sent: {stats['total_sent']}")
    print(f"   By Priority: {stats['by_priority']}")
    
    print("\n[OK] Test complete!")


