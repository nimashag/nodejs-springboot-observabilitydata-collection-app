export interface AlertEvent {
  timestamp: string;
  service_name: string;
  alert_name: string;
  alert_type: 'error' | 'latency' | 'availability' | 'resource' | 'traffic' | 'security' | 'performance';
  alert_state: 'fired' | 'resolved';
  alert_duration?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  request_count: number;
  error_count: number;
  average_response_time: number;
  process_cpu_usage: number;
  process_memory_usage: number;
  event_loop_lag?: number;
  traffic_rate?: number;
}

export interface NormalizedAlertEvent extends AlertEvent {
  normalized_timestamp: number;
  service_type: 'nodejs' | 'java';
}

export interface AlertHistorySummary {
  total_alerts: number;
  alerts_by_service: { [service: string]: number };
  alerts_by_type: { [type: string]: number };
  alerts_by_severity: { [severity: string]: number };
  collection_timestamp: string;
}
