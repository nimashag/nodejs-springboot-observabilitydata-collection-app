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
        """Build clean and realistic HTML email content"""
        priority = ml_predictions.get('priority_level', 'P2') if ml_predictions else 'P2'
        
        # Priority colors and labels
        priority_info = {
            'P0': {'color': '#dc3545', 'label': 'CRITICAL', 'urgency': 'Immediate Action Required'},
            'P1': {'color': '#ff9800', 'label': 'HIGH', 'urgency': 'Action Required Soon'},
            'P2': {'color': '#2196F3', 'label': 'MEDIUM', 'urgency': 'Monitor Closely'},
            'P3': {'color': '#6c757d', 'label': 'LOW', 'urgency': 'Review When Convenient'}
        }
        p_info = priority_info.get(priority, priority_info['P2'])
        
        # Format timestamp
        timestamp = alert_data.get('timestamp', datetime.now().isoformat())
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            formatted_time = dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            formatted_time = timestamp
        
        # Get key metrics - these need instant attention
        error_count = alert_data.get('error_count', 0)
        request_count = alert_data.get('request_count', 0)
        error_rate = (error_count / request_count * 100) if request_count > 0 else 0
        response_time = alert_data.get('average_response_time', 0)
        cpu_usage = alert_data.get('process_cpu_usage', 0)
        memory_usage_gb = alert_data.get('process_memory_usage', 0) / (1024**3)
        
        # Determine critical metrics that need instant attention
        critical_metrics = []
        if error_rate > 10:
            critical_metrics.append(('Error Rate', f'{error_rate:.1f}%', '#dc3545'))
        if response_time > 2000:
            critical_metrics.append(('Response Time', f'{response_time:.0f} ms', '#ff9800'))
        if cpu_usage > 80:
            critical_metrics.append(('CPU Usage', f'{cpu_usage:.1f}%', '#ff5722'))
        if memory_usage_gb > 2:
            critical_metrics.append(('Memory Usage', f'{memory_usage_gb:.2f} GB', '#f44336'))
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.5;
                    color: #212529;
                    max-width: 650px;
                    margin: 0 auto;
                    padding: 15px;
                    background-color: #f8f9fa;
                }}
                .container {{
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, {p_info['color']} 0%, {p_info['color']}dd 100%);
                    color: white;
                    padding: 28px 24px;
                }}
                .header .brand {{
                    font-size: 14px;
                    font-weight: 600;
                    opacity: 0.95;
                    margin-bottom: 8px;
                    letter-spacing: 0.5px;
                }}
                .header h1 {{
                    margin: 0 0 10px 0;
                    font-size: 26px;
                    font-weight: 700;
                    line-height: 1.2;
                }}
                .header .service-name {{
                    font-size: 16px;
                    opacity: 0.95;
                    margin-bottom: 12px;
                    font-weight: 500;
                }}
                .header .priority {{
                    display: inline-block;
                    background: rgba(255,255,255,0.25);
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                }}
                .content {{
                    padding: 28px 24px;
                }}
                .section {{
                    margin-bottom: 28px;
                }}
                .section-title {{
                    font-size: 18px;
                    font-weight: 700;
                    color: #212529;
                    margin-bottom: 16px;
                    padding-bottom: 10px;
                    border-bottom: 3px solid {p_info['color']};
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e9ecef;
                }}
                .info-label {{
                    color: #6c757d;
                    font-weight: 600;
                    font-size: 14px;
                }}
                .info-value {{
                    color: #212529;
                    font-weight: 700;
                    font-size: 14px;
                }}
                .critical-metrics {{
                    background: #fff3cd;
                    border: 2px solid #ffc107;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .critical-metrics-title {{
                    font-size: 16px;
                    font-weight: 700;
                    color: #856404;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }}
                .critical-metric-item {{
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px;
                    margin-bottom: 10px;
                    background: white;
                    border-radius: 6px;
                    border-left: 4px solid;
                }}
                .critical-metric-label {{
                    font-size: 15px;
                    font-weight: 600;
                    color: #212529;
                }}
                .critical-metric-value {{
                    font-size: 20px;
                    font-weight: 700;
                }}
                .metrics-grid {{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                    margin-top: 16px;
                }}
                .metric-card {{
                    background: #f8f9fa;
                    padding: 16px;
                    border-radius: 8px;
                    border-left: 4px solid {p_info['color']};
                    transition: transform 0.2s;
                }}
                .metric-label {{
                    font-size: 13px;
                    color: #6c757d;
                    margin-bottom: 8px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }}
                .metric-value {{
                    font-size: 24px;
                    font-weight: 700;
                    color: #212529;
                    line-height: 1.2;
                }}
                .actions-box {{
                    background: #e7f3ff;
                    border: 2px solid #2196F3;
                    border-radius: 8px;
                    padding: 20px;
                    margin-top: 20px;
                }}
                .actions-box-title {{
                    font-size: 16px;
                    font-weight: 700;
                    color: #0d47a1;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }}
                .actions-box ul {{
                    margin: 0;
                    padding-left: 24px;
                }}
                .actions-box li {{
                    margin: 10px 0;
                    color: #1565c0;
                    font-size: 14px;
                    font-weight: 500;
                    line-height: 1.6;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    background: #f8f9fa;
                    color: #6c757d;
                    font-size: 13px;
                    border-top: 2px solid #e9ecef;
                    font-weight: 500;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="brand">HUNGERJET ALERT SYSTEM</div>
                    <h1>{alert_data.get('alert_name', 'System Alert')}</h1>
                    <div class="service-name">{alert_data.get('service_name', 'Unknown Service')}</div>
                    <div class="priority">{p_info['label']} - {p_info['urgency']}</div>
                </div>
                
                <div class="content">
                    {f'''
                    <div class="critical-metrics">
                        <div class="critical-metrics-title">
                            ⚠️ CRITICAL METRICS - IMMEDIATE ATTENTION REQUIRED
                        </div>
                        {''.join([f'''
                        <div class="critical-metric-item" style="border-left-color: {color};">
                            <span class="critical-metric-label">{label}</span>
                            <span class="critical-metric-value" style="color: {color};">{value}</span>
                        </div>
                        ''' for label, value, color in critical_metrics])}
                    </div>
                    ''' if critical_metrics else ''}
                    
                    <div class="section">
                        <div class="section-title">Alert Information</div>
                        <div class="info-row">
                            <span class="info-label">Service:</span>
                            <span class="info-value">{alert_data.get('service_name', 'N/A')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Alert Type:</span>
                            <span class="info-value">{alert_data.get('alert_type', 'N/A').upper()}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Severity:</span>
                            <span class="info-value">{alert_data.get('severity', 'N/A').upper()}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Time:</span>
                            <span class="info-value">{formatted_time}</span>
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Current Metrics</div>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-label">Error Rate</div>
                                <div class="metric-value">{error_rate:.1f}%</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Response Time</div>
                                <div class="metric-value">{response_time:.0f} ms</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">CPU Usage</div>
                                <div class="metric-value">{cpu_usage:.1f}%</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Memory Usage</div>
                                <div class="metric-value">{memory_usage_gb:.2f} GB</div>
                            </div>
                        </div>
                    </div>
                    
                    {self._build_remediation_section(alert_data, ml_predictions)}
                </div>
                
                <div class="footer">
                    HungerJet Alert System • {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                </div>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _build_ml_predictions_section(self, ml_predictions: Dict, ttr_data: Dict) -> str:
        """Build ML predictions section"""
        if not ml_predictions:
            return ""
        
        ttr_minutes = ttr_data.get('ttr_minutes', 0)
        ttr_category = ttr_data.get('ttr_category', 'Standard')
        sla_breach_risk = ttr_data.get('sla_breach_risk', False)
        confidence = ml_predictions.get('confidence', 0)
        
        return f"""
        <div class="section">
            <div class="prediction-box">
                <h4>📊 ML Analysis</h4>
                <div style="margin-top: 8px;">
                    <div class="info-row">
                        <span class="info-label">Estimated Resolution Time:</span>
                        <span class="info-value"><strong>{ttr_minutes:.0f} minutes</strong> ({ttr_category})</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Confidence:</span>
                        <span class="info-value">{confidence:.0%}</span>
                    </div>
                    {f'<div style="margin-top: 8px; padding: 8px; background: #f8d7da; border-radius: 4px; color: #721c24;"><strong>⚠️ SLA Breach Risk:</strong> High probability of exceeding SLA threshold</div>' if sla_breach_risk else ''}
                </div>
            </div>
        </div>
        """
    
    
    def _build_remediation_section(self, alert_data: Dict, ml_predictions: Dict) -> str:
        """Build automated remediation suggestions"""
        service = alert_data.get('service_name', '')
        alert_type = alert_data.get('alert_type', '').lower()
        error_count = alert_data.get('error_count', 0)
        cpu_usage = alert_data.get('process_cpu_usage', 0)
        memory_usage_gb = alert_data.get('process_memory_usage', 0) / (1024**3)
        response_time = alert_data.get('average_response_time', 0)
        
        # Generate realistic remediation suggestions based on alert type and metrics
        suggestions = []
        
        if 'error' in alert_type or error_count > 10:
            suggestions.append(f'Review error logs for {service} to identify root cause')
            suggestions.append(f'Check service health endpoint: GET /health')
            suggestions.append(f'Verify recent deployments or configuration changes')
            if error_count > 20:
                suggestions.append(f'Consider rolling back recent changes if applicable')
        
        if 'availability' in alert_type or 'latency' in alert_type or response_time > 2000:
            suggestions.append(f'Check service health and restart if health checks are failing')
            suggestions.append(f'Review resource utilization (CPU/Memory) metrics')
            suggestions.append(f'Consider scaling service instances horizontally')
            if response_time > 3000:
                suggestions.append(f'Investigate database query performance and connection pool')
        
        if 'memory' in alert_type or 'cpu' in alert_type or cpu_usage > 80 or memory_usage_gb > 2:
            suggestions.append(f'Check for memory leaks or resource-intensive operations')
            suggestions.append(f'Review recent code changes that might affect performance')
            suggestions.append(f'Consider restarting the service to clear memory issues')
            if cpu_usage > 90:
                suggestions.append(f'Investigate CPU-intensive processes or infinite loops')
            if memory_usage_gb > 3:
                suggestions.append(f'Check for memory leaks using profiling tools')
        
        if not suggestions:
            suggestions.append('Review service logs and metrics dashboard')
            suggestions.append('Check service health dashboard for trends')
            suggestions.append('Verify system resources and dependencies')
        
        suggestions_html = "".join([f"<li>{s}</li>" for s in suggestions])
        
        return f"""
        <div class="actions-box">
            <div class="actions-box-title">
                🔧 Recommended Actions
            </div>
            <ul>
                {suggestions_html}
            </ul>
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


