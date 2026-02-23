export interface AlertSummary {
  total_alerts: number;
  alerts_by_service: Record<string, number>;
  alerts_by_type: Record<string, number>;
  alerts_by_severity: Record<string, number>;
  alerts_by_state: Record<string, number>;
  collection_timestamp: string;
}

export interface ThresholdRecommendation {
  service_name: string;
  alert_type: string;
  current_threshold: number;
  recommended_threshold: number;
  adjustment_percentage: number;
  confidence: string;
  rationale: string;
  based_on_samples: number;
  threshold_label: string;
  description: string;
  unit: string;
  category: "error" | "performance" | "availability";
}

export interface AdaptiveConfig {
  generated_at: string;
  thresholds: Record<
    string,
    {
      error_burst_threshold: number;
      error_burst_window: number;
      high_latency_threshold: number;
      availability_error_rate: number;
    }
  >;
}

export interface MLModelReport {
  training_date: string;
  pipeline_version: string;
  data_stats: {
    total_samples: number;
    training_samples: number;
    test_samples: number;
    features_count: number;
    alert_types: number;
    severity_levels: number;
  };
  hyperparameter_tuning: {
    method: string;
    cv_folds: number;
    classifier_best_params: Record<string, any>;
    predictor_best_params: Record<string, any>;
    fp_detector_best_params: Record<string, any>;
  };
  cross_validation: {
    alert_classifier: {
      mean_accuracy: number;
      std_accuracy: number;
      confidence_interval_95: [number, number];
    };
    alert_predictor: {
      mean_accuracy: number;
      std_accuracy: number;
      confidence_interval_95: [number, number];
    };
    false_positive_detector: {
      mean_f1: number;
      std_f1: number;
      confidence_interval_95: [number, number];
    };
  };
  test_performance: {
    alert_classifier: {
      accuracy: number;
      percentage: string;
    };
    alert_predictor: {
      accuracy: number;
      precision: number;
      recall: number;
      f1_score: number;
      percentage: string;
    };
    false_positive_detector: {
      accuracy: number;
      precision: number;
      recall: number;
      f1_score: number;
      percentage: string;
    };
  };
  feature_importance: Array<{
    feature: string;
    importance: number;
  }>;
  model_files: {
    classifier: string;
    predictor: string;
    fp_detector: string;
    scaler: string;
    encoders: string[];
  };
}

export interface ServiceBaseline {
  service_name: string;
  total_alerts: number;
  avg_error_count: number;
  avg_response_time: number;
  avg_alert_duration: number;
  false_positive_rate: number;
  alert_rate_per_hour: number;
  avg_cpu_usage: number;
  avg_memory_usage: number;
}

export interface FalsePositiveIndicators {
  quick_resolves: any[];
  repetitive_count: number;
  estimated_fp_rate: number;
}

export interface TemporalPattern {
  peak_hours: number[];
  peak_days: number[];
  hourly_distribution: Record<number, number>;
  daily_distribution: Record<number, number>;
}

export interface HistoricalAnalysisReport {
  generated_at: string;
  total_alerts_analyzed: number;
  time_range: { start: string; end: string };
  service_baselines: Record<string, ServiceBaseline>;
  false_positive_analysis: FalsePositiveIndicators;
  temporal_patterns: TemporalPattern;
  recommendations: string[];
}

// ML Agent Results Interfaces
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

export interface MLAlertWithPrediction {
  timestamp: string;
  service_name: string;
  alert_name: string;
  alert_type: string;
  alert_state: string;
  severity: string;
  normalized_timestamp: number;
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
  recent_ml_alerts: MLAlertWithPrediction[];
}

export interface MLClassifiedAlertsResponse {
  summary: {
    total_classified: number;
    by_priority: Record<string, number>;
    by_type: Record<string, number>;
    by_service: Record<string, { count: number; avg_priority_score: number }>;
  };
  alerts: MLAlertWithPrediction[];
}

export interface MLPredictionsResultsResponse {
  summary: {
    total_predicted: number;
    high_priority_count: number;
    avg_confidence: number;
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
}

export interface MLFalsePositivesResponse {
  summary: {
    total_detected: number;
    suppressed_count: number;
  };
  false_positives: Array<{
    alert_id: string;
    alert_name: string;
    service_name: string;
    confidence: number;
    reason: string;
    detected_at: string;
  }>;
}

export interface Alert {
  timestamp: string;
  service_name: string;
  alert_name?: string;
  alert_type: 'error' | 'latency' | 'availability' | 'resource' | 'traffic' | string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  alert_state: 'fired' | 'resolved' | string;
  error_count?: number;
  request_count?: number;
  average_response_time?: number;
  response_time?: number;
  process_cpu_usage?: number;
  process_memory_usage?: number;
  event_loop_lag?: number;
  traffic_rate?: number;
  normalized_timestamp?: number;
  service_type?: 'nodejs' | 'java' | string;
  [key: string]: any;
}

