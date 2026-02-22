import axios from "axios";

// Dynamically determine API base URL based on current hostname
// This works for both local development and remote deployments (EC2, etc.)
function getApiBaseUrl(): string {
  // If explicitly set via environment variable, use it
  if ((import.meta as any).env?.VITE_API_BASE_URL) {
    return (import.meta as any).env.VITE_API_BASE_URL;
  }

  // Get current hostname and protocol from the browser
  const { protocol, hostname } = window.location;

  // For local development, use direct service port
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:3008";
  }

  // For remote deployments (EC2, etc.), use nginx gateway on the same host
  // Use port 31000 (nginx gateway) on the same hostname
  const nginxPort = "31000";
  return `${protocol}//${hostname}:${nginxPort}`;
}

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(
      `[API] Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
    );
    return config;
  },
  (error) => {
    console.error("[API] Request Error:", error);
    return Promise.reject(error);
  },
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(
      `[API] Response: ${response.status} ${response.config.url}`,
      response.data,
    );
    return response;
  },
  (error) => {
    console.error("[API] Response Error:", error.message);
    if (error.response) {
      console.error(
        "[API] Error Response:",
        error.response.status,
        error.response.data,
      );
    } else if (error.request) {
      console.error(
        "[API] No Response Received. Check if backend is running on",
        API_BASE_URL,
      );
    }
    return Promise.reject(error);
  },
);

// Add API key if configured
const API_KEY = (import.meta as any).env?.VITE_API_KEY;
if (API_KEY) {
  api.defaults.headers.common["Authorization"] = `Bearer ${API_KEY}`;
}

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

export const apiService = {
  // Get alert summary
  getAlertSummary: async (): Promise<AlertSummary> => {
    const response = await api.get("/api/summary");
    return response.data;
  },

  // Get threshold recommendations
  getThresholdRecommendations: async (): Promise<ThresholdRecommendation[]> => {
    const response = await api.get("/api/recommendations");
    return response.data;
  },

  // Get adaptive configuration
  getAdaptiveConfig: async (): Promise<AdaptiveConfig> => {
    try {
      const response = await api.get("/api/adaptive-config");
      return response.data;
    } catch (error) {
      // Fallback to reading from file if API endpoint doesn't exist
      console.warn("API endpoint not available, using mock data");
      throw error;
    }
  },

  // Get ML model report
  getMLModelReport: async (): Promise<MLModelReport> => {
    try {
      const response = await api.get("/api/ml-report");
      return response.data;
    } catch (error) {
      // Fallback to reading from file if API endpoint doesn't exist
      console.warn("API endpoint not available, using mock data");
      throw error;
    }
  },

  // Get paginated alerts
  getAlerts: async (page: number = 1, limit: number = 100) => {
    const response = await api.get(`/api/alerts?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get historical analysis report
  getHistoricalAnalysis: async (): Promise<HistoricalAnalysisReport> => {
    try {
      const response = await api.get("/api/analysis");
      if (!response.data || !response.data.analysis_report) {
        throw new Error("Invalid response: analysis_report not found");
      }
      return response.data.analysis_report;
    } catch (error: any) {
      console.error("Error fetching historical analysis:", error);
      // Provide more helpful error messages
      if (error.response) {
        // Server responded with error status
        throw new Error(
          `Server error: ${error.response.status} - ${error.response.statusText}`,
        );
      } else if (error.request) {
        // Request was made but no response received
        throw new Error(
          "Network error: Unable to reach the server. Please check if the alert-agent service is running.",
        );
      } else {
        // Something else happened
        throw new Error(error.message || "Failed to load historical analysis");
      }
    }
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get("/api/health");
    return response.data;
  },

  // ===== NEW ADVANCED FEATURES ENDPOINTS =====

  // Get adaptive learning metrics
  getAdaptiveLearning: async () => {
    const response = await api.get("/api/adaptive-learning");
    return response.data;
  },

  // Get correlations and incidents
  getCorrelations: async () => {
    const response = await api.get("/api/correlations");
    return response.data;
  },

  // Get incidents only
  getIncidents: async () => {
    const response = await api.get("/api/incidents");
    return response.data;
  },

  // Get predictive alerts and trends
  getPredictions: async () => {
    const response = await api.get("/api/predictions");
    return response.data;
  },

  // Get deduplication results
  getDeduplication: async () => {
    const response = await api.get("/api/deduplication");
    return response.data;
  },

  // Get contextual thresholds
  getContextualThresholds: async () => {
    const response = await api.get("/api/contextual-thresholds");
    return response.data;
  },

  // Get remediation suggestions
  getRemediation: async () => {
    const response = await api.get("/api/remediation");
    return response.data;
  },

  // Get A/B testing experiments
  getExperiments: async () => {
    const response = await api.get("/api/experiments");
    return response.data;
  },

  // Get all features overview
  getFeatures: async () => {
    const response = await api.get("/api/features");
    return response.data;
  },

  // Get analysis summary (different from alert summary)
  getAnalysisSummary: async () => {
    const response = await api.get("/api/analysis-summary");
    return response.data;
  },

  // Get routing decisions
  getRouting: async () => {
    const response = await api.get("/api/routing");
    return response.data;
  },

  // Get real-time stats
  getRealtimeStats: async () => {
    const response = await api.get("/api/realtime-stats");
    return response.data;
  },

  // ===== ML AGENT RESULTS ENDPOINTS =====

  // Get comprehensive ML agent results
  getMLAgentResults: async (): Promise<MLAgentResults> => {
    const response = await api.get("/api/ml-agent-results");
    return response.data;
  },

  // Get ML classified alerts
  getMLClassifiedAlerts: async (): Promise<MLClassifiedAlertsResponse> => {
    const response = await api.get("/api/ml-classified-alerts");
    return response.data;
  },

  // Get ML predictions results
  getMLPredictionsResults: async (): Promise<MLPredictionsResultsResponse> => {
    const response = await api.get("/api/ml-predictions-results");
    return response.data;
  },

  // Get ML false positives
  getMLFalsePositives: async (): Promise<MLFalsePositivesResponse> => {
    const response = await api.get("/api/ml-false-positives");
    return response.data;
  },

  // Apply a threshold recommendation
  applyThreshold: async (data: {
    service_name: string;
    alert_type: string;
    new_threshold: number;
    recommendation?: ThresholdRecommendation;
  }): Promise<{
    success: boolean;
    message: string;
    service_name: string;
    alert_type: string;
    old_threshold: number;
    new_threshold: number;
    applied_at: string;
  }> => {
    const response = await api.post("/api/apply-threshold", data);
    return response.data;
  },

  // Get applied thresholds history
  getAppliedThresholds: async (): Promise<
    Array<{
      service_name: string;
      alert_type: string;
      old_threshold: number;
      new_threshold: number;
      applied_at: string;
    }>
  > => {
    const response = await api.get("/api/applied-thresholds");
    return response.data;
  },

  // Send email manually
  sendEmail: async (data: {
    alert_data?: {
      service_name: string;
      alert_name: string;
      alert_type: string;
      severity: string;
      [key: string]: any;
    };
    test_mode?: boolean;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    timestamp: string;
  }> => {
    const response = await api.post("/api/send-email", data);
    return response.data;
  },
};

export default api;
