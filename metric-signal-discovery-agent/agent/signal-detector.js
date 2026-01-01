import fs from "fs";

const config = JSON.parse(
  fs.readFileSync(new URL("./services.json", import.meta.url), "utf-8")
);

const BASELINE_FILE = new URL("./baseline.json", import.meta.url);

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
  if (!res.ok) {
    throw new Error(`${service.name} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// rolling window stats
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
  // cap at 0.99, floor at 0.5
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

async function main() {
  const baseline = loadBaseline();
  const signals = [];

  // NEW: multi-sample run
  const SAMPLES = parseNumberArg("--samples", 1);
  const INTERVAL_MS = parseNumberArg("--intervalMs", 2000);

  for (let i = 0; i < SAMPLES; i++) {
    for (const s of config.services) {
      try {
        const t = await fetchTelemetry(s);
        const current = Number(t.http?.avg_latency_ms ?? 0);

        const key = t.service || s.name;
        baseline.services[key] ??= { avg_latency_ms: [] };

        const history = baseline.services[key].avg_latency_ms;

        // update history (window size 30)
        history.push(current);
        while (history.length > 30) history.shift();

        // only detect when we have enough samples
        if (history.length >= 10) {
          const prev = history.slice(0, -1); // baseline without current
          const m = mean(prev);
          const sd = std(prev);
          const z = sd === 0 ? 0 : Math.abs((current - m) / sd);

          // Only spike detection for now (simple + defendable)
          if (z >= 3 && current > m) {
            signals.push({
              service: key,
              signal: "latency_spike",
              severity: severityFromZ(z),
              confidence: confidenceFromZ(z),
              metric: "avg_latency_ms",
              current,
              baseline_mean: Math.round(m),
              baseline_std: Math.round(sd),
              z_score: Math.round(z * 100) / 100,
              timestamp: Date.now(),
            });
          }
        }
      } catch (e) {
        signals.push({ service: s.name, error: String(e?.message || e) });
      }
    }

    // persist baseline as we go
    saveBaseline(baseline);

    // wait between samples (unless last)
    if (i < SAMPLES - 1) {
      await sleep(INTERVAL_MS);
    }
  }

  const out = { generated_at: Date.now(), samples: SAMPLES, signals };
  fs.writeFileSync(new URL("./signals.json", import.meta.url), JSON.stringify(out, null, 2));
  console.log("Saved: agent/signals.json and agent/baseline.json");
  console.log(JSON.stringify(out, null, 2));
}

main();
