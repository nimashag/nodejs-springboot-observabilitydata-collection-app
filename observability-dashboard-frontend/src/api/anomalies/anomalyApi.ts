import axios from "axios";
import type { IncidentsPayload } from "../../types/anomalies/anomaly.types";

// Dynamically determine API base URL based on current hostname
// This works for both local development and remote deployments (EC2, etc.)
function getApiBaseUrl(): string {
  // If explicitly set via environment variable, use it
  if (import.meta.env.VITE_ANOMALY_API_URL) {
    return import.meta.env.VITE_ANOMALY_API_URL;
  }

  // Get current hostname, protocol, and port from the browser
  const { protocol, hostname, port } = window.location;
  const currentPort = port || (protocol === "https:" ? "443" : "80");

  // For local development (direct service access), use direct service port
  // Only use direct port if accessing on the service's actual port (3007) or its exposed port (31007)
  if (
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    (currentPort === "3007" || currentPort === "31007")
  ) {
    // Direct service access - use the port we're already on or the exposed port
    return currentPort === "3007"
      ? "http://localhost:3007"
      : "http://localhost:31007";
  }

  // For Docker deployments or when accessing through nginx gateway ports
  // Use nginx gateway (port 31000) which proxies to anomaly-detection-agent
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // When accessing via Docker-exposed frontend port (30011), use nginx gateway
    return "http://localhost:31000";
  }

  // For remote deployments (EC2, etc.), use nginx gateway on the same host
  // Use port 31000 (nginx gateway) on the same hostname
  // Always use http (not https) for the API gateway
  const apiProtocol = protocol === "https:" ? "https:" : "http:";
  const nginxPort = "31000";
  const apiUrl = `${apiProtocol}//${hostname}:${nginxPort}`;

  // Debug logging (remove in production if needed)
  console.log(
    "[AnomalyAPI] Detected hostname:",
    hostname,
    "port:",
    currentPort,
    "Using API URL:",
    apiUrl,
  );

  return apiUrl;
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
      `[AnomalyAPI] Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
    );
    return config;
  },
  (error) => {
    console.error("[AnomalyAPI] Request Error:", error);
    return Promise.reject(error);
  },
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(
      `[AnomalyAPI] Response: ${response.status} ${response.config.url}`,
      response.data,
    );
    return response;
  },
  (error) => {
    console.error("[AnomalyAPI] Response Error:", error.message);
    if (error.response) {
      console.error(
        "[AnomalyAPI] Error Response:",
        error.response.status,
        error.response.data,
      );
    } else if (error.request) {
      console.error(
        "[AnomalyAPI] No Response Received. Check if backend is running on",
        API_BASE_URL,
      );
    }
    return Promise.reject(error);
  },
);

export const anomalyApiService = {
  // Health check
  healthCheck: async () => {
    const response = await api.get("/health");
    return response.data;
  },

  // Fetch incidents from anomaly detection agent
  getIncidents: async (): Promise<IncidentsPayload> => {
    try {
      const response = await api.get<IncidentsPayload>(
        "/api/anomaly/incidents",
      );
      console.log("[AnomalyAPI] ✅ Successfully fetched incidents:", {
        total_rows: response.data.total_rows,
        predicted_anomaly_count: response.data.predicted_anomaly_count,
        incidents_count: response.data.incidents?.length || 0,
        generated_at: response.data.generated_at,
      });
      return response.data;
    } catch (error: any) {
      console.error("[AnomalyAPI] ❌ Error fetching incidents:", error);
      if (error.response) {
        throw new Error(
          `Server error: ${error.response.status} - ${error.response.statusText}`,
        );
      } else if (error.request) {
        throw new Error(
          "Network error: Unable to reach the server. Please check if the anomaly-detection-agent service is running.",
        );
      } else {
        throw new Error(error.message || "Failed to load incidents");
      }
    }
  },

  // Get service status
  getStatus: async () => {
    try {
      const response = await api.get("/api/anomaly/status");
      return response.data;
    } catch (error: any) {
      console.error("Error fetching status:", error);
      if (error.response) {
        throw new Error(
          `Server error: ${error.response.status} - ${error.response.statusText}`,
        );
      } else if (error.request) {
        throw new Error(
          "Network error: Unable to reach the server. Please check if the anomaly-detection-agent service is running.",
        );
      } else {
        throw new Error(error.message || "Failed to load status");
      }
    }
  },

  // Get predictions summary
  getPredictions: async () => {
    try {
      const response = await api.get("/api/anomaly/predictions");
      return response.data;
    } catch (error: any) {
      console.error("Error fetching predictions:", error);
      if (error.response) {
        throw new Error(
          `Server error: ${error.response.status} - ${error.response.statusText}`,
        );
      } else if (error.request) {
        throw new Error(
          "Network error: Unable to reach the server. Please check if the anomaly-detection-agent service is running.",
        );
      } else {
        throw new Error(error.message || "Failed to load predictions");
      }
    }
  },

  // Download predictions CSV
  downloadPredictions: () => {
    window.open(`${API_BASE_URL}/api/anomaly/predictions/download`, "_blank");
  },
};

// Legacy exports for backward compatibility
export const checkHealth = anomalyApiService.healthCheck;
export const fetchIncidents = anomalyApiService.getIncidents;
export const getStatus = anomalyApiService.getStatus;
export const getPredictions = anomalyApiService.getPredictions;
export const downloadPredictions = anomalyApiService.downloadPredictions;

export default api;
