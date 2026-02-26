import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3007;

// Determine outputs directory using relative path from __dirname
// This pattern matches how log-aggregation-service and alert-agent-data-collect-service work
// Works in both Docker and local environments:
// - Docker: __dirname is /app, so outputs becomes /app/outputs (matches volume mount)
// - Local: __dirname is anomaly-detection-agent, so outputs becomes anomaly-detection-agent/outputs
const OUTPUTS_DIR = path.join(__dirname, "outputs");
const INCIDENTS_JSON = path.join(OUTPUTS_DIR, "incidents_latest.json");
const PREDICTIONS_CSV = path.join(OUTPUTS_DIR, "predictions_latest.csv");

// Log paths on startup for debugging
console.log(`[API] 📁 Initializing API server...`);
console.log(`[API] 📁 Outputs directory: ${OUTPUTS_DIR}`);
console.log(`[API] 📁 Incidents JSON: ${INCIDENTS_JSON}`);
console.log(`[API] 📁 Predictions CSV: ${PREDICTIONS_CSV}`);
console.log(`[API] 📁 DOCKER_ENV: ${process.env.DOCKER_ENV || 'not set'}`);
console.log(`[API] 📁 Incidents file exists: ${fs.existsSync(INCIDENTS_JSON)}`);
console.log(`[API] 📁 Predictions file exists: ${fs.existsSync(PREDICTIONS_CSV)}`);

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
      console.warn(`⚠️  File not found: ${filePath}`);
      return null;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    console.log(`✅ Successfully read ${filePath} (${raw.length} bytes)`);
    return data;
  } catch (e) {
    console.error(`❌ Error reading ${filePath}:`, e);
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
    console.error(`[API] ❌ Error reading CSV ${filePath}:`, e);
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
  console.log(`[API] 📥 GET /api/anomaly/incidents`);

  const data = readJsonFile(INCIDENTS_JSON);
  if (data === null) {
    console.error(`[API] ❌ Failed to read/parse incidents file from: ${INCIDENTS_JSON}`);
    // List what's actually in the outputs directory for debugging
    try {
      if (fs.existsSync(OUTPUTS_DIR)) {
        const files = fs.readdirSync(OUTPUTS_DIR);
        console.log(`[API] 📂 Files in ${OUTPUTS_DIR}:`, files);
      } else {
        console.error(`[API] ❌ Outputs directory does not exist: ${OUTPUTS_DIR}`);
      }
    } catch (e) {
      console.error(`[API] ❌ Error listing outputs directory:`, e);
    }
    return res.status(404).json({
      error: "incidents_latest.json not found",
      expected_path: INCIDENTS_JSON,
      outputs_dir: OUTPUTS_DIR,
      timestamp: new Date().toISOString(),
    });
  }

  // Log the actual data being returned for debugging
  console.log(`[API] ✅ Returning incidents data:`);
  console.log(`[API]    - File path: ${INCIDENTS_JSON}`);
  console.log(`[API]    - total_rows: ${data.total_rows}`);
  console.log(`[API]    - predicted_anomaly_count: ${data.predicted_anomaly_count}`);
  console.log(`[API]    - predicted_normal_count: ${data.predicted_normal_count}`);
  console.log(`[API]    - incidents count: ${data.incidents?.length || 0}`);
  console.log(`[API]    - generated_at: ${data.generated_at}`);
  return res.json(data);
});

// Get service status
app.get("/api/anomaly/status", (req, res) => {
  const incidentsData = readJsonFile(INCIDENTS_JSON);
  const predictionsData = readCsvFile(PREDICTIONS_CSV);

  // Check file system info
  const incidentsExists = fs.existsSync(INCIDENTS_JSON);
  const predictionsExists = fs.existsSync(PREDICTIONS_CSV);

  let incidentsFileInfo = null;
  let predictionsFileInfo = null;

  if (incidentsExists) {
    try {
      const stats = fs.statSync(INCIDENTS_JSON);
      incidentsFileInfo = {
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };
    } catch (e) {
      console.error(`Error getting incidents file stats:`, e);
    }
  }

  if (predictionsExists) {
    try {
      const stats = fs.statSync(PREDICTIONS_CSV);
      predictionsFileInfo = {
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };
    } catch (e) {
      console.error(`Error getting predictions file stats:`, e);
    }
  }

  const status = {
    service: "anomaly-detection-agent",
    status: "running",
    port: PORT,
    timestamp: new Date().toISOString(),
    paths: {
      outputs_dir: OUTPUTS_DIR,
      incidents_json: INCIDENTS_JSON,
      predictions_csv: PREDICTIONS_CSV,
    },
    files: {
      incidents_exists: incidentsExists,
      predictions_exists: predictionsExists,
      incidents_info: incidentsFileInfo,
      predictions_info: predictionsFileInfo,
    },
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
  console.log(`[API] 🚀 Anomaly Detection Agent API running on http://localhost:${PORT}`);
  console.log(`[API] 📁 Outputs directory: ${OUTPUTS_DIR}`);
  console.log(`[API] 📁 Incidents path: ${INCIDENTS_JSON}`);
  console.log(`[API] 📁 Predictions path: ${PREDICTIONS_CSV}`);

  // Check if files exist and log their info
  if (fs.existsSync(INCIDENTS_JSON)) {
    try {
      const stats = fs.statSync(INCIDENTS_JSON);
      console.log(`[API] ✅ Incidents file found: ${stats.size} bytes, modified: ${stats.mtime.toISOString()}`);
      const fileData = JSON.parse(fs.readFileSync(INCIDENTS_JSON, 'utf-8'));
      console.log(`[API]    Data: total_rows=${fileData.total_rows}, anomalies=${fileData.predicted_anomaly_count}, incidents=${fileData.incidents?.length || 0}`);
    } catch (e) {
      console.warn(`[API] ⚠️  Could not read incidents file: ${e.message}`);
    }
  } else {
    console.warn(`[API] ⚠️  Incidents file not found`);
  }

  console.log(`[API] 📁 Predictions file exists: ${fs.existsSync(PREDICTIONS_CSV)}`);

  // List files in outputs directory
  if (fs.existsSync(OUTPUTS_DIR)) {
    try {
      const files = fs.readdirSync(OUTPUTS_DIR);
      console.log(`[API] 📂 Files in outputs: ${files.join(', ')}`);
    } catch (e) {
      console.error(`[API] ❌ Error listing outputs:`, e);
    }
  }

  console.log(`[API] \nAvailable endpoints:`);
  console.log(`[API]   GET /health`);
  console.log(`[API]   GET /api/anomaly/incidents`);
  console.log(`[API]   GET /api/anomaly/status`);
  console.log(`[API]   GET /api/anomaly/predictions`);
  console.log(`[API]   GET /api/anomaly/predictions/download`);
  console.log(`[API] ✅ API server ready`);
});

