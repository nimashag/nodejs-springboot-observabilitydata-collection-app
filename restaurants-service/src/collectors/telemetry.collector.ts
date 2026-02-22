// src/collectors/telemetry.collector.ts
type RouteStats = {
  count: number;
  errors: number;
  totalLatencyMs: number;
  latenciesMs: number[]; // rolling window
};

type TelemetryStoreType = {
  startTime: number;
  totalRequests: number;
  totalErrors: number;
  totalLatencyMs: number;
  routes: Record<string, RouteStats>;
  latenciesMs: number[]; // global rolling window
};

const MAX_SAMPLES = 300; // rolling window size (defendable)

export const telemetryStore: TelemetryStoreType = {
  startTime: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  totalLatencyMs: 0,
  routes: {},
  latenciesMs: [],
};

export function recordTelemetry(routeKey: string, latencyMs: number, isError: boolean) {
  telemetryStore.totalRequests += 1;
  telemetryStore.totalLatencyMs += latencyMs;
  if (isError) telemetryStore.totalErrors += 1;

  // global latency window
  telemetryStore.latenciesMs.push(latencyMs);
  while (telemetryStore.latenciesMs.length > MAX_SAMPLES) telemetryStore.latenciesMs.shift();

  telemetryStore.routes[routeKey] ??= {
    count: 0,
    errors: 0,
    totalLatencyMs: 0,
    latenciesMs: [],
  };

  const r = telemetryStore.routes[routeKey];
  r.count += 1;
  r.totalLatencyMs += latencyMs;
  if (isError) r.errors += 1;

  // per-route latency window
  r.latenciesMs.push(latencyMs);
  while (r.latenciesMs.length > MAX_SAMPLES) r.latenciesMs.shift();
}

export function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}
