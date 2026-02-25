import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3007;

// Paths to output files
const OUTPUTS_DIR = path.join(__dirname, "outputs");
const INCIDENTS_JSON = path.join(OUTPUTS_DIR, "incidents_latest.json");
const PREDICTIONS_CSV = path.join(OUTPUTS_DIR, "predictions_latest.csv");

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

// Helper function to read JSON file safely
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
    return null;
  }
}

// Helper function to read CSV and convert to JSON
function readCsvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const csvContent = fs.readFileSync(filePath, "utf-8");
    const lines = csvContent.trim().split("\n");
    if (lines.length === 0) {
      return { predictions: [] };
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const predictions = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || "";
      });
      return obj;
    });

    return {
      predictions,
      total: predictions.length,
      generated_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error(`Error reading CSV ${filePath}:`, e);
    return null;
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "anomaly-detection-agent",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Get incidents
app.get("/api/anomaly/incidents", (req, res) => {
  const data = readJsonFile(INCIDENTS_JSON);
  if (data === null) {
    return res.status(404).json({
      error: "incidents_latest.json not found",
      expected_path: INCIDENTS_JSON,
    });
  }
  return res.json(data);
});

// Get service status
app.get("/api/anomaly/status", (req, res) => {
  const incidentsData = readJsonFile(INCIDENTS_JSON);
  const predictionsData = readCsvFile(PREDICTIONS_CSV);

  const status = {
    service: "anomaly-detection-agent",
    status: "running",
    port: PORT,
    timestamp: new Date().toISOString(),
    data_available: {
      incidents: incidentsData !== null,
      predictions: predictionsData !== null,
    },
    last_update: {
      incidents: incidentsData?.generated_at || null,
      predictions: predictionsData?.generated_at || null,
    },
    stats: incidentsData
      ? {
          total_rows: incidentsData.total_rows || 0,
          predicted_anomaly_count: incidentsData.predicted_anomaly_count || 0,
          predicted_normal_count: incidentsData.predicted_normal_count || 0,
          incidents_count: incidentsData.incidents?.length || 0,
        }
      : null,
  };

  return res.json(status);
});

// Get predictions (as JSON)
app.get("/api/anomaly/predictions", (req, res) => {
  const data = readCsvFile(PREDICTIONS_CSV);
  if (data === null) {
    return res.status(404).json({
      error: "predictions_latest.csv not found",
      expected_path: PREDICTIONS_CSV,
    });
  }
  return res.json(data);
});

// Download predictions CSV
app.get("/api/anomaly/predictions/download", (req, res) => {
  if (!fs.existsSync(PREDICTIONS_CSV)) {
    return res.status(404).json({
      error: "predictions_latest.csv not found",
      expected_path: PREDICTIONS_CSV,
    });
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="predictions_latest.csv"`
  );
  const fileStream = fs.createReadStream(PREDICTIONS_CSV);
  fileStream.pipe(res);
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "anomaly-detection-agent-api",
    version: "1.0.0",
    port: PORT,
    endpoints: {
      health: "/health",
      incidents: "/api/anomaly/incidents",
      status: "/api/anomaly/status",
      predictions: "/api/anomaly/predictions",
      downloadPredictions: "/api/anomaly/predictions/download",
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Anomaly Detection Agent API running on http://localhost:${PORT}`);
  console.log(`📁 Reading incidents from: ${INCIDENTS_JSON}`);
  console.log(`📁 Reading predictions from: ${PREDICTIONS_CSV}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET /health`);
  console.log(`  GET /api/anomaly/incidents`);
  console.log(`  GET /api/anomaly/status`);
  console.log(`  GET /api/anomaly/predictions`);
  console.log(`  GET /api/anomaly/predictions/download`);
});

