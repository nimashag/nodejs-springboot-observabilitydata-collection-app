import axios from "axios";

function getApiBaseUrl(): string {
  const { protocol, hostname, port } = window.location;
  const currentPort = port || (protocol === "https:" ? "443" : "80");

  if (
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    (currentPort === "3006" || currentPort === "31006")
  ) {
    return currentPort === "3006"
      ? "http://localhost:3006"
      : "http://localhost:31006";
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:31000";
  }

  const apiProtocol = protocol === "https:" ? "https:" : "http:";
  const nginxPort = "31000";
  return `${apiProtocol}//${hostname}:${nginxPort}`;
}

const API_BASE_URL = getApiBaseUrl();

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export type SignalsResponse = {
  generated_at: number;
  samples?: number;
  total_signals?: number;
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
        route?: string;
        count?: number;
        route_errors?: number;
        total_errors?: number;
        error_share?: number;
        idle_intervals?: number;
      }
    | { service: string; error: string; timestamp?: number }
  >;
};

export type KpiCoverageResponse = {
  generated_at: number;
  services_checked?: number;
  services_missing_kpis?: number;
  avg_score?: number;
  improved_services?: number;
  regressed_services?: number;
  results: Array<{
    service: string;
    url: string;
    checked_at: number;
    missing_kpis: string[];
    implemented_kpis?: number;
    total_kpis?: number;
    missing_count?: number;
    score?: number;
    status?: string;
    error?: string;
    previous_score?: number;
    score_delta?: number;
    previous_missing_count?: number;
    missing_count_delta?: number;
    trend?: "improved" | "regressed" | "unchanged";
    coverage: Record<string, boolean>;
  }>;
};

export type UpdatePlanResponse = {
  generated_at: number;
  total_rules?: number;
  avg_confidence?: number;
  services_covered?: number;
  improved_actions?: number;
  regressed_actions?: number;
  new_actions?: number;
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

export const metricsApiService = {
  async getHealth(): Promise<HealthResponse> {
    const response = await axiosClient.get("/api/metric/health");
    return response.data;
  },

  async getSignals(): Promise<SignalsResponse> {
    const response = await axiosClient.get("/api/metric/signals-history");
    return response.data;
  },

  async resetSignalsHistory(): Promise<{
    ok: boolean;
    message: string;
    generated_at: number;
  }> {
    const response = await axiosClient.post("/api/metric/signals-history/reset");
    return response.data;
  },

  async getKpiCoverage(): Promise<KpiCoverageResponse> {
    const response = await axiosClient.get("/api/metric/kpi-coverage");
    return response.data;
  },

  async getUpdatePlan(): Promise<UpdatePlanResponse> {
    const response = await axiosClient.get("/api/metric/update-plan");
    return response.data;
  },

  async getRecommendations(): Promise<RecommendationsResponse> {
    const response = await axiosClient.get("/api/metric/recommendations");
    return response.data;
  },

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

export const api = {
  health: () => metricsApiService.getHealth(),
  signals: () => metricsApiService.getSignals(),
  resetSignalsHistory: () => metricsApiService.resetSignalsHistory(),
  kpiCoverage: () => metricsApiService.getKpiCoverage(),
  updatePlan: () => metricsApiService.getUpdatePlan(),
  recommendations: () => metricsApiService.getRecommendations(),
  promSuggestions: () => metricsApiService.getPromSuggestions(),
};