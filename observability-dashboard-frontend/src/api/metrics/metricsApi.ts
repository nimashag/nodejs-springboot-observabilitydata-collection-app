import axios from "axios";

// Dynamically determine API base URL based on current hostname
// This works for both local development and remote deployments (EC2, etc.)
function getApiBaseUrl(): string {
  // Get current hostname, protocol, and port from the browser
  const { protocol, hostname, port } = window.location;
  const currentPort = port || (protocol === "https:" ? "443" : "80");

  // For local development (direct service access), use direct service port
  // Only use direct port if accessing on the service's actual port (3006) or its exposed port (31006)
  if (
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    (currentPort === "3006" || currentPort === "31006")
  ) {
    // Direct service access - use the port we're already on or the exposed port
    return currentPort === "3006"
      ? "http://localhost:3006"
      : "http://localhost:31006";
  }

  // For Docker deployments or when accessing through nginx gateway ports
  // Use nginx gateway (port 31000) which proxies to metric-agent-backend
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
    "[MetricsAPI] Detected hostname:",
    hostname,
    "port:",
    currentPort,
    "Using API URL:",
    apiUrl,
  );

  return apiUrl;
}

const API_BASE_URL = getApiBaseUrl();

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Types
export type SignalsResponse = {
  generated_at: number;
  samples?: number;
  signals: Array<
    | {
        service: string;
        signal: string;
        severity: "critical" | "warning" | "info";
        confidence?: number;
        metric?: string;
        current?: number;
        baseline_mean?: number;
        baseline_std?: number;
        z_score?: number | string;
        current_delta?: number;
        top_slow_routes?: Array<any>;
        top_error_routes?: Array<any>;
        timestamp?: number;
      }
    | { service: string; error: string }
  >;
};

export type KpiCoverageResponse = {
  generated_at: number;
  results: Array<{
    service: string;
    url: string;
    checked_at: number;
    missing_kpis: string[];
    coverage: Record<string, boolean>;
  }>;
};

export type UpdatePlanResponse = {
  generated_at: number;
  total_rules?: number;
  actions: Array<any>;
};

export type RecommendationsResponse = {
  generated_at: number;
  recommendations: Array<any>;
};

export type HealthResponse = {
  ok: boolean;
  service: string;
  ts: number;
};

// API Service
export const metricsApiService = {
  // Health check
  async getHealth(): Promise<HealthResponse> {
    const response = await axiosClient.get("/api/metric/health");
    return response.data;
  },

  // Get signals
  async getSignals(): Promise<SignalsResponse> {
    const response = await axiosClient.get("/api/metric/signals");
    return response.data;
  },

  // Get KPI coverage
  async getKpiCoverage(): Promise<KpiCoverageResponse> {
    const response = await axiosClient.get("/api/metric/kpi-coverage");
    return response.data;
  },

  // Get update plan
  async getUpdatePlan(): Promise<UpdatePlanResponse> {
    const response = await axiosClient.get("/api/metric/update-plan");
    return response.data;
  },

  // Get recommendations
  async getRecommendations(): Promise<RecommendationsResponse> {
    const response = await axiosClient.get("/api/metric/recommendations");
    return response.data;
  },

  // Get Prometheus suggestions
  async getPromSuggestions(): Promise<string> {
    const response = await axiosClient.get("/api/metric/prom-suggestions", {
      headers: {
        Accept: "text/plain",
      },
      responseType: "text",
    });
    return response.data;
  },
};

// Export a compatible API object for the existing pages
export const api = {
  health: () => metricsApiService.getHealth(),
  signals: () => metricsApiService.getSignals(),
  kpiCoverage: () => metricsApiService.getKpiCoverage(),
  updatePlan: () => metricsApiService.getUpdatePlan(),
  recommendations: () => metricsApiService.getRecommendations(),
  promSuggestions: () => metricsApiService.getPromSuggestions(),
};
