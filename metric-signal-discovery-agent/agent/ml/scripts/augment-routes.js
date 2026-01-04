import fs from "fs";
import path from "path";

const IN_FILE = new URL("../data/routes_unlabeled.csv", import.meta.url);
const OUT_FILE = new URL("../data/routes_augmented.csv", import.meta.url);

function readCsv(fileUrl) {
  const p = path.normalize(fileUrl.pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  const lines = fs.readFileSync(p, "utf-8").trim().split("\n");
  const header = lines[0].split(",");
  const rows = lines.slice(1).map(l => {
    const cols = l.split(",");
    return Object.fromEntries(header.map((h, i) => [h, cols[i]]));
  });
  return rows;
}

function writeCsv(rows, fileUrl) {
  const p = path.normalize(fileUrl.pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  const header = Object.keys(rows[0]).join(",");
  const lines = [header];
  for (const r of rows) {
    lines.push(Object.values(r).join(","));
  }
  fs.writeFileSync(p, lines.join("\n"), "utf-8");
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const IDS = [
  "000000000000000000000001",
  "111111111111111111111111",
  "abc123",
  "xyz789"
];

function expandPath(pathStr) {
  if (pathStr.includes("000000000000000000000000")) {
    return IDS.map(id => pathStr.replace("000000000000000000000000", id));
  }
  return [pathStr];
}

function main() {
  const base = readCsv(IN_FILE);
  const out = [];
  const seen = new Set();

  for (const r of base) {
    for (const p of expandPath(r.path)) {
      for (const m of METHODS) {
        const key = `${r.service}|${m}|${p}`;
        if (seen.has(key)) continue;
        seen.add(key);

        out.push({
          service: r.service,
          method: m,
          path: p
        });
      }
    }
  }

  writeCsv(out, OUT_FILE);
  console.log(`Saved: ml/data/routes_augmented.csv (${out.length} rows)`);
}

main();
