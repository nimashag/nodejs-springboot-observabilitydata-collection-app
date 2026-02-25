const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(cors());
app.use(express.json());

// Paths to output files
const INCIDENTS_FILE = path.join(__dirname, 'outputs', 'incidents_latest.json');
const PREDICTIONS_FILE = path.join(__dirname, 'outputs', 'predictions_latest.csv');

// Helper function to read JSON file safely
function readJSONFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return null;
    }
}

// Helper function to check file stats
function getFileStats(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        const stats = fs.statSync(filePath);
        return {
            exists: true,
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime
        };
    } catch (error) {
        return null;
    }
}

// GET /api/incidents - Return latest incidents
app.get('/api/incidents', (req, res) => {
    const data = readJSONFile(INCIDENTS_FILE);

    if (!data) {
        return res.json({
            generated_at: new Date().toISOString(),
            input_csv: '',
            model_path: '',
            total_rows: 0,
            predicted_anomaly_count: 0,
            predicted_normal_count: 0,
            predicted_anomaly_request_count: 0,
            incident_story: {
                title: 'No incidents detected',
                summary: 'No anomalous requests found. The anomaly detection agent may not have run yet.',
                top_services: [],
                top_events: [],
                top_status_codes: []
            },
            incidents: [],
            last_updated: null,
            message: 'No incidents file found. Run the anomaly detection agent to generate predictions.'
        });
    }

    // Return the complete payload structure expected by frontend
    res.json({
        generated_at: data.generated_at || new Date().toISOString(),
        input_csv: data.input_csv || '',
        model_path: data.model_path || '',
        total_rows: data.total_rows || 0,
        predicted_anomaly_count: data.predicted_anomaly_count || 0,
        predicted_normal_count: data.predicted_normal_count || 0,
        predicted_anomaly_request_count: data.predicted_anomaly_request_count || 0,
        incident_story: data.incident_story || {
            summary: 'Analysis in progress',
            top_services: [],
            top_events: [],
            top_status_codes: []
        },
        incidents: data.incidents || [],
        last_updated: getFileStats(INCIDENTS_FILE)?.modified || null
    });
});

// GET /api/predictions - Return predictions summary
app.get('/api/predictions', (req, res) => {
    const fileStats = getFileStats(PREDICTIONS_FILE);

    if (!fileStats) {
        return res.json({
            available: false,
            message: 'No predictions file found',
            file_path: PREDICTIONS_FILE
        });
    }

    // Read and parse CSV (basic version)
    try {
        const csvContent = fs.readFileSync(PREDICTIONS_FILE, 'utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());

        if (lines.length <= 1) {
            return res.json({
                available: true,
                total_predictions: 0,
                anomalies_detected: 0,
                last_updated: fileStats.modified
            });
        }

        // Count anomalies (assuming 'anomaly' column exists)
        const header = lines[0].split(',');
        const anomalyIndex = header.findIndex(col => col.toLowerCase().includes('anomaly'));

        let anomalyCount = 0;
        if (anomalyIndex !== -1) {
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                if (values[anomalyIndex] === '1' || values[anomalyIndex] === 'true') {
                    anomalyCount++;
                }
            }
        }

        res.json({
            available: true,
            total_predictions: lines.length - 1,
            anomalies_detected: anomalyCount,
            last_updated: fileStats.modified,
            file_size: fileStats.size
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to parse predictions file',
            details: error.message
        });
    }
});

// GET /api/predictions/download - Download CSV file
app.get('/api/predictions/download', (req, res) => {
    if (!fs.existsSync(PREDICTIONS_FILE)) {
        return res.status(404).json({
            error: 'Predictions file not found'
        });
    }

    res.download(PREDICTIONS_FILE, 'predictions_latest.csv', (err) => {
        if (err) {
            console.error('Error downloading file:', err);
            res.status(500).json({
                error: 'Failed to download predictions',
                details: err.message
            });
        }
    });
});

// GET /api/status - Service status and file availability
app.get('/api/status', (req, res) => {
    const incidentsStats = getFileStats(INCIDENTS_FILE);
    const predictionsStats = getFileStats(PREDICTIONS_FILE);

    res.json({
        service: 'anomaly-detection-agent',
        status: 'running',
        port: PORT,
        outputs: {
            incidents: {
                available: incidentsStats !== null,
                path: INCIDENTS_FILE,
                ...incidentsStats
            },
            predictions: {
                available: predictionsStats !== null,
                path: PREDICTIONS_FILE,
                ...predictionsStats
            }
        },
        timestamp: new Date().toISOString()
    });
});

// GET /health - Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'anomaly-detection-agent-api',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Anomaly Detection Agent API',
        version: '1.0.0',
        endpoints: {
            incidents: '/api/incidents',
            predictions: '/api/predictions',
            predictionsDownload: '/api/predictions/download',
            status: '/api/status',
            health: '/health'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🔍 Anomaly Detection API running on http://localhost:${PORT}`);
    console.log(`   Incidents endpoint: http://localhost:${PORT}/api/incidents`);
    console.log(`   Predictions endpoint: http://localhost:${PORT}/api/predictions`);
    console.log(`   Status endpoint: http://localhost:${PORT}/api/status`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down API server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down API server...');
    process.exit(0);
});
