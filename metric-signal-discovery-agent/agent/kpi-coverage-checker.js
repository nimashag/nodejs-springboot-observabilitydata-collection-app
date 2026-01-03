import fs from "fs";

const config = JSON.parse(
  fs.readFileSync(new URL("./services.json", import.meta.url), "utf-8")
);

async function fetchTelemetry(service) {
  const res = await fetch(service.url);
  if (!res.ok) throw new Error(`${service.name} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

function hasNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

function computeCoverage(t) {
  const http = t.http || {};
  const process = t.process || {};
  const routes = t.routes;

  const hasRoutesArray = Array.isArray(routes);

  const coverage = {
    latency_avg: hasNumber(http.avg_latency_ms),
    traffic_total_requests: hasNumber(http.total_requests),
    errors_total_errors: hasNumber(http.total_errors),
    memory_heap_used: hasNumber(process.heap_used_mb) || hasNumber(process.heap_used),
    memory_rss: hasNumber(process.rss_mb) || hasNumber(process.rss),
    // ✅ If routes is an array, we consider route-level metrics implemented
    // (even if empty when there’s no traffic yet)
    route_level_metrics: hasRoutesArray,
    latency_percentiles: Boolean(http.p95_latency_ms || http.p99_latency_ms),
    // ✅ Accept either name
    rps: hasNumber(http.rps) || hasNumber(http.requests_per_sec) || hasNumber(http.rps_avg),
  };

  const missing = Object.entries(coverage)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);

  return { coverage, missing };
}

async function main() {
  const results = [];

  for (const s of config.services) {
    try {
      const t = await fetchTelemetry(s);
      const serviceName = t.service || s.name;

      const { coverage, missing } = computeCoverage(t);

      results.push({
        service: serviceName,
        url: s.url,
        checked_at: Date.now(),
        missing_kpis: missing,
        coverage,
      });
    } catch (e) {
      results.push({
        service: s.name,
        url: s.url,
        checked_at: Date.now(),
        error: String(e?.message || e),
      });
    }
  }

  const out = { generated_at: Date.now(), results };

  fs.writeFileSync(
    new URL("./kpi_coverage_report.json", import.meta.url),
    JSON.stringify(out, null, 2)
  );

  console.log("Saved: agent/kpi_coverage_report.json");
  console.log(JSON.stringify(out, null, 2));
}

main();
