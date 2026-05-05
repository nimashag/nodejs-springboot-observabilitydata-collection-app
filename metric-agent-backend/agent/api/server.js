// agent/api/server.js
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AGENT_DIR = path.resolve(__dirname, "..");

const PORT = process.env.PORT ? Number(process.env.PORT) : 3006;

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return ["*"];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const ALLOWED_ORIGINS = getAllowedOrigins();

function setCors(res, req) {
  const origin = req.headers.origin;

  if (ALLOWED_ORIGINS.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return;
  }

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
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

function writeJsonFileSafe(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

function notFound(req, res) {
  sendJson(req, res, 404, { ok: false, error: "not_found" });
}

function ok(req, res, payload) {
  sendJson(req, res, 200, payload);
}

const files = {
  signals: path.join(AGENT_DIR, "signals.json"),
  history: path.join(AGENT_DIR, "signals_history.json"),
  baseline: path.join(AGENT_DIR, "baseline.json"),
  kpi: path.join(AGENT_DIR, "kpi_coverage_report.json"),
  recs: path.join(AGENT_DIR, "recommendations.json"),
  plan: path.join(AGENT_DIR, "telemetry_update_plan.json"),
  prom: path.join(AGENT_DIR, "prometheus_style_suggestions.txt"),
};

function startLoopedWorker({
  name,
  scriptName,
  intervalMs,
  args = [],
  restartDelayMs = 3.6 * 1e6,
}) {
  const scriptPath = path.join(AGENT_DIR, scriptName);

  function runOnce() {
    const child = spawn("node", [scriptPath, ...args], {
      stdio: "inherit",
    });

    child.on("exit", (code, signal) => {
      console.log(
        `[agent-api] ${name} stopped (code=${code}, signal=${signal}). Restarting in ${restartDelayMs}ms...`
      );
      setTimeout(runOnce, restartDelayMs);
    });

    child.on("error", (err) => {
      console.error(`[agent-api] failed to start ${name}:`, err);
      setTimeout(runOnce, restartDelayMs);
    });
  }

  runOnce();
  console.log(`[agent-api] ${name} auto-started (interval: ${intervalMs}ms)`);
}

function runScriptOnce(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(AGENT_DIR, scriptName);

    const child = spawn("node", [scriptPath, ...args], {
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`${scriptName} exited with code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

function startSignalDetector() {
  startLoopedWorker({
    name: "signal-detector",
    scriptName: "signal-detector.js",
    intervalMs: 3.6 * 1e6, // 1 hour
    args: ["--samples=1", "--intervalMs=3.6*1e6"],
  });
}

function startKpiCoverageChecker() {
  startLoopedWorker({
    name: "kpi-coverage-checker",
    scriptName: "kpi-coverage-checker.js",
    intervalMs: 3.6 * 1e6, // 1 hour
    args: [],
  });
}

function startUpdatePlanGenerator() {
  startLoopedWorker({
    name: "update-plan-generator",
    scriptName: "auto-telemetry-config.js",
    intervalMs: 3.6 * 1e6, // 1 hour
    args: [],
  });
}

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  } catch {
    return sendJson(req, res, 400, { ok: false, error: "bad_url" });
  }

  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    setCors(res, req);
    commonHeaders(res);
    res.writeHead(204, {
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (!["GET", "POST", "OPTIONS"].includes(req.method || "")) {
    return sendJson(req, res, 405, {
      ok: false,
      error: "method_not_allowed",
    });
  }

  if (pathname === "/api/metric/health" && req.method === "GET") {
    return ok(req, res, { ok: true, service: "agent-api", ts: Date.now() });
  }

  if (pathname === "/api/metric/signals" && req.method === "GET") {
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

  if (pathname === "/api/metric/signals-history" && req.method === "GET") {
    return ok(
      req,
      res,
      readJsonFileSafe(files.history, {
        generated_at: Date.now(),
        total_signals: 0,
        signals: [],
      })
    );
  }

  if (
    pathname === "/api/metric/signals-history/reset" &&
    req.method === "POST"
  ) {
    const empty = {
      generated_at: Date.now(),
      total_signals: 0,
      signals: [],
    };

    writeJsonFileSafe(files.history, empty);

    return ok(req, res, {
      ok: true,
      message: "signals history reset",
      generated_at: empty.generated_at,
    });
  }

  if (pathname === "/api/metric/baseline" && req.method === "GET") {
    return ok(req, res, readJsonFileSafe(files.baseline, { services: {} }));
  }

  if (pathname === "/api/metric/kpi-coverage" && req.method === "GET") {
    return ok(
      req,
      res,
      readJsonFileSafe(files.kpi, {
        generated_at: Date.now(),
        services_checked: 0,
        services_missing_kpis: 0,
        avg_score: 0,
        improved_services: 0,
        regressed_services: 0,
        results: [],
      })
    );
  }

  if (pathname === "/api/metric/recommendations" && req.method === "GET") {
    return ok(
      req,
      res,
      readJsonFileSafe(files.recs, {
        generated_at: Date.now(),
        recommendations: [],
      })
    );
  }

  if (pathname === "/api/metric/update-plan" && req.method === "GET") {
    return ok(
      req,
      res,
      readJsonFileSafe(files.plan, {
        generated_at: Date.now(),
        total_rules: 0,
        avg_confidence: 0,
        services_covered: 0,
        improved_actions: 0,
        regressed_actions: 0,
        new_actions: 0,
        actions: [],
      })
    );
  }

  if (pathname === "/api/metric/prom-suggestions" && req.method === "GET") {
    return sendText(
      req,
      res,
      200,
      readFileSafe(files.prom, "# (empty) run plan-to-prometheus-style.js\n")
    );
  }

  if (
    pathname === "/api/metric/prom-suggestions/refresh" &&
    req.method === "POST"
  ) {
    try {
      await runScriptOnce("plan-to-prometheus-style.js");

      const text = readFileSafe(
        files.prom,
        "# (empty) run plan-to-prometheus-style.js\n"
      );

      return ok(req, res, {
        ok: true,
        message: "prom suggestions refreshed",
        generated_at: Date.now(),
        lines: text.split(/\r?\n/).filter(Boolean).length,
      });
    } catch (err) {
      return sendJson(req, res, 500, {
        ok: false,
        error: String(err?.message || err),
      });
    }
  }

  if (pathname === "/api/metric/summary" && req.method === "GET") {
    const summary = {
      generated_at: Date.now(),
      signals: readJsonFileSafe(files.signals, {
        generated_at: Date.now(),
        samples: 0,
        signals: [],
      }),
      signals_history: readJsonFileSafe(files.history, {
        generated_at: Date.now(),
        total_signals: 0,
        signals: [],
      }),
      kpi_coverage: readJsonFileSafe(files.kpi, {
        generated_at: Date.now(),
        services_checked: 0,
        services_missing_kpis: 0,
        avg_score: 0,
        improved_services: 0,
        regressed_services: 0,
        results: [],
      }),
      recommendations: readJsonFileSafe(files.recs, {
        generated_at: Date.now(),
        recommendations: [],
      }),
      update_plan: readJsonFileSafe(files.plan, {
        generated_at: Date.now(),
        total_rules: 0,
        avg_confidence: 0,
        services_covered: 0,
        improved_actions: 0,
        regressed_actions: 0,
        new_actions: 0,
        actions: [],
      }),
      prom_suggestions_text: readFileSafe(
        files.prom,
        "# (empty) run plan-to-prometheus-style.js\n"
      ),
    };

    return ok(req, res, summary);
  }

  return notFound(req, res);
});

startSignalDetector();
startKpiCoverageChecker();
startUpdatePlanGenerator();

server.listen(PORT, () => {
  console.log(`[agent-api] running on http://localhost:${PORT}`);
  console.log(`[agent-api] endpoints:`);
  console.log(`  GET /api/metric/health`);
  console.log(`  GET /api/metric/signals`);
  console.log(`  GET /api/metric/signals-history`);
  console.log(`  POST /api/metric/signals-history/reset`);
  console.log(`  GET /api/metric/baseline`);
  console.log(`  GET /api/metric/kpi-coverage`);
  console.log(`  GET /api/metric/recommendations`);
  console.log(`  GET /api/metric/update-plan`);
  console.log(`  GET /api/metric/prom-suggestions`);
  console.log(`  POST /api/metric/prom-suggestions/refresh`);
  console.log(`  GET /api/metric/summary`);
});
