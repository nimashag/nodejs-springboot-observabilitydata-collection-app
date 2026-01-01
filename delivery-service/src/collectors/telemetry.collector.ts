export type RouteStat = {
  count: number;
  errors: number;
  totalLatencyMs: number;
};

export const telemetryStore = {
  startTime: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  totalLatencyMs: 0,
  routes: {} as Record<string, RouteStat>,
};
