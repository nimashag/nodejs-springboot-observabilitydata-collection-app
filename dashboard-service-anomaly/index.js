import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 5001;

// Path to the incidents JSON created by anomaly-detection-agent
const INCIDENTS_JSON =
  process.env.INCIDENTS_JSON ||
  path.resolve("../anomaly-detection-agent/outputs/incidents_latest.json");

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.static("public"));

app.get("/api/incidents", (req, res) => {
  try {
    if (!fs.existsSync(INCIDENTS_JSON)) {
      return res.status(404).json({
        error: "incidents_latest.json not found",
        expected_path: INCIDENTS_JSON
      });
    }
    const raw = fs.readFileSync(INCIDENTS_JSON, "utf-8");
    const data = JSON.parse(raw);
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`📊 Dashboard running on http://localhost:${PORT}`);
  console.log(`📁 Reading incidents from: ${INCIDENTS_JSON}`);
});
