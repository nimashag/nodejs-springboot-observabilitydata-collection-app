import axios from "axios";
import type { IncidentsPayload } from "../../types/anomalies/anomaly.types";

// Dynamically determine API base URL based on current hostname
// This works for both local development and remote deployments (EC2, etc.)
function getAnomalyApiBaseUrl(): string {
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
    // When accessing via Docker-exposed frontend port (30011) or dev port (3009), use direct service
    // For local dev on port 3009, connect directly to anomaly service on port 3007
    return "http://localhost:3007";
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

const API_BASE_URL = getAnomalyApiBaseUrl();

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

// Health check
export const checkHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

// Fetch incidents from anomaly detection agent
export async function fetchIncidents(): Promise<IncidentsPayload> {
  const response = await api.get<IncidentsPayload>("/api/incidents");
  return response.data;
}

// Get service status
export const getStatus = async () => {
  const response = await api.get("/api/status");
  return response.data;
};

// Get predictions summary
export const getPredictions = async () => {
  const response = await api.get("/api/predictions");
  return response.data;
};

// Download predictions CSV
export const downloadPredictions = () => {
  window.open(`${API_BASE_URL}/api/predictions/download`, "_blank");
};
