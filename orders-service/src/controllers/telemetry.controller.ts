import { Request, Response } from "express";
import { telemetryStore } from "../collectors/telemetry.collector";

export function getTelemetry(req: Request, res: Response) {
  const mem = process.memoryUsage();

  const avgLatency =
    telemetryStore.totalRequests === 0
      ? 0
      : telemetryStore.totalLatencyMs / telemetryStore.totalRequests;

  const routes = Object.entries(telemetryStore.routes).map(
    ([route, stats]) => ({
      route,
      count: stats.count,
      errors: stats.errors,
      avg_latency_ms:
        stats.count === 0
          ? 0
          : Math.round(stats.totalLatencyMs / stats.count),
    })
  );

  res.json({
    service: "orders-service",
    timestamp: Date.now(),
    uptime_ms: Date.now() - telemetryStore.startTime,
    process: {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
    },
    http: {
      total_requests: telemetryStore.totalRequests,
      total_errors: telemetryStore.totalErrors,
      avg_latency_ms: Math.round(avgLatency),
    },
    routes, //per-route live metrics
  });
}
