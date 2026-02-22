// agent/api/server.js
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// agent/ folder (parent of api/)
const AGENT_DIR = path.resolve(__dirname, "..");

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

// If you want to restrict CORS later, set:
// process.env.ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return ["*"]; // default: allow all (simple)
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const ALLOWED_ORIGINS = getAllowedOrigins();

function setCors(res, req) {
  const origin = req.headers.origin;

  // If wildcard allowed, simplest:
  if (ALLOWED_ORIGINS.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return;
  }

  // If restricted, echo back only allowed origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    // no origin or not allowed -> still no crash, just no CORS header
  }
}

function commonHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
}

function sendJson(req, res, status, obj) {
  res.statusCode = status;
  setCors(res, req);
  commonHeaders(res);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj, null, 2));
}

function sendText(req, res, status, text) {
  res.statusCode = status;
  setCors(res, req);
  commonHeaders(res);

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
}

function readFileSafe(filePath, fallback) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return fallback;
  }
}

function readJsonFileSafe(filePath, fallbackObj) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallbackObj;
  }
}

function notFound(req, res) {
  sendJson(req, res, 404, { ok: false, error: "not_found" });
}

function ok(req, res, payload) {
  sendJson(req, res, 200, payload);
}

const files = {
  signals: path.join(AGENT_DIR, "signals.json"),
  baseline: path.join(AGENT_DIR, "baseline.json"),
  kpi: path.join(AGENT_DIR, "kpi_coverage_report.json"),
  recs: path.join(AGENT_DIR, "recommendations.json"),
  plan: path.join(AGENT_DIR, "telemetry_update_plan.json"),
  prom: path.join(AGENT_DIR, "prometheus_style_suggestions.txt"),
};

const server = http.createServer((req, res) => {
  // Basic URL parse
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  } catch {
    return sendJson(req, res, 400, { ok: false, error: "bad_url" });
  }

  const pathname = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    setCors(res, req);
    commonHeaders(res);

    res.writeHead(204, {
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (req.method !== "GET") {
    return sendJson(req, res, 405, { ok: false, error: "method_not_allowed" });
  }

  // Routes
  if (pathname === "/health") {
    return ok(req, res, { ok: true, service: "agent-api", ts: Date.now() });
  }

  if (pathname === "/api/signals") {
    return ok(
      req,
      res,
      readJsonFileSafe(files.signals, {
        generated_at: Date.now(),
        samples: 0,
        signals: [],
      })
    );
  }

  if (pathname === "/api/baseline") {
    return ok(req, res, readJsonFileSafe(files.baseline, { services: {} }));
  }

  if (pathname === "/api/kpi-coverage") {
    return ok(
      req,
      res,
      readJsonFileSafe(files.kpi, {
        generated_at: Date.now(),
        results: [],
      })
    );
  }

  if (pathname === "/api/recommendations") {
    return ok(
      req,
      res,
      readJsonFileSafe(files.recs, {
        generated_at: Date.now(),
        recommendations: [],
      })
    );
  }

  if (pathname === "/api/update-plan") {
    return ok(
      req,
      res,
      readJsonFileSafe(files.plan, {
        generated_at: Date.now(),
        total_rules: 0,
        actions: [],
      })
    );
  }

  if (pathname === "/api/prom-suggestions") {
    return sendText(
      req,
      res,
      200,
      readFileSafe(files.prom, "# (empty) run plan-to-prometheus-style.js\n")
    );
  }

  // One endpoint for the frontend (so UI can load everything in 1 request)
  if (pathname === "/api/summary") {
    const summary = {
      generated_at: Date.now(),
      signals: readJsonFileSafe(files.signals, { generated_at: Date.now(), samples: 0, signals: [] }),
      kpi_coverage: readJsonFileSafe(files.kpi, { generated_at: Date.now(), results: [] }),
      recommendations: readJsonFileSafe(files.recs, { generated_at: Date.now(), recommendations: [] }),
      update_plan: readJsonFileSafe(files.plan, { generated_at: Date.now(), total_rules: 0, actions: [] }),
      prom_suggestions_text: readFileSafe(files.prom, "# (empty) run plan-to-prometheus-style.js\n"),
    };
    return ok(req, res, summary);
  }

  return notFound(req, res);
});

server.listen(PORT, () => {
  console.log(`[agent-api] running on http://localhost:${PORT}`);
  console.log(`[agent-api] endpoints:`);
  console.log(`  GET /health`);
  console.log(`  GET /api/signals`);
  console.log(`  GET /api/baseline`);
  console.log(`  GET /api/kpi-coverage`);
  console.log(`  GET /api/recommendations`);
  console.log(`  GET /api/update-plan`);
  console.log(`  GET /api/prom-suggestions`);
  console.log(`  GET /api/summary`);
});
