import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { AlertDataCollector } from './collector';
import { HistoricalAnalyzer } from './analyzer/historical-analyzer';
import { ThresholdAdjuster } from './tuner/threshold-adjuster';
import { ReportGenerator } from './reporter/report-generator';
import { AlertRouter } from './router/alert-router';
import { AlertSuppressor } from './suppressor/alert-suppressor';

// Configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3008;
const API_KEY = process.env.API_KEY || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

// Type definitions
interface AnalysisData {
  summary: {
    total_alerts: number;
    services_count: number;
    false_positive_rate: string;
    recommendations_count: number;
    alerts_saved: number;
    noise_reduction: string;
    admin_notifications: number;
    admin_notification_percentage: string;
    suppression_rate: string;
  };
  alerts: any[];
  alert_summary: any;
  analysis_report: any;
  threshold_recommendations: any[];
  threshold_config: any;
  impact: any;
  routing_decisions: any[];
  routing_summary: any;
  routing_efficiency: any;
  routing_recommendations: any[];
  suppression_summary: any;
  suppressed_alerts: any[];
  allowed_alerts: any[];
}

// Global data storage
let analysisData: AnalysisData | null = null;
let processingError: Error | null = null;

function processAlertData() {
  const collector = new AlertDataCollector();
  const allAlerts = collector.collectAllAlerts();
  
  if (allAlerts.length === 0) {
    console.log('No alert data found');
    return null;
  }

  const summary = collector.generateSummary(allAlerts);
  console.log(`Collected: ${allAlerts.length} alerts from ${Object.keys(summary.alerts_by_service).length} services`);

  // Create output directory
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write collected data
  collector.writeCombinedAlertHistory(allAlerts, path.join(outputDir, 'combined-alert-history.json'));
  collector.writeSummary(summary, path.join(outputDir, 'alert-summary.json'));

  // Step 2: Historical Analysis
  const analyzer = new HistoricalAnalyzer(allAlerts);
  const analysisReport = analyzer.analyze();

  fs.writeFileSync(
    path.join(outputDir, 'analysis-report.json'),
    JSON.stringify(analysisReport, null, 2)
  );

  // Step 3: Threshold Adjustment
  const adjuster = new ThresholdAdjuster(allAlerts, analysisReport.service_baselines);
  const thresholdRecommendations = adjuster.calculateAdaptiveThresholds();
  const thresholdConfig = adjuster.exportThresholdConfig();
  const impact = adjuster.calculateExpectedImpact();

  fs.writeFileSync(
    path.join(outputDir, 'threshold-recommendations.json'),
    JSON.stringify(thresholdRecommendations, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, 'adaptive-threshold-config.json'),
    JSON.stringify(thresholdConfig, null, 2)
  );

  // Step 4: Alert Routing
  const router = new AlertRouter();
  const { decisions: routingDecisions, summary: routingSummary } = router.routeAlerts(allAlerts);
  const routingEfficiency = router.calculateEfficiency(routingSummary);
  const routingRecommendations = router.generateRoutingRecommendations(routingSummary);

  fs.writeFileSync(
    path.join(outputDir, 'alert-routing-decisions.json'),
    JSON.stringify(routingDecisions, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, 'routing-summary.json'),
    JSON.stringify({ summary: routingSummary, efficiency: routingEfficiency, recommendations: routingRecommendations }, null, 2)
  );

  // Step 5: Alert Suppression
  const suppressor = new AlertSuppressor();
  const { suppressed, allowed, summary: suppressionSummary } = suppressor.suppressAlerts(allAlerts);

  fs.writeFileSync(
    path.join(outputDir, 'suppression-analysis.json'),
    JSON.stringify({ suppressed, allowed, summary: suppressionSummary }, null, 2)
  );

  // Step 6: Generate Report
  ReportGenerator.generateMarkdownReport(
    analysisReport,
    thresholdRecommendations,
    path.join(outputDir, 'AATA-REPORT.md')
  );

  // Return all data for API
  return {
    summary: {
      total_alerts: allAlerts.length,
      services_count: Object.keys(summary.alerts_by_service).length,
      false_positive_rate: (analysisReport.false_positive_analysis.estimated_fp_rate * 100).toFixed(1),
      recommendations_count: thresholdRecommendations.length,
      alerts_saved: impact.alerts_saved,
      noise_reduction: routingEfficiency.noise_reduction_percentage.toFixed(1),
      admin_notifications: routingSummary.admin_notifications,
      admin_notification_percentage: (routingSummary.admin_notifications/routingSummary.total_alerts*100).toFixed(1),
      suppression_rate: suppressionSummary.suppression_rate.toFixed(1)
    },
    alerts: allAlerts,
    alert_summary: summary,
    analysis_report: analysisReport,
    threshold_recommendations: thresholdRecommendations,
    threshold_config: thresholdConfig,
    impact: impact,
    routing_decisions: routingDecisions,
    routing_summary: routingSummary,
    routing_efficiency: routingEfficiency,
    routing_recommendations: routingRecommendations,
    suppression_summary: suppressionSummary,
    suppressed_alerts: suppressed,
    allowed_alerts: allowed
  };
}

// Authentication middleware
function authenticateRequest(req: http.IncomingMessage): boolean {
  if (!API_KEY) {
    return true; // No authentication required if API_KEY is not set
  }
  
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return false;
  }
  
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  return token === API_KEY;
}

// CORS middleware
function setCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): void {
  const origin = req.headers.origin as string | undefined;
  
  if (ALLOWED_ORIGINS.length === 0) {
    // If no origins specified, allow all (development mode)
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Pagination helper
function paginateArray<T>(array: T[], page: number = 1, limit: number = 100): { data: T[], pagination: any } {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = array.slice(startIndex, endIndex);
  
  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: array.length,
      total_pages: Math.ceil(array.length / limit),
      has_next: endIndex < array.length,
      has_prev: page > 1
    }
  };
}

// Parse query parameters
function parseQueryParams(url: string): { [key: string]: string } {
  const params: { [key: string]: string } = {};
  const queryString = url.split('?')[1];
  
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
  }
  
  return params;
}

// HTTP Server
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(req, res);

  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Only allow GET requests (except OPTIONS)
    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'Method not allowed. Only GET and OPTIONS are supported.' }));
      return;
    }

    // Parse URL and query params
    const urlPath = req.url?.split('?')[0] || '';
    const queryParams = parseQueryParams(req.url || '');

    // Health check endpoint (no auth required)
    if (urlPath === '/api/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ 
        status: 'ok', 
        port: PORT,
        data_ready: analysisData !== null,
        error: processingError ? processingError.message : null
      }));
      return;
    }

    // Authenticate for all other endpoints
    if (!authenticateRequest(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized. Valid API key required.' }));
      return;
    }

    // Check if data is ready
    if (!analysisData) {
      if (processingError) {
        res.writeHead(500);
        res.end(JSON.stringify({ 
          error: 'Analysis failed during startup',
          details: processingError.message
        }));
      } else {
        res.writeHead(503);
        res.end(JSON.stringify({ error: 'Analysis not yet complete. Please wait.' }));
      }
      return;
    }

    // Route handlers
    if (urlPath === '/' || urlPath === '/api/analysis') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData, null, 2));
    } else if (urlPath === '/api/summary') {
      // Return the alert_summary (for dashboard) instead of analysis summary
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.alert_summary, null, 2));
    } else if (urlPath === '/api/analysis-summary') {
      // Return the analysis summary (for advanced analytics)
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.summary, null, 2));
    } else if (urlPath === '/api/alerts') {
      const page = parseInt(queryParams.page || '1', 10);
      const limit = Math.min(parseInt(queryParams.limit || '100', 10), 1000);
      
      const result = paginateArray(analysisData.alerts, page, limit);
      res.writeHead(200);
      res.end(JSON.stringify(result, null, 2));
    } else if (urlPath === '/api/recommendations') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.threshold_recommendations, null, 2));
    } else if (urlPath === '/api/routing') {
      res.writeHead(200);
      res.end(JSON.stringify({
        decisions: analysisData.routing_decisions,
        summary: analysisData.routing_summary,
        efficiency: analysisData.routing_efficiency,
        recommendations: analysisData.routing_recommendations
      }, null, 2));
    } else if (urlPath === '/api/adaptive-config') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.threshold_config, null, 2));
    } else if (urlPath === '/api/ml-report') {
      // Read ML model report from file
      const mlReportPath = path.join(__dirname, '..', 'ml-module', 'models', 'training_report_enhanced.json');
      if (fs.existsSync(mlReportPath)) {
        const mlReport = JSON.parse(fs.readFileSync(mlReportPath, 'utf-8'));
        res.writeHead(200);
        res.end(JSON.stringify(mlReport, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'ML report not found. Please train models first.' }));
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ 
        error: 'Not found',
        available_endpoints: [
          '/api/health',
          '/api/analysis',
          '/api/summary',
          '/api/alerts?page=1&limit=100',
          '/api/recommendations',
          '/api/routing',
          '/api/adaptive-config',
          '/api/ml-report'
        ]
      }));
    }
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.writeHead(500);
    }
    try {
      res.end(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }));
    } catch {
      // Ignore errors during error response
    }
  }
});

// Graceful shutdown handler
function gracefulShutdown(signal: string): void {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  
  server.close((err?: Error) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    } else {
      console.log('All connections closed. Exiting.');
      process.exit(0);
    }
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Process data before starting server
console.log('Processing alert data...');
try {
  analysisData = processAlertData();
  if (analysisData) {
    console.log('Data processing complete');
  } else {
    console.warn('No data available - server will return 503 for data endpoints');
  }
} catch (error) {
  processingError = error instanceof Error ? error : new Error(String(error));
  console.error('Error processing data:', processingError.message);
  console.error('Server will start but data endpoints will return error status');
}

// Start server
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/analysis`);
  if (API_KEY) {
    console.log('Authentication: Enabled (API key required)');
  } else {
    console.log('Authentication: Disabled (no API key set)');
  }
  if (ALLOWED_ORIGINS.length > 0) {
    console.log(`CORS: Restricted to ${ALLOWED_ORIGINS.length} origin(s)`);
  } else {
    console.log('CORS: Open to all origins');
  }
  console.log('Ready');
});

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
