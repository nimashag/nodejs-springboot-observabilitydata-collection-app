export interface AlertEvent {
  timestamp: string;
  service_name: string;
  alert_name: string;
  alert_type:
    | "error"
    | "latency"
    | "availability"
    | "resource"
    | "traffic"
    | "security"
    | "performance";
  alert_state: "fired" | "resolved";
  alert_duration?: number;
  severity: "low" | "medium" | "high" | "critical";

  request_count: number;
  error_count: number;
  average_response_time: number;
  process_cpu_usage: number;
  process_memory_usage: number;
  event_loop_lag?: number;
  traffic_rate?: number;
}

export interface MLPrediction {
  priority: {
    priority_level: string;
    priority_score: number;
    confidence: number;
    explanation: string;
  };
  ttr: {
    ttr_minutes: number;
    ttr_category: string;
    confidence: number;
    sla_breach_risk: string;
  };
  suppressed: boolean;
  is_false_positive?: boolean;
  false_positive_confidence?: number;
  classified_type?: string;
  email_sent: boolean;
  processed_at: string;
}

export interface NormalizedAlertEvent extends AlertEvent {
  normalized_timestamp: number;
  service_type: "nodejs" | "java";
  ml_predictions?: MLPrediction;
}

export interface MLAgentResults {
  summary: {
    total_processed: number;
    total_classified: number;
    total_predicted: number;
    false_positives_detected: number;
    suppressed_count: number;
    high_priority_count: number;
    avg_confidence: number;
    processing_rate: string;
  };
  classified_alerts: {
    by_priority: Record<string, number>;
    by_type: Record<string, number>;
    by_service: Record<string, { count: number; avg_priority_score: number }>;
  };
  predictions: {
    priority_distribution: Array<{
      level: string;
      count: number;
      percentage: number;
    }>;
    ttr_distribution: Array<{
      category: string;
      count: number;
      avg_minutes: number;
    }>;
    sla_breach_risks: Array<{ risk: string; count: number }>;
  };
  false_positives: Array<{
    alert_id: string;
    alert_name: string;
    service_name: string;
    confidence: number;
    reason: string;
    detected_at: string;
  }>;
  recent_ml_alerts: Array<NormalizedAlertEvent>;
}

export interface AlertHistorySummary {
  total_alerts: number;
  alerts_by_service: { [service: string]: number };
  alerts_by_type: { [type: string]: number };
  alerts_by_severity: { [severity: string]: number };
  collection_timestamp: string;
}
