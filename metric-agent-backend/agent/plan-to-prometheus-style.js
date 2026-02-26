// agent/plan-to-prometheus-style.js
import fs from "fs";
import { fileURLToPath } from "url";

const PLAN_URL = new URL("./telemetry_update_plan.json", import.meta.url);
const OUT_URL = new URL("./prometheus_style_suggestions.txt", import.meta.url);

const PLAN_FILE = fileURLToPath(PLAN_URL);
const OUT_FILE = fileURLToPath(OUT_URL);

function safe(s) {
  return String(s ?? "").replace(/"/g, '\\"');
}

function normalizeRoutePath(path) {
  return String(path)
    .replace(/\b\d{6,}\b/g, ":num")        // big numbers
    .replace(/\b[a-f0-9]{24}\b/gi, ":id")  // mongo-like ids
    .replace(/\bid\d+\b/gi, ":id")         // id123 style
    .replace(/\/[^/]*:\w+/g, (m) => m);    // keep :kw, :kws as-is
}

function parseRoute(routeStr) {
  // routeStr example: "DELETE /api/:kws/id123/:kw/:num"
  const [method, ...rest] = String(routeStr).trim().split(" ");
  return { method: method || "GET", path: rest.join(" ") || "/" };
}

function unique(arr) {
  return [...new Set(arr)];
}

function kpiToMetrics(kpiName, ctx) {
  const { service, method, path, intent } = ctx;
  const labels = `service="${safe(service)}",route="${safe(path)}",method="${safe(method)}"`;

  const base = {
    latency: [
      `http_request_duration_ms_bucket{${labels}} histogram`,
      `http_request_duration_ms_sum{${labels}} counter`,
      `http_request_duration_ms_count{${labels}} counter`,
    ],
    traffic: [`http_requests_total{${labels}} counter`],
    errors: [`http_errors_total{${labels}} counter`],
  };

  switch (kpiName) {
    case "p95_latency_ms":
      return [
        ...base.latency,
        `# p95 derived: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))`,
      ];

    case "p99_latency_ms":
      return [
        ...base.latency,
        `# p99 derived: histogram_quantile(0.99, rate(http_request_duration_ms_bucket[5m]))`,
      ];

    case "rps":
      return [
        ...base.traffic,
        `# RPS derived: rate(http_requests_total[1m])`,
      ];

    case "error_rate":
      return [
        ...base.errors,
        ...base.traffic,
        `# error_rate derived: rate(http_errors_total[1m]) / rate(http_requests_total[1m])`,
      ];

    // Domain KPIs (custom counters/timers)
    case "payment_webhook_error_rate":
      return [
        `payment_webhook_errors_total{service="${safe(service)}"} counter`,
        `payment_webhook_calls_total{service="${safe(service)}"} counter`,
        `# derived: rate(payment_webhook_errors_total[1m]) / rate(payment_webhook_calls_total[1m])`,
      ];

    case "state_transition_latency":
      return [
        `state_transition_duration_ms_bucket{service="${safe(service)}",route="${safe(path)}"} histogram`,
        `state_transition_duration_ms_sum{service="${safe(service)}",route="${safe(path)}"} counter`,
        `state_transition_duration_ms_count{service="${safe(service)}",route="${safe(path)}"} counter`,
      ];

    case "failed_order_creation_rate":
      return [
        `orders_create_failures_total{service="${safe(service)}"} counter`,
        `orders_create_total{service="${safe(service)}"} counter`,
        `# derived: rate(orders_create_failures_total[1m]) / rate(orders_create_total[1m])`,
      ];

    case "image_asset_404_rate":
      return [
        `image_asset_404_total{service="${safe(service)}"} counter`,
        `image_asset_requests_total{service="${safe(service)}"} counter`,
        `# derived: rate(image_asset_404_total[1m]) / rate(image_asset_requests_total[1m])`,
      ];

    case "menu_items_read_latency":
      return [
        `menu_items_read_duration_ms_bucket{service="${safe(service)}"} histogram`,
        `menu_items_read_duration_ms_sum{service="${safe(service)}"} counter`,
        `menu_items_read_duration_ms_count{service="${safe(service)}"} counter`,
      ];

    case "catalog_write_error_rate":
      return [
        `catalog_write_errors_total{service="${safe(service)}"} counter`,
        `catalog_write_total{service="${safe(service)}"} counter`,
        `# derived: rate(catalog_write_errors_total[1m]) / rate(catalog_write_total[1m])`,
      ];

    case "dispatch_assign_latency":
      return [
        `dispatch_assign_duration_ms_bucket{service="${safe(service)}"} histogram`,
        `dispatch_assign_duration_ms_sum{service="${safe(service)}"} counter`,
        `dispatch_assign_duration_ms_count{service="${safe(service)}"} counter`,
      ];

    case "status_update_error_rate":
      return [
        `delivery_status_update_errors_total{service="${safe(service)}"} counter`,
        `delivery_status_update_total{service="${safe(service)}"} counter`,
        `# derived: rate(delivery_status_update_errors_total[1m]) / rate(delivery_status_update_total[1m])`,
      ];

    case "driver_identity_latency":
      return [
        `driver_identity_duration_ms_bucket{service="${safe(service)}"} histogram`,
        `driver_identity_duration_ms_sum{service="${safe(service)}"} counter`,
        `driver_identity_duration_ms_count{service="${safe(service)}"} counter`,
      ];

    case "login_failure_rate":
      return [
        `login_failures_total{service="${safe(service)}"} counter`,
        `login_attempts_total{service="${safe(service)}"} counter`,
        `# derived: rate(login_failures_total[1m]) / rate(login_attempts_total[1m])`,
      ];

    case "token_validation_error_rate":
      return [
        `token_validation_errors_total{service="${safe(service)}"} counter`,
        `token_validation_total{service="${safe(service)}"} counter`,
        `# derived: rate(token_validation_errors_total[1m]) / rate(token_validation_total[1m])`,
      ];

    case "profile_fetch_latency":
      return [
        `profile_fetch_duration_ms_bucket{service="${safe(service)}"} histogram`,
        `profile_fetch_duration_ms_sum{service="${safe(service)}"} counter`,
        `profile_fetch_duration_ms_count{service="${safe(service)}"} counter`,
      ];

    default:
      return [
        `# Unknown KPI "${kpiName}" (intent=${intent})`,
        ...base.latency,
        ...base.errors,
        ...base.traffic,
      ];
  }
}

function main() {
  if (!fs.existsSync(PLAN_FILE)) {
    console.error(`Missing telemetry_update_plan.json at: ${PLAN_FILE}`);
    console.error("Run: node auto-telemetry-config.js");
    process.exit(1);
  }

  const plan = JSON.parse(fs.readFileSync(PLAN_FILE, "utf-8"));
  const actions = Array.isArray(plan.actions) ? plan.actions : [];

  // Group by service
  const byService = new Map();
  for (const a of actions) {
    const svc = a.service || "unknown-service";
    if (!byService.has(svc)) byService.set(svc, []);
    byService.get(svc).push(a);
  }

  const lines = [];
  lines.push(`# Prometheus-style metric suggestions (naming + labels)`);
  lines.push(`# Generated at: ${new Date(plan.generated_at || Date.now()).toISOString()}`);
  lines.push(`# NOTE: This is ONLY a suggestion format. You are not using Prometheus.`);
  lines.push("");

  for (const [service, svcActions] of byService.entries()) {
    lines.push(`# --- ${service} ---`);

    for (const a of svcActions) {
      const parsed = parseRoute(a.route);
      const intent = a.intent || "unknown_intent";
      const conf = a.confidence ?? "";

      const norm = normalizeRoutePath(parsed.path);

      lines.push(`# Route: ${parsed.method} ${norm} (intent=${intent}, conf=${conf})`);

      const required = Array.isArray(a.required_kpis)
        ? a.required_kpis.map((x) => x?.name).filter(Boolean)
        : [];

      let metricLines = [];
      for (const kpi of required) {
        metricLines.push(...kpiToMetrics(kpi, { service, method: parsed.method, path: norm, intent }));
      }

      metricLines = unique(metricLines);
      lines.push(...metricLines.map((m) => `  ${m}`));
      lines.push("");
    }

    lines.push("");
  }

  fs.writeFileSync(OUT_FILE, lines.join("\n"));
  console.log("Saved:", OUT_FILE);
}

main();
