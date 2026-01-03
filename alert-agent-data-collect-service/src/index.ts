import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { AlertDataCollector } from './collector';
import { HistoricalAnalyzer } from './analyzer/historical-analyzer';
import { ThresholdAdjuster } from './tuner/threshold-adjuster';
import { ReportGenerator } from './reporter/report-generator';
import { AlertRouter } from './router/alert-router';
import { AlertSuppressor } from './suppressor/alert-suppressor';

const PORT = 3008;

// Global data storage
let analysisData: any = null;

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

// HTTP Server
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/' || req.url === '/api/analysis') {
    if (!analysisData) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'Analysis not yet complete. Please wait.' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify(analysisData, null, 2));
  } else if (req.url === '/api/summary') {
    if (!analysisData) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'Analysis not yet complete. Please wait.' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify(analysisData.summary, null, 2));
  } else if (req.url === '/api/alerts') {
    if (!analysisData) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'Analysis not yet complete. Please wait.' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify(analysisData.alerts, null, 2));
  } else if (req.url === '/api/recommendations') {
    if (!analysisData) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'Analysis not yet complete. Please wait.' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify(analysisData.threshold_recommendations, null, 2));
  } else if (req.url === '/api/routing') {
    if (!analysisData) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'Analysis not yet complete. Please wait.' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({
      decisions: analysisData.routing_decisions,
      summary: analysisData.routing_summary,
      efficiency: analysisData.routing_efficiency,
      recommendations: analysisData.routing_recommendations
    }, null, 2));
  } else if (req.url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', port: PORT }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ 
      error: 'Not found',
      available_endpoints: [
        '/api/health',
        '/api/analysis',
        '/api/summary',
        '/api/alerts',
        '/api/recommendations',
        '/api/routing'
      ]
    }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/analysis`);
  
  // Process data after server starts
  try {
    analysisData = processAlertData();
    if (analysisData) {
      console.log('Ready');
    }
  } catch (error) {
    console.error('Error:', error);
  }
});
