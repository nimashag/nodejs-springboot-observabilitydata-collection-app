import fs from "fs";

const config = JSON.parse(
  fs.readFileSync(new URL("./services.json", import.meta.url), "utf-8")
);

const BASELINE_FILE = new URL("./baseline.json", import.meta.url);
const COOLDOWN_MS = 60_000; // 60 seconds

function loadBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, "utf-8"));
  } catch {
    return { services: {} };
  }
}

function saveBaseline(b) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(b, null, 2));
}

async function fetchTelemetry(service) {
  const res = await fetch(service.url);
  if (!res.ok) throw new Error(`${service.name} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}

function severityFromZ(z) {
  if (z >= 4) return "critical";
  if (z >= 3) return "warning";
  return "info";
}

function confidenceFromZ(z) {
  const c = Math.min(0.99, Math.max(0.5, z / 5));
  return Math.round(c * 100) / 100;
}

function parseNumberArg(flag, fallback) {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!arg) return fallback;
  const val = Number(arg.split("=")[1]);
  return Number.isFinite(val) ? val : fallback;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function topSlowRoutes(telemetry, n = 3) {
  const routes = Array.isArray(telemetry.routes) ? telemetry.routes : [];
  const filtered = routes.filter((r) => !String(r.route).includes("/telemetry"));
  const sorted = [...filtered].sort((a, b) => (b.avg_latency_ms || 0) - (a.avg_latency_ms || 0));
  return sorted.slice(0, n).map((r) => ({
    route: r.route,
    avg_latency_ms: r.avg_latency_ms ?? 0,
    count: r.count ?? 0,
    errors: r.errors ?? 0,
  }));
}

function topErrorRoutes(telemetry, n = 3) {
  const routes = Array.isArray(telemetry.routes) ? telemetry.routes : [];
  const filtered = routes.filter((r) => !String(r.route).includes("/telemetry"));
  const sorted = [...filtered].sort((a, b) => (b.errors || 0) - (a.errors || 0));
  return sorted
    .filter((r) => (r.errors || 0) > 0)
    .slice(0, n)
    .map((r) => ({
      route: r.route,
      errors: r.errors ?? 0,
      count: r.count ?? 0,
      avg_latency_ms: r.avg_latency_ms ?? 0,
    }));
}

function cooldownOk(serviceState, key) {
  serviceState.last_signal_ts ??= {};
  const last = Number(serviceState.last_signal_ts[key] ?? 0);
  return (Date.now() - last) >= COOLDOWN_MS;
}

function markCooldown(serviceState, key) {
  serviceState.last_signal_ts ??= {};
  serviceState.last_signal_ts[key] = Date.now();
}

async function main() {
  const baseline = loadBaseline();
  const signals = [];

  const SAMPLES = parseNumberArg("--samples", 1);
  const INTERVAL_MS = parseNumberArg("--intervalMs", 2000);

  for (let i = 0; i < SAMPLES; i++) {
    for (const s of config.services) {
      try {
        const t = await fetchTelemetry(s);
        const serviceKey = t.service || s.name;

        const currentLatency = Number(t.http?.avg_latency_ms ?? 0);
        const totalErrors = Number(t.http?.total_errors ?? 0);

        baseline.services[serviceKey] ??= {};
        const state = baseline.services[serviceKey];

        state.avg_latency_ms ??= [];
        state.error_delta ??= [];
        state.last_total_errors ??= totalErrors;
        state.last_signal_ts ??= {};

        // ----- latency history -----
        const latHist = state.avg_latency_ms;
        latHist.push(currentLatency);
        while (latHist.length > 30) latHist.shift();

        // ----- error delta history -----
        const lastTotal = Number(state.last_total_errors ?? totalErrors);
        const delta = Math.max(0, totalErrors - lastTotal);
        state.last_total_errors = totalErrors;

        const errDeltaHist = state.error_delta;
        errDeltaHist.push(delta);
        while (errDeltaHist.length > 30) errDeltaHist.shift();

        // ----- Detect: latency_spike -----
        if (latHist.length >= 10) {
          const prev = latHist.slice(0, -1);
          const m = mean(prev);
          const sd = std(prev);
          const z = sd === 0 ? Infinity : Math.abs((currentLatency - m) / sd);

          // Prevent micro-spikes
          const MIN_LATENCY_INCREASE_MS = 200;
          const MIN_CURRENT_LATENCY_MS = 250;

          const isSpikeWhenSdZero =
            (sd === 0) &&
            (currentLatency >= MIN_CURRENT_LATENCY_MS) &&
            ((currentLatency - m) >= MIN_LATENCY_INCREASE_MS);

          const isSpikeByZScore =
            (sd !== 0) &&
            (z >= 3) &&
            (currentLatency > m) &&
            ((currentLatency - m) >= MIN_LATENCY_INCREASE_MS);

          if (isSpikeWhenSdZero || isSpikeByZScore) {
            const key = "latency_spike";
            if (cooldownOk(state, key)) {
              markCooldown(state, key);
              signals.push({
                service: serviceKey,
                signal: "latency_spike",
                severity: "critical",
                confidence: 0.99,
                metric: "avg_latency_ms",
                current: currentLatency,
                baseline_mean: Math.round(m),
                baseline_std: Math.round(sd),
                z_score: sd === 0 ? "inf" : Math.round(z * 100) / 100,
                top_slow_routes: topSlowRoutes(t, 3),
                timestamp: Date.now(),
              });
            }
          }
        }

        // ----- Detect: error_burst -----
        if (errDeltaHist.length >= 10) {
          const prev = errDeltaHist.slice(0, -1);
          const m = mean(prev);
          const sd = std(prev);
          const z = sd === 0 ? Infinity : Math.abs((delta - m) / sd);

          const isBurstWhenSdZero = (sd === 0 && delta >= 5);
          const isBurstByZScore = (sd !== 0 && z >= 3 && delta > m);

          if ((isBurstWhenSdZero || isBurstByZScore) && delta > 0) {
            const key = "error_burst";
            if (cooldownOk(state, key)) {
              markCooldown(state, key);
              signals.push({
                service: serviceKey,
                signal: "error_burst",
                severity: isBurstWhenSdZero ? "critical" : severityFromZ(z),
                confidence: 0.99,
                metric: "error_delta_per_interval",
                current_delta: delta,
                baseline_mean: Math.round(m),
                baseline_std: Math.round(sd),
                z_score: sd === 0 ? "inf" : Math.round(z * 100) / 100,
                top_error_routes: topErrorRoutes(t, 3),
                timestamp: Date.now(),
              });
            }
          }
        }
      } catch (e) {
        signals.push({ service: s.name, error: String(e?.message || e) });
      }
    }

    saveBaseline(baseline);
    if (i < SAMPLES - 1) await sleep(INTERVAL_MS);
  }

  const out = { generated_at: Date.now(), samples: SAMPLES, signals };
  fs.writeFileSync(new URL("./signals.json", import.meta.url), JSON.stringify(out, null, 2));
  console.log("Saved: agent/signals.json and agent/baseline.json");
  console.log(JSON.stringify(out, null, 2));
}

main();
