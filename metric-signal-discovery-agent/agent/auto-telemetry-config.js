import fs from "fs";

// Inputs
const PRED_FILE = new URL("./ml/outputs/routes_predicted.csv", import.meta.url); // change if your filename differs
const OUT_FILE = new URL("./telemetry_update_plan.json", import.meta.url);

// Simple parser for CSV (no libs)
function readCSV(pathUrl) {
  const text = fs.readFileSync(pathUrl, "utf-8").trim();
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h.trim()] = (cols[i] ?? "").trim()));
    return row;
  });
}

// Map route intent -> KPIs needed (customize as you like)
const INTENT_TO_KPIS = {
  state_transition: ["p95_latency_ms", "p99_latency_ms", "error_rate"],
  catalog_ops: ["p95_latency_ms", "rps", "error_rate"],
  dispatch_workflow: ["p95_latency_ms", "error_rate"],
  availability_ops: ["p95_latency_ms", "error_rate"],
  payments: ["p95_latency_ms", "error_rate"],
  external_callback: ["p95_latency_ms", "error_rate"],
  generic_api: ["p95_latency_ms", "rps", "error_rate"],
};

// Where KPIs should be implemented (your “telemetry config targets”)
const KPI_IMPL = {
  p95_latency_ms: { type: "percentile", source: "latency_samples" },
  p99_latency_ms: { type: "percentile", source: "latency_samples" },
  rps: { type: "rate", source: "total_requests/uprime" },
  error_rate: { type: "rate", source: "total_errors/total_requests" },
};

function main() {
  if (!fs.existsSync(PRED_FILE)) {
    console.error("Missing predictions CSV:", PRED_FILE.pathname);
    console.error("Run your ML prediction step first.");
    process.exit(1);
  }

  const rows = readCSV(PRED_FILE);

  // Expect columns like:
  // service,method,path,path_norm,predicted_label,confidence
  const actions = [];

  for (const r of rows) {
    const service = r.service;
    const method = r.method;
    const path = r.path_norm || r.path;
    const intent = r.predicted_label;
    const confidence = Number(r.confidence || 0);

    // Only auto-config when confident enough
    if (confidence < 70) continue;

    const kpis = INTENT_TO_KPIS[intent] || INTENT_TO_KPIS.generic_api;

    actions.push({
      action: "ensure_kpis_for_route",
      service,
      route: `${method} ${path}`,
      intent,
      confidence,
      required_kpis: kpis.map((k) => ({ name: k, impl: KPI_IMPL[k] || { type: "custom" } })),
    });
  }

  const out = {
    generated_at: Date.now(),
    total_rules: actions.length,
    actions,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log("Saved:", OUT_FILE.pathname);
  console.log("Actions:", actions.length);
}

main();
