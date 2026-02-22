import axios from "axios";
export type { ThresholdRecommendation, AdaptiveConfig } from '../../types/alerts/alert.types';

// Dynamically determine API base URL based on current hostname
// This works for both local development and remote deployments (EC2, etc.)
function getApiBaseUrl(): string {
  // If explicitly set via environment variable, use it
  if ((import.meta as any).env?.VITE_ALERT_AGENT_API_URL) {
    return (import.meta as any).env.VITE_ALERT_AGENT_API_URL;
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
      `[AlertAPI] Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
    );
    return config;
  },
  (error) => {
    console.error("[AlertAPI] Request Error:", error);
    return Promise.reject(error);
  },
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(
      `[AlertAPI] Response: ${response.status} ${response.config.url}`,
      response.data,
    );
    return response;
  },
  (error) => {
    console.error("[AlertAPI] Response Error:", error.message);
    if (error.response) {
      console.error(
        "[AlertAPI] Error Response:",
        error.response.status,
        error.response.data,
      );
    } else if (error.request) {
      console.error(
        "[AlertAPI] No Response Received. Check if backend is running on",
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

export const alertApiService = {
  // Get alert summary
  getAlertSummary: async (): Promise<any> => {
    const response = await api.get("/api/summary");
    return response.data;
  },

  // Get threshold recommendations
  getThresholdRecommendations: async (): Promise<any[]> => {
    const response = await api.get("/api/recommendations");
    return response.data;
  },

  // Get adaptive configuration
  getAdaptiveConfig: async (): Promise<any> => {
    try {
      const response = await api.get("/api/adaptive-config");
      return response.data;
    } catch (error) {
      console.warn("API endpoint not available, using mock data");
      throw error;
    }
  },

  // Get ML model report
  getMLModelReport: async (): Promise<any> => {
    try {
      const response = await api.get("/api/ml-report");
      return response.data;
    } catch (error) {
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
  getHistoricalAnalysis: async (): Promise<any> => {
    try {
      const response = await api.get("/api/analysis");
      if (!response.data || !response.data.analysis_report) {
        throw new Error("Invalid response: analysis_report not found");
      }
      return response.data.analysis_report;
    } catch (error: any) {
      console.error("Error fetching historical analysis:", error);
      if (error.response) {
        throw new Error(
          `Server error: ${error.response.status} - ${error.response.statusText}`,
        );
      } else if (error.request) {
        throw new Error(
          "Network error: Unable to reach the server. Please check if the alert-agent service is running.",
        );
      } else {
        throw new Error(error.message || "Failed to load historical analysis");
      }
    }
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get("/api/health");
    return response.data;
  },

  // ===== ADVANCED FEATURES ENDPOINTS =====

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
  getMLAgentResults: async (): Promise<any> => {
    const response = await api.get("/api/ml-agent-results");
    return response.data;
  },

  // Get ML classified alerts
  getMLClassifiedAlerts: async (): Promise<any> => {
    const response = await api.get("/api/ml-classified-alerts");
    return response.data;
  },

  // Get ML predictions results
  getMLPredictionsResults: async (): Promise<any> => {
    const response = await api.get("/api/ml-predictions-results");
    return response.data;
  },

  // Get ML false positives
  getMLFalsePositives: async (): Promise<any> => {
    const response = await api.get("/api/ml-false-positives");
    return response.data;
  },

  // Apply a threshold recommendation
  applyThreshold: async (data: {
    service_name: string;
    alert_type: string;
    new_threshold: number;
    recommendation?: any;
  }): Promise<any> => {
    const response = await api.post("/api/apply-threshold", data);
    return response.data;
  },

  // Get applied thresholds history
  getAppliedThresholds: async (): Promise<any[]> => {
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
  }): Promise<any> => {
    const response = await api.post("/api/send-email", data);
    return response.data;
  },
};

export default api;

