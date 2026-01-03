import fs from "fs";

const KPI_REPORT = new URL("./kpi_coverage_report.json", import.meta.url);
const OUT_FILE = new URL("./recommendations.json", import.meta.url);

function loadKpiReport() {
  return JSON.parse(fs.readFileSync(KPI_REPORT, "utf-8"));
}

// simple “service type” inference from service name
function inferServiceType(serviceName) {
  const s = (serviceName || "").toLowerCase();

  if (s.includes("order")) return "transactional_orders";
  if (s.includes("restaurant")) return "catalog_restaurants";
  if (s.includes("delivery") || s.includes("driver")) return "workflow_delivery";
  if (s.includes("user") || s.includes("auth")) return "identity_users";

  return "generic";
}

// What KPIs we recommend per service type (defendable, domain-based)
function recommendedKpisByType(type) {
  switch (type) {
    case "transactional_orders":
      return [
        "p95_latency_ms",
        "p99_latency_ms",
        "rps",
        "error_rate",
        "payment_webhook_error_rate",
        "state_transition_latency",
        "failed_order_creation_rate",
      ];

    case "catalog_restaurants":
      return [
        "p95_latency_ms",
        "p99_latency_ms",
        "rps",
        "error_rate",
        "image_asset_404_rate",
        "menu_items_read_latency",
        "catalog_write_error_rate",
      ];

    case "workflow_delivery":
      return [
        "p95_latency_ms",
        "p99_latency_ms",
        "rps",
        "error_rate",
        "dispatch_assign_latency",
        "status_update_error_rate",
        "driver_identity_latency",
      ];

    case "identity_users":
      return [
        "p95_latency_ms",
        "p99_latency_ms",
        "rps",
        "error_rate",
        "login_failure_rate",
        "token_validation_error_rate",
        "profile_fetch_latency",
      ];

    default:
      return ["p95_latency_ms", "p99_latency_ms", "rps", "error_rate"];
  }
}

function main() {
  const report = loadKpiReport();

  const recommendations = report.results.map((r) => {
    const service = r.service;
    const type = inferServiceType(service);
    const recommended = recommendedKpisByType(type);

    // Use KPI coverage to highlight what’s still missing (if any)
    const missing = Array.isArray(r.missing_kpis) ? r.missing_kpis : [];

    // Map your “coverage keys” to real KPI names for the recommendation summary
    const coverageMap = {
      latency_avg: "avg_latency_ms",
      traffic_total_requests: "total_requests",
      errors_total_errors: "total_errors",
      memory_heap_used: "heap_used_mb",
      memory_rss: "rss_mb",
      route_level_metrics: "route_metrics",
      latency_percentiles: "p95/p99_latency_ms",
      rps: "rps",
    };

    const missingReadable = missing.map((m) => coverageMap[m] || m);

    return {
      service,
      service_type: type,
      recommended_kpis: recommended,
      missing_kpis_detected: missingReadable,
      note:
        missingReadable.length === 0
          ? "KPI coverage looks complete. Next focus: alerts + thresholds + dashboards."
          : "Add missing KPIs first, then enable signal detection rules.",
    };
  });

  const out = {
    generated_at: Date.now(),
    recommendations,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log("Saved: agent/recommendations.json");
  console.log(JSON.stringify(out, null, 2));
}

main();
