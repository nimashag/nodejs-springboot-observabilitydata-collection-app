import fs from "fs";

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(new URL(relPath, import.meta.url), "utf-8"));
}

function exists(relPath) {
  try {
    fs.accessSync(new URL(relPath, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

function main() {
  const discovery = exists("./discovery_report.json") ? readJson("./discovery_report.json") : null;
  const signals = exists("./signals.json") ? readJson("./signals.json") : null;

  const out = {
    generated_at: Date.now(),
    discovery_report: discovery,
    signals_report: signals,
  };

  fs.writeFileSync(
    new URL("./final_agent_report.json", import.meta.url),
    JSON.stringify(out, null, 2)
  );

  console.log("Saved: agent/final_agent_report.json");
  console.log(JSON.stringify(out, null, 2));
}

main();
