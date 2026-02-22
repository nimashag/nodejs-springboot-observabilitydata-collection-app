import { Request, Response } from "express";
import { telemetryStore, percentile } from "../collectors/telemetry.collector";


export function getTelemetry(req: Request, res: Response) {
  const mem = process.memoryUsage();

  const avgLatency =
    telemetryStore.totalRequests === 0
      ? 0
      : telemetryStore.totalLatencyMs / telemetryStore.totalRequests;

  // ✅ RPS (requests per second since start)
  const uptimeMs = Date.now() - telemetryStore.startTime;
  const uptimeSec = Math.max(1, Math.floor(uptimeMs / 1000));
  const rps = telemetryStore.totalRequests / uptimeSec;

  const routes = Object.entries(telemetryStore.routes).map(
    ([route, stats]: any) => ({
      route,
      count: stats.count,
      errors: stats.errors,
      avg_latency_ms:
        stats.count === 0 ? 0 : Math.round(stats.totalLatencyMs / stats.count),
    })
  );

  res.json({
    service: "delivery-service",
    timestamp: Date.now(),
    uptime_ms: uptimeMs,
    process: {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
    },
    http: {
      total_requests: telemetryStore.totalRequests,
      total_errors: telemetryStore.totalErrors,
      avg_latency_ms: Math.round(avgLatency),
      rps: Math.round(rps * 100) / 100,
      p95_latency_ms: Math.round(percentile(telemetryStore.latenciesMs, 95)),
      p99_latency_ms: Math.round(percentile(telemetryStore.latenciesMs, 99)),
    },
    routes,
  });
}
