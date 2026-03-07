import fs from "fs";

const config = JSON.parse(
  fs.readFileSync(new URL("./services.json", import.meta.url), "utf-8")
);

const BASELINE_FILE = new URL("./baseline.json", import.meta.url);
const SIGNALS_FILE = new URL("./signals.json", import.meta.url);
const SIGNALS_HISTORY_FILE = new URL("./signals_history.json", import.meta.url);

const COOLDOWN_MS = 60_000;
const MAX_HISTORY_SIGNALS = 2000;

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function loadBaseline() {
  return loadJson(BASELINE_FILE, { services: {} });
}

function saveBaseline(b) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(b, null, 2));
}

function loadSignalsHistory() {
  const fallback = {
    generated_at: Date.now(),
    total_signals: 0,
    signals: [],
  };

  const data = loadJson(SIGNALS_HISTORY_FILE, fallback);

  if (!data || typeof data !== "object") return fallback;
  if (!Array.isArray(data.signals)) return fallback;

  return {
    generated_at:
      typeof data.generated_at === "number" ? data.generated_at : Date.now(),
    total_signals:
      typeof data.total_signals === "number"
        ? data.total_signals
        : data.signals.length,
    signals: data.signals.filter((s) => s && typeof s === "object"),
  };
}

function saveSignalsHistory(history) {
  const safeHistory = {
    generated_at:
      typeof history.generated_at === "number"
        ? history.generated_at
        : Date.now(),
    total_signals: Array.isArray(history.signals) ? history.signals.length : 0,
    signals: Array.isArray(history.signals) ? history.signals : [],
  };

  fs.writeFileSync(SIGNALS_HISTORY_FILE, JSON.stringify(safeHistory, null, 2));
}

async function fetchTelemetry(service) {
  const res = await fetch(service.url);
  if (!res.ok)
    throw new Error(`${service.name} failed: ${res.status} ${res.statusText}`);
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

function parseNumberArg(flag, fallback) {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!arg) return fallback;
  const val = Number(arg.split("=")[1]);
  return Number.isFinite(val) ? val : fallback;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getHeapUsedMb(t) {
  return Number(t.process?.heap_used_mb ?? t.process?.heap_used ?? 0);
}

function getRps(t) {
  return Number(t.http?.rps ?? t.http?.requests_per_sec ?? t.http?.rps_avg ?? 0);
}

function getErrorRate(totalErrors, totalRequests) {
  if (!totalRequests || totalRequests <= 0) return 0;
  return totalErrors / totalRequests;
}

function topSlowRoutes(telemetry, n = 3) {
  const routes = Array.isArray(telemetry.routes) ? telemetry.routes : [];
  const filtered = routes.filter((r) => !String(r.route).includes("/telemetry"));
  const sorted = [...filtered].sort(
    (a, b) => (b.avg_latency_ms || 0) - (a.avg_latency_ms || 0)
  );
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
  return Date.now() - last >= COOLDOWN_MS;
}

function markCooldown(serviceState, key) {
  serviceState.last_signal_ts ??= {};
  serviceState.last_signal_ts[key] = Date.now();
}

function pushSignal(signals, state, key, payload) {
  if (!cooldownOk(state, key)) return;
  markCooldown(state, key);
  signals.push(payload);
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

        const currentLatency = Number(
          t.http?.p95_latency_ms ?? t.http?.avg_latency_ms ?? 0
        );
        const currentAvgLatency = Number(t.http?.avg_latency_ms ?? 0);
        const totalErrors = Number(t.http?.total_errors ?? 0);
        const totalRequests = Number(t.http?.total_requests ?? 0);
        const currentRps = getRps(t);
        const currentHeapMb = getHeapUsedMb(t);
        const currentErrorRate = getErrorRate(totalErrors, totalRequests);

        baseline.services[serviceKey] ??= {};
        const state = baseline.services[serviceKey];

        state.latency_p95_ms ??= [];
        state.avg_latency_ms ??= [];
        state.error_delta ??= [];
        state.rps ??= [];
        state.error_rate ??= [];
        state.heap_used_mb ??= [];
        state.idle_streak ??= 0;
        state.last_total_errors ??= totalErrors;
        state.last_signal_ts ??= {};

        const latHist = state.latency_p95_ms;
        latHist.push(currentLatency);
        while (latHist.length > 30) latHist.shift();

        const avgLatHist = state.avg_latency_ms;
        avgLatHist.push(currentAvgLatency);
        while (avgLatHist.length > 30) avgLatHist.shift();

        const rpsHist = state.rps;
        rpsHist.push(currentRps);
        while (rpsHist.length > 30) rpsHist.shift();

        const heapHist = state.heap_used_mb;
        heapHist.push(currentHeapMb);
        while (heapHist.length > 30) heapHist.shift();

        const errRateHist = state.error_rate;
        errRateHist.push(currentErrorRate);
        while (errRateHist.length > 30) errRateHist.shift();

        const lastTotal = Number(state.last_total_errors ?? totalErrors);
        const delta = Math.max(0, totalErrors - lastTotal);
        state.last_total_errors = totalErrors;

        const errDeltaHist = state.error_delta;
        errDeltaHist.push(delta);
        while (errDeltaHist.length > 30) errDeltaHist.shift();

        if (currentRps <= 0.01) state.idle_streak += 1;
        else state.idle_streak = 0;

        // 1) latency_spike (service p95)
        if (latHist.length >= 10) {
          const prev = latHist.slice(0, -1);
          const m = mean(prev);
          const sd = std(prev);
          const z = sd === 0 ? Infinity : Math.abs((currentLatency - m) / sd);

          const isSpikeWhenSdZero =
            sd === 0 && currentLatency >= 500 && currentLatency - m >= 200;
          const isSpikeByZScore =
            sd !== 0 && z >= 3 && currentLatency > m && currentLatency - m >= 200;

          if (isSpikeWhenSdZero || isSpikeByZScore) {
            pushSignal(signals, state, "latency_spike", {
              service: serviceKey,
              signal: "latency_spike",
              severity: "critical",
              confidence: 0.99,
              metric: "p95_latency_ms",
              current: currentLatency,
              baseline_mean: Math.round(m),
              baseline_std: Math.round(sd),
              z_score: sd === 0 ? "inf" : Math.round(z * 100) / 100,
              top_slow_routes: topSlowRoutes(t, 3),
              timestamp: Date.now(),
            });
          }
        }

        // 2) error_burst
        if (errDeltaHist.length >= 10) {
          const prev = errDeltaHist.slice(0, -1);
          const m = mean(prev);
          const sd = std(prev);
          const z = sd === 0 ? Infinity : Math.abs((delta - m) / sd);

          const isBurstWhenSdZero = sd === 0 && delta >= 5;
          const isBurstByZScore = sd !== 0 && z >= 3 && delta > m;

          if ((isBurstWhenSdZero || isBurstByZScore) && delta > 0) {
            pushSignal(signals, state, "error_burst", {
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

        // 3) traffic_spike
        if (rpsHist.length >= 10) {
          const prev = rpsHist.slice(0, -1);
          const m = mean(prev);
          const sd = std(prev);
          const z = sd === 0 ? Infinity : Math.abs((currentRps - m) / sd);

          const isSpikeWhenSdZero = sd === 0 && currentRps >= Math.max(1, m * 2);
          const isSpikeByZScore = sd !== 0 && z >= 3 && currentRps > m;

          if (isSpikeWhenSdZero || isSpikeByZScore) {
            pushSignal(signals, state, "traffic_spike", {
              service: serviceKey,
              signal: "traffic_spike",
              severity: severityFromZ(z),
              confidence: 0.95,
              metric: "rps",
              current: Math.round(currentRps * 100) / 100,
              baseline_mean: Math.round(m * 100) / 100,
              baseline_std: Math.round(sd * 100) / 100,
              z_score: sd === 0 ? "inf" : Math.round(z * 100) / 100,
              timestamp: Date.now(),
            });
          }
        }

        // 4) traffic_drop
        if (rpsHist.length >= 10) {
          const prev = rpsHist.slice(0, -1);
          const m = mean(prev);
          const sd = std(prev);
          const z = sd === 0 ? Infinity : Math.abs((currentRps - m) / sd);

          const isDropByThreshold =
            m >= 0.2 && currentRps < m * 0.4 && m - currentRps >= 0.1;
          const isDropByZScore = sd !== 0 && z >= 3 && currentRps < m;

          if (isDropByThreshold || isDropByZScore) {
            pushSignal(signals, state, "traffic_drop", {
              service: serviceKey,
              signal: "traffic_drop",
              severity: "warning",
              confidence: 0.92,
              metric: "rps",
              current: Math.round(currentRps * 100) / 100,
              baseline_mean: Math.round(m * 100) / 100,
              baseline_std: Math.round(sd * 100) / 100,
              z_score: sd === 0 ? "inf" : Math.round(z * 100) / 100,
              timestamp: Date.now(),
            });
          }
        }

        // 5) service_idle
        if (state.idle_streak >= 3) {
          pushSignal(signals, state, "service_idle", {
            service: serviceKey,
            signal: "service_idle",
            severity: "warning",
            confidence: 0.9,
            metric: "rps",
            current: Math.round(currentRps * 100) / 100,
            idle_intervals: state.idle_streak,
            timestamp: Date.now(),
          });
        }

        // 6) error_rate_spike
        if (errRateHist.length >= 10) {
          const prev = errRateHist.slice(0, -1);
          const m = mean(prev);
          const sd = std(prev);
          const z = sd === 0 ? Infinity : Math.abs((currentErrorRate - m) / sd);

          const isSpikeWhenSdZero =
            sd === 0 && currentErrorRate >= 0.1 && currentErrorRate > m;
          const isSpikeByZScore =
            sd !== 0 && z >= 3 && currentErrorRate > m && currentErrorRate >= 0.05;

          if (isSpikeWhenSdZero || isSpikeByZScore) {
            pushSignal(signals, state, "error_rate_spike", {
              service: serviceKey,
              signal: "error_rate_spike",
              severity: currentErrorRate >= 0.2 ? "critical" : severityFromZ(z),
              confidence: 0.97,
              metric: "error_rate",
              current: Math.round(currentErrorRate * 1000) / 1000,
              baseline_mean: Math.round(m * 1000) / 1000,
              baseline_std: Math.round(sd * 1000) / 1000,
              z_score: sd === 0 ? "inf" : Math.round(z * 100) / 100,
              timestamp: Date.now(),
            });
          }
        }

        // 7) memory_pressure
        if (heapHist.length >= 10) {
          const prev = heapHist.slice(0, -1);
          const m = mean(prev);
          const sd = std(prev);
          const z = sd === 0 ? Infinity : Math.abs((currentHeapMb - m) / sd);

          const isPressureWhenSdZero =
            sd === 0 && currentHeapMb >= Math.max(200, m + 50);
          const isPressureByZScore =
            sd !== 0 && z >= 3 && currentHeapMb > m && currentHeapMb - m >= 20;

          if (isPressureWhenSdZero || isPressureByZScore) {
            pushSignal(signals, state, "memory_pressure", {
              service: serviceKey,
              signal: "memory_pressure",
              severity: currentHeapMb >= 300 ? "critical" : severityFromZ(z),
              confidence: 0.93,
              metric: "heap_used_mb",
              current: Math.round(currentHeapMb),
              baseline_mean: Math.round(m),
              baseline_std: Math.round(sd),
              z_score: sd === 0 ? "inf" : Math.round(z * 100) / 100,
              timestamp: Date.now(),
            });
          }
        }

        // 8) route_latency_spike
        const slowRoutes = topSlowRoutes(t, 1);
        const hottestSlow = slowRoutes[0];
        if (
          hottestSlow &&
          hottestSlow.avg_latency_ms >= 1000 &&
          hottestSlow.count >= 3
        ) {
          pushSignal(signals, state, `route_latency_spike:${hottestSlow.route}`, {
            service: serviceKey,
            signal: "route_latency_spike",
            severity: hottestSlow.avg_latency_ms >= 3000 ? "critical" : "warning",
            confidence: 0.96,
            metric: "route_avg_latency_ms",
            route: hottestSlow.route,
            current: hottestSlow.avg_latency_ms,
            count: hottestSlow.count,
            timestamp: Date.now(),
          });
        }

        // 9) error_hotspot
        const errorRoutes = topErrorRoutes(t, 1);
        const hottestError = errorRoutes[0];
        if (
          hottestError &&
          totalErrors > 0 &&
          hottestError.errors / Math.max(1, totalErrors) >= 0.5 &&
          hottestError.errors >= 3
        ) {
          pushSignal(signals, state, `error_hotspot:${hottestError.route}`, {
            service: serviceKey,
            signal: "error_hotspot",
            severity: "critical",
            confidence: 0.98,
            metric: "route_error_share",
            route: hottestError.route,
            route_errors: hottestError.errors,
            total_errors: totalErrors,
            error_share:
              Math.round((hottestError.errors / Math.max(1, totalErrors)) * 1000) /
              1000,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        console.error(`[signal-detector] fetch failed for ${s.name}:`, String(e?.message || e));
      }
    }

    saveBaseline(baseline);

    if (i < SAMPLES - 1) {
      await sleep(INTERVAL_MS);
    }
  }

  const out = { generated_at: Date.now(), samples: SAMPLES, signals };

  fs.writeFileSync(SIGNALS_FILE, JSON.stringify(out, null, 2));

  const history = loadSignalsHistory();
  history.generated_at = Date.now();
  history.signals.push(...signals);
  history.signals = history.signals.slice(-MAX_HISTORY_SIGNALS);
  history.total_signals = history.signals.length;

  saveSignalsHistory(history);

  console.log(
    "Saved: agent/signals.json, agent/signals_history.json and agent/baseline.json"
  );
  console.log(JSON.stringify(out, null, 2));
}

main();