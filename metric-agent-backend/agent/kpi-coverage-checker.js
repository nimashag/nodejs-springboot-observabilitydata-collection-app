import fs from "fs";

const CONFIG_FILE = new URL("./services.json", import.meta.url);
const OUT_FILE = new URL("./kpi_coverage_report.json", import.meta.url);

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));

function loadPreviousReport() {
  try {
    return JSON.parse(fs.readFileSync(OUT_FILE, "utf-8"));
  } catch {
    return {
      generated_at: 0,
      services_checked: 0,
      services_missing_kpis: 0,
      avg_score: 0,
      results: [],
    };
  }
}

function buildPreviousMap(previousReport) {
  const rows = Array.isArray(previousReport?.results) ? previousReport.results : [];
  return new Map(rows.map((r) => [r.service, r]));
}

async function fetchTelemetry(service) {
  const res = await fetch(service.url);
  if (!res.ok) {
    throw new Error(`${service.name} failed: ${res.status} ${res.statusText}`);
  }
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
    memory_heap_used:
      hasNumber(process.heap_used_mb) || hasNumber(process.heap_used),
    memory_rss: hasNumber(process.rss_mb) || hasNumber(process.rss),
    route_level_metrics: hasRoutesArray,
    latency_percentiles:
      hasNumber(http.p95_latency_ms) || hasNumber(http.p99_latency_ms),
    rps:
      hasNumber(http.rps) ||
      hasNumber(http.requests_per_sec) ||
      hasNumber(http.rps_avg),
  };

  const missing = Object.entries(coverage)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);

  const implementedCount = Object.values(coverage).filter(Boolean).length;
  const totalCount = Object.keys(coverage).length;
  const missingCount = missing.length;
  const score = Math.round((implementedCount / totalCount) * 100);

  let status = "complete";
  if (missingCount === totalCount) status = "missing_all";
  else if (missingCount > 0) status = "partial";

  return {
    coverage,
    missing,
    implementedCount,
    totalCount,
    missingCount,
    score,
    status,
  };
}

function computeDelta(currentRow, previousRow) {
  const previousScore = Number(previousRow?.score ?? 0);
  const previousMissingCount = Number(
    previousRow?.missing_count ?? previousRow?.missing_kpis?.length ?? 0
  );

  const scoreDelta = currentRow.score - previousScore;
  const missingCountDelta = currentRow.missing_count - previousMissingCount;

  let trend = "unchanged";
  if (scoreDelta > 0 || missingCountDelta < 0) trend = "improved";
  else if (scoreDelta < 0 || missingCountDelta > 0) trend = "regressed";

  return {
    previous_score: previousScore,
    score_delta: scoreDelta,
    previous_missing_count: previousMissingCount,
    missing_count_delta: missingCountDelta,
    trend,
  };
}

async function main() {
  const previousReport = loadPreviousReport();
  const previousMap = buildPreviousMap(previousReport);

  const results = [];

  for (const s of config.services) {
    const previousRow = previousMap.get(s.name);

    try {
      const t = await fetchTelemetry(s);
      const serviceName = t.service || s.name;
      const previousForService =
        previousMap.get(serviceName) || previousRow || null;

      const {
        coverage,
        missing,
        implementedCount,
        totalCount,
        missingCount,
        score,
        status,
      } = computeCoverage(t);

      const currentRow = {
        service: serviceName,
        url: s.url,
        checked_at: Date.now(),
        missing_kpis: missing,
        implemented_kpis: implementedCount,
        total_kpis: totalCount,
        missing_count: missingCount,
        score,
        status,
        coverage,
      };

      results.push({
        ...currentRow,
        ...computeDelta(currentRow, previousForService),
      });
    } catch (e) {
      const currentRow = {
        service: s.name,
        url: s.url,
        checked_at: Date.now(),
        missing_kpis: [],
        implemented_kpis: 0,
        total_kpis: 8,
        missing_count: 8,
        score: 0,
        status: "error",
        error: String(e?.message || e),
        coverage: {},
      };

      results.push({
        ...currentRow,
        ...computeDelta(currentRow, previousRow),
      });
    }
  }

  const servicesChecked = results.length;
  const servicesMissing = results.filter(
    (r) => (r.missing_kpis || []).length > 0 || r.status === "error"
  ).length;

  const avgScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + (r.score ?? 0), 0) / results.length
        )
      : 0;

  const improvedServices = results.filter((r) => r.trend === "improved").length;
  const regressedServices = results.filter((r) => r.trend === "regressed").length;

  const out = {
    generated_at: Date.now(),
    services_checked: servicesChecked,
    services_missing_kpis: servicesMissing,
    avg_score: avgScore,
    improved_services: improvedServices,
    regressed_services: regressedServices,
    results,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));

  console.log("Saved: agent/kpi_coverage_report.json");
  console.log(JSON.stringify(out, null, 2));
}

main();