import fs from "fs";
import path from "path";

// Input: we will call pull-telemetry.js and read its printed JSON by saving it to a file.
// Output: ml/data/routes_unlabeled.csv

const AGENT_DIR = new URL("../../", import.meta.url); // agent/
const OUT_DIR = new URL("../data/", import.meta.url);
const OUT_FILE = new URL("../data/routes_unlabeled.csv", import.meta.url);

function ensureDir(url) {
  const p = path.normalize(url.pathname.replace(/^\/([A-Za-z]:)/, "$1")); // windows-safe
  fs.mkdirSync(p, { recursive: true });
}

function toWindowsPath(url) {
  return path.normalize(url.pathname.replace(/^\/([A-Za-z]:)/, "$1"));
}

function parseRoute(routeStr) {
  // Example: "GET /api/orders/telemetry"
  const s = String(routeStr || "").trim();
  const m = s.match(/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(.+)$/i);
  if (!m) return null;
  return { method: m[1].toUpperCase(), path: m[2].trim() };
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  ensureDir(OUT_DIR);

  // Run pull-telemetry.js and capture JSON by reusing the latest saved file if exists.
  // If you don’t have a saved file yet, we will create one now.
  const snapshotFile = new URL("../data/telemetry_snapshot.json", import.meta.url);
  const snapshotPath = toWindowsPath(snapshotFile);

  // If snapshot doesn't exist, tell user to create it by running pull-telemetry and redirecting output.
  if (!fs.existsSync(snapshotPath)) {
    console.log("Missing: ml/data/telemetry_snapshot.json");
    console.log("\nRun this first (from agent folder):");
    console.log("  node pull-telemetry.js > ml/data/telemetry_snapshot.json\n");
    process.exit(1);
  }

  const raw = fs.readFileSync(snapshotPath, "utf-8").trim();

  // Sometimes redirected output can contain warnings before JSON. Try to extract the JSON block.
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("telemetry_snapshot.json does not contain valid JSON object.");
  }

  const jsonText = raw.slice(firstBrace, lastBrace + 1);
  const data = JSON.parse(jsonText);

  const rows = [];
  const seen = new Set();

  const results = Array.isArray(data.results) ? data.results : [];
  for (const item of results) {
    const service = item?.name || item?.data?.service || "unknown-service";
    const routes = item?.data?.routes;

    // routes is usually an array in Node services, and in users it’s an array too now
    if (!Array.isArray(routes)) continue;

    for (const r of routes) {
      const parsed = parseRoute(r?.route);
      if (!parsed) continue;

      // Skip telemetry route itself to avoid bias
      if (parsed.path.includes("/telemetry")) continue;

      const key = `${service}||${parsed.method}||${parsed.path}`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push([service, parsed.method, parsed.path]);
    }
  }

  // write CSV
  const outLines = [];
  outLines.push("service,method,path");
  for (const [service, method, p] of rows) {
    outLines.push([service, method, p].map(csvEscape).join(","));
  }

  fs.writeFileSync(toWindowsPath(OUT_FILE), outLines.join("\n"), "utf-8");

  console.log(`Saved: ml/data/routes_unlabeled.csv (${rows.length} rows)`);
  console.log("Next: you will add a label column and create routes_labeled.csv for training.");
}

main().catch((e) => {
  console.error("ERROR:", e?.message || e);
  process.exit(1);
});
