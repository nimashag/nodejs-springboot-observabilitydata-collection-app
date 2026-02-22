import axios from 'axios';

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
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3008';
  }

  // For remote deployments (EC2, etc.), use nginx gateway on the same host
  // Use port 31000 (nginx gateway) on the same hostname
  const nginxPort = '31000';
  return `${protocol}//${hostname}:${nginxPort}`;
}

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add API key if configured
const API_KEY = (import.meta as any).env?.VITE_API_KEY;
if (API_KEY) {
  api.defaults.headers.common['Authorization'] = `Bearer ${API_KEY}`;
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
  category: 'error' | 'performance' | 'availability';
}

export interface AdaptiveConfig {
  generated_at: string;
  thresholds: Record<string, {
    error_burst_threshold: number;
    error_burst_window: number;
    high_latency_threshold: number;
    availability_error_rate: number;
  }>;
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

export const apiService = {
  // Get alert summary
  getAlertSummary: async (): Promise<AlertSummary> => {
    const response = await api.get('/api/summary');
    return response.data;
  },

  // Get threshold recommendations
  getThresholdRecommendations: async (): Promise<ThresholdRecommendation[]> => {
    const response = await api.get('/api/recommendations');
    return response.data;
  },

  // Get adaptive configuration
  getAdaptiveConfig: async (): Promise<AdaptiveConfig> => {
    try {
      const response = await api.get('/api/adaptive-config');
      return response.data;
    } catch (error) {
      // Fallback to reading from file if API endpoint doesn't exist
      console.warn('API endpoint not available, using mock data');
      throw error;
    }
  },

  // Get ML model report
  getMLModelReport: async (): Promise<MLModelReport> => {
    try {
      const response = await api.get('/api/ml-report');
      return response.data;
    } catch (error) {
      // Fallback to reading from file if API endpoint doesn't exist
      console.warn('API endpoint not available, using mock data');
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
      const response = await api.get('/api/analysis');
      if (!response.data || !response.data.analysis_report) {
        throw new Error('Invalid response: analysis_report not found');
      }
      return response.data.analysis_report;
    } catch (error: any) {
      console.error('Error fetching historical analysis:', error);
      // Provide more helpful error messages
      if (error.response) {
        // Server responded with error status
        throw new Error(`Server error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Network error: Unable to reach the server. Please check if the alert-agent service is running.');
      } else {
        // Something else happened
        throw new Error(error.message || 'Failed to load historical analysis');
      }
    }
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/api/health');
    return response.data;
  },
};

export default api;

