import fs from "fs";

const config = JSON.parse(
  fs.readFileSync(new URL("./services.json", import.meta.url), "utf-8")
);

async function fetchTelemetry(service) {
  const res = await fetch(service.url);
  if (!res.ok) throw new Error(`${service.name} failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return { name: service.name, data };
}

function topN(arr, n, keyFn) {
  return [...arr].sort((a, b) => keyFn(b) - keyFn(a)).slice(0, n);
}

function buildServiceReport(t) {
  const routes = Array.isArray(t.routes) ? t.routes : [];

  // Filter noise: telemetry endpoint itself
  const filtered = routes.filter(r => !String(r.route).includes("/telemetry"));

  const topRoutes = topN(filtered, 5, r => r.count || 0);
  const slowRoutes = topN(filtered, 5, r => r.avg_latency_ms || 0);
  const errorRoutes = topN(filtered, 5, r => r.errors || 0).filter(r => (r.errors || 0) > 0);

  return {
    service: t.service,
    snapshot: {
      total_requests: t.http?.total_requests ?? 0,
      total_errors: t.http?.total_errors ?? 0,
      avg_latency_ms: t.http?.avg_latency_ms ?? 0,
      rss_mb: t.process?.rss_mb ?? 0,
      heap_used_mb: t.process?.heap_used_mb ?? 0,
      heap_used_mb_java: t.process?.heap_used_mb ?? 0, // harmless if missing
    },
    discovered: {
      top_routes: topRoutes,
      slow_routes: slowRoutes,
      error_routes: errorRoutes,
    },
  };
}

async function main() {
  const results = [];

  for (const s of config.services) {
    try {
      const { data } = await fetchTelemetry(s);
      results.push(buildServiceReport(data));
    } catch (e) {
      results.push({ service: s.name, error: String(e.message || e) });
    }
  }

  const report = { generated_at: Date.now(), services: results };

  fs.writeFileSync(
    new URL("./discovery_report.json", import.meta.url),
    JSON.stringify(report, null, 2)
  );

  console.log("Saved: agent/discovery_report.json");
  console.log(JSON.stringify(report, null, 2));
}

main();
