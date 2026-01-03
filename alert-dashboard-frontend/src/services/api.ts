import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3008';

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

  // Health check
  healthCheck: async () => {
    const response = await api.get('/api/health');
    return response.data;
  },
};

export default api;

