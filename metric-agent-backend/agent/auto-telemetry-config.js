import fs from "fs";

const PRED_FILE = new URL("./ml/outputs/routes_predicted.csv", import.meta.url);
const OUT_FILE = new URL("./telemetry_update_plan.json", import.meta.url);

function readCSV(pathUrl) {
  const text = fs.readFileSync(pathUrl, "utf-8").trim();
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

const INTENT_TO_KPIS = {
  state_transition: ["p95_latency_ms", "p99_latency_ms", "error_rate"],
  catalog_ops: ["p95_latency_ms", "rps", "error_rate"],
  dispatch_workflow: ["p95_latency_ms", "error_rate"],
  availability_ops: ["p95_latency_ms", "error_rate"],
  payments: ["p95_latency_ms", "error_rate"],
  external_callback: ["p95_latency_ms", "error_rate"],
  generic_api: ["p95_latency_ms", "rps", "error_rate"],
};

const KPI_IMPL = {
  p95_latency_ms: { type: "percentile", source: "latency_samples" },
  p99_latency_ms: { type: "percentile", source: "latency_samples" },
  rps: { type: "rate", source: "total_requests/uptime" },
  error_rate: { type: "rate", source: "total_errors/total_requests" },
};

function loadPreviousPlan() {
  try {
    return JSON.parse(fs.readFileSync(OUT_FILE, "utf-8"));
  } catch {
    return {
      generated_at: 0,
      total_rules: 0,
      avg_confidence: 0,
      services_covered: 0,
      actions: [],
    };
  }
}

function buildPreviousMap(previousPlan) {
  const rows = Array.isArray(previousPlan?.actions) ? previousPlan.actions : [];
  return new Map(
    rows.map((a) => [
      `${a.service}::${a.route}::${a.intent}`,
      a,
    ])
  );
}

function computeTrend(currentConfidence, previousConfidence) {
  if (typeof previousConfidence !== "number") return "new";
  if (currentConfidence > previousConfidence) return "improved";
  if (currentConfidence < previousConfidence) return "regressed";
  return "unchanged";
}

function main() {
  if (!fs.existsSync(PRED_FILE)) {
    console.error("Missing predictions CSV:", PRED_FILE.pathname);
    console.error("Run your ML prediction step first.");
    process.exit(1);
  }

  const rows = readCSV(PRED_FILE);
  const previousPlan = loadPreviousPlan();
  const previousMap = buildPreviousMap(previousPlan);

  const actions = [];

  for (const r of rows) {
    const service = r.service;
    const method = r.method;
    const path = r.path_norm || r.path;
    const intent = r.predicted_label;
    const confidence = Number(r.confidence || 0);

    if (confidence < 70) continue;

    const kpis = INTENT_TO_KPIS[intent] || INTENT_TO_KPIS.generic_api;
    const route = `${method} ${path}`;
    const key = `${service}::${route}::${intent}`;
    const previous = previousMap.get(key);

    actions.push({
      action: "ensure_kpis_for_route",
      service,
      route,
      intent,
      confidence,
      previous_confidence:
        typeof previous?.confidence === "number" ? previous.confidence : null,
      confidence_delta:
        typeof previous?.confidence === "number"
          ? Math.round((confidence - previous.confidence) * 100) / 100
          : null,
      trend: computeTrend(
        confidence,
        typeof previous?.confidence === "number" ? previous.confidence : undefined
      ),
      required_kpis: kpis.map((k) => ({
        name: k,
        impl: KPI_IMPL[k] || { type: "custom" },
      })),
    });
  }

  const totalRules = actions.length;
  const avgConfidence =
    actions.length > 0
      ? Math.round(
          (actions.reduce((sum, a) => sum + (Number(a.confidence) || 0), 0) /
            actions.length) *
            100
        ) / 100
      : 0;

  const servicesCovered = new Set(actions.map((a) => a.service)).size;
  const improvedActions = actions.filter((a) => a.trend === "improved").length;
  const regressedActions = actions.filter((a) => a.trend === "regressed").length;
  const newActions = actions.filter((a) => a.trend === "new").length;

  const out = {
    generated_at: Date.now(),
    total_rules: totalRules,
    avg_confidence: avgConfidence,
    services_covered: servicesCovered,
    improved_actions: improvedActions,
    regressed_actions: regressedActions,
    new_actions: newActions,
    actions,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log("Saved:", OUT_FILE.pathname);
  console.log("Actions:", totalRules);
}

main();