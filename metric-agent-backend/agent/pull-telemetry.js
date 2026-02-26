import fs from "fs";
import path from "path";

const config = JSON.parse(
  fs.readFileSync(new URL("./services.json", import.meta.url), "utf-8")
);

const SNAPSHOT_URL = new URL("./ml/data/telemetry_snapshot.json", import.meta.url);

function toWindowsPath(url) {
  return path.normalize(url.pathname.replace(/^\/([A-Za-z]:)/, "$1"));
}

function ensureDirForFile(url) {
  const filePath = toWindowsPath(url);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

async function fetchTelemetry(service) {
  const res = await fetch(service.url);
  if (!res.ok) {
    throw new Error(`${service.name} failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return { name: service.name, data };
}

async function main() {
  const results = [];

  for (const s of config.services) {
    try {
      const out = await fetchTelemetry(s);
      results.push(out);
    } catch (e) {
      results.push({ name: s.name, error: String(e?.message || e) });
    }
  }

  const payload = { timestamp: Date.now(), results };

  //  Save clean JSON snapshot for ML (no console warnings inside the file)
  ensureDirForFile(SNAPSHOT_URL);
  fs.writeFileSync(toWindowsPath(SNAPSHOT_URL), JSON.stringify(payload, null, 2), "utf-8");

  // Still print to console (existing behavior)
  console.log(JSON.stringify(payload, null, 2));
}

main();
