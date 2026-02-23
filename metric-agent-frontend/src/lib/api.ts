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

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${res.statusText}`);
  return res.json();
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${res.statusText}`);
  return res.text();
}

export const api = {
  health: () => getJson<{ ok: boolean; service: string; ts: number }>("/health"),
  signals: () => getJson<SignalsResponse>("/api/signals"),
  kpiCoverage: () => getJson<KpiCoverageResponse>("/api/kpi-coverage"),
  updatePlan: () => getJson<UpdatePlanResponse>("/api/update-plan"),
  recommendations: () => getJson<RecommendationsResponse>("/api/recommendations"),
  promSuggestions: () => getText("/api/prom-suggestions"),
};
