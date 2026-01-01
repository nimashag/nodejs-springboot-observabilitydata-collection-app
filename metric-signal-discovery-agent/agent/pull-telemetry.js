import fs from "fs";

const config = JSON.parse(
  fs.readFileSync(new URL("./services.json", import.meta.url), "utf-8")
);

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
      results.push({ name: s.name, error: String(e.message || e) });
    }
  }

  console.log(JSON.stringify({ timestamp: Date.now(), results }, null, 2));
}

main();
