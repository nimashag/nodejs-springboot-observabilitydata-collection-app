import * as dotenv from 'dotenv';
dotenv.config();

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { AlertDataCollector } from './collector';
import { HistoricalAnalyzer } from './analyzer/historical-analyzer';
import { ThresholdAdjuster } from './tuner/threshold-adjuster';
import { ReportGenerator } from './reporter/report-generator';
import { AlertRouter } from './router/alert-router';
import { AlertSuppressor } from './suppressor/alert-suppressor';
import { AlertEvent, NormalizedAlertEvent } from './types';

import { AdaptiveLearner } from './learner/adaptive-learner';
import { CorrelationEngine } from './correlator/correlation-engine';
import { PredictiveAlerter } from './predictor/predictive-alerter';
import { SmartAlertGrouper } from './router/smart-alert-grouper';
import { FeedbackCollector } from './feedback/feedback-collector';
import { ContextualThresholdAdjuster } from './tuner/contextual-threshold-adjuster';
import { RemediationEngine } from './remediation/remediation-engine';
import { ThresholdExperimenter } from './experimenter/threshold-experimenter';
import { getMLClient, MLClient } from './ml/ml-client';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3008;
const API_KEY = process.env.API_KEY || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);
const ALERT_COLLECTION_INTERVAL = process.env.ALERT_COLLECTION_INTERVAL 
  ? parseInt(process.env.ALERT_COLLECTION_INTERVAL, 10) 
  : 60000;

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
  adaptive_learning?: any;
  correlations?: any;
  incidents?: any;
  predictions?: any;
  deduplication?: any;
  contextual_thresholds?: any;
  remediation_suggestions?: any;
  experiments?: any;
}

let analysisData: AnalysisData | null = null;
let processingError: Error | null = null;

let realTimeAlerts: NormalizedAlertEvent[] = [];
let alertProcessingQueue: NormalizedAlertEvent[] = [];
let isProcessingQueue = false;
let collector: AlertDataCollector | null = null;
let mlClient: MLClient | null = null;

function processAlertData() {
  const collector = new AlertDataCollector();
  const allAlerts = collector.collectAllAlerts();
  
  if (allAlerts.length === 0) {
    console.log('No alert data found');
    return null;
  }

  const summary = collector.generateSummary(allAlerts);
  console.log(`Collected: ${allAlerts.length} alerts from ${Object.keys(summary.alerts_by_service).length} services`);

  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  collector.writeCombinedAlertHistory(allAlerts, path.join(outputDir, 'combined-alert-history.json'));
  collector.writeSummary(summary, path.join(outputDir, 'alert-summary.json'));

  const analyzer = new HistoricalAnalyzer(allAlerts);
  const analysisReport = analyzer.analyze();

  const adjuster = new ThresholdAdjuster(allAlerts, analysisReport.service_baselines);
  const thresholdRecommendations = adjuster.calculateAdaptiveThresholds();
  const thresholdConfig = adjuster.exportThresholdConfig();
  const impact = adjuster.calculateExpectedImpact();

  const router = new AlertRouter();
  const { decisions: routingDecisions, summary: routingSummary } = router.routeAlerts(allAlerts);
  const routingEfficiency = router.calculateEfficiency(routingSummary);
  const routingRecommendations = router.generateRoutingRecommendations(routingSummary);

  const suppressor = new AlertSuppressor();
  const { suppressed, allowed, summary: suppressionSummary } = suppressor.suppressAlerts(allAlerts);

  const simpleThresholds: Record<string, Record<string, number>> = {};
  Object.keys(thresholdConfig.thresholds).forEach(serviceName => {
    const serviceThresholds = thresholdConfig.thresholds[serviceName];
    simpleThresholds[serviceName] = {};
    Object.keys(serviceThresholds).forEach(key => {
      const value = serviceThresholds[key];
      if (typeof value === 'number') {
        simpleThresholds[serviceName][key] = value;
      }
    });
  });

  const learner = new AdaptiveLearner(allAlerts, simpleThresholds);
  const learningCycle = learner.executeLearningCycle();
  const learningMetrics = learner.getLearningMetrics();

  const correlator = new CorrelationEngine(allAlerts);
  const correlations = correlator.findCorrelations();
  const incidents = correlator.groupIntoIncidents(correlations);
  const correlationSummary = correlator.generateSummary(correlations, incidents);

  const predictor = new PredictiveAlerter(allAlerts, simpleThresholds);
  const trends = predictor.analyzeTrends();
  const predictions = predictor.generatePredictions(trends);
  const predictiveMetrics = predictor.getPredictiveMetrics(predictions);

  const grouper = new SmartAlertGrouper();
  const deduplicationResult = grouper.deduplicateAndGroup(allAlerts);
  const groupingSummary = grouper.generateSummary(deduplicationResult);
  const batchedNotifications = grouper.generateBatchedNotifications(deduplicationResult.groups);

  const contextualAdjuster = new ContextualThresholdAdjuster(allAlerts);
  const contextualThresholds = contextualAdjuster.calculateContextualThresholds();
  const timeBasedPatterns = contextualAdjuster.analyzeTimeBasedPatterns();

  const remediationEngine = new RemediationEngine();
  const remediationSuggestions = remediationEngine.generateSuggestions(allAlerts.slice(0, 20));
  const remediationMetrics = remediationEngine.getRemediationMetrics(remediationSuggestions);

  const experimenter = new ThresholdExperimenter();
  const shadowTests: any[] = [];
  
  thresholdRecommendations.slice(0, 5).forEach(rec => {
    const shadowTest = experimenter.runShadowTest(
      rec.service_name,
      rec.alert_type,
      rec.current_threshold,
      rec.recommended_threshold,
      allAlerts
    );
    shadowTests.push(shadowTest);
  });

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
    allowed_alerts: allowed,
    adaptive_learning: {
      cycle: learningCycle,
      metrics: learningMetrics
    },
    correlations: {
      correlations: correlations,
      incidents: incidents,
      summary: correlationSummary
    },
    predictions: {
      trends: trends,
      predictions: predictions,
      metrics: predictiveMetrics
    },
    deduplication: {
      result: deduplicationResult,
      summary: groupingSummary,
      batched_notifications: batchedNotifications
    },
    contextual_thresholds: {
      thresholds: contextualThresholds,
      time_patterns: timeBasedPatterns
    },
    remediation_suggestions: {
      suggestions: remediationSuggestions,
      metrics: remediationMetrics
    },
    experiments: {
      shadow_tests: shadowTests
    }
  };
}

function authenticateRequest(req: http.IncomingMessage): boolean {
  if (!API_KEY) {
    return true;
  }
  
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return false;
  }
  
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  return token === API_KEY;
}

function setCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): void {
  const origin = req.headers.origin as string | undefined;
  
  if (ALLOWED_ORIGINS.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

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

async function processRealTimeAlert(alert: AlertEvent): Promise<void> {
  if (!collector) {
    collector = new AlertDataCollector();
  }
  
  const normalized = collector.normalizeAlertEvent(alert);
  
  realTimeAlerts.push(normalized);
  
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  realTimeAlerts = realTimeAlerts.filter(a => a.normalized_timestamp > sevenDaysAgo);
  
  realTimeAlerts.sort((a, b) => a.normalized_timestamp - b.normalized_timestamp);
  
  alertProcessingQueue.push(normalized);
  
  // Get ML predictions for the alert
  if (mlClient) {
    try {
      const mlPrediction = await mlClient.predict({
        service_name: alert.service_name || '',
        alert_name: alert.alert_name || '',
        alert_type: alert.alert_type || 'error',
        severity: alert.severity || 'low',
        error_count: alert.error_count || 0,
        request_count: alert.request_count || 0,
        response_time: alert.average_response_time || 0,
        average_response_time: alert.average_response_time || 0,
        cpu_usage: alert.process_cpu_usage || 0,
        process_cpu_usage: alert.process_cpu_usage || 0,
        memory_usage: alert.process_memory_usage || 0,
        process_memory_usage: alert.process_memory_usage || 0,
        event_loop_lag: alert.event_loop_lag || 0,
        traffic_rate: alert.traffic_rate || 0,
        alert_state: alert.alert_state || 'firing',
        alert_duration: alert.alert_duration || 0
      });
      
      if (mlPrediction && mlPrediction.success && mlPrediction.predictions) {
        const { priority, ttr } = mlPrediction.predictions;
        console.log(`[ML] Priority: ${priority.priority_level} (${priority.priority_score.toFixed(1)}/100), TTR: ${ttr.ttr_minutes.toFixed(1)}min`);
        
        // Store ML predictions with the normalized alert
        (normalized as any).ml_predictions = mlPrediction.predictions;
      }
    } catch (error) {
      console.error('[ML] Prediction error:', error instanceof Error ? error.message : error);
    }
  }
  
  processIncrementalAnalysis().catch(err => {
    console.error('[REAL-TIME] Error in incremental analysis:', err);
  });
  
  console.log(`[REAL-TIME] Alert received: ${alert.alert_name} from ${alert.service_name} (${alert.alert_state})`);
}

async function processIncrementalAnalysis(): Promise<void> {
  if (isProcessingQueue || alertProcessingQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  try {
    if (alertProcessingQueue.length < 10 && realTimeAlerts.length < 100) {
      isProcessingQueue = false;
      return;
    }
    
    const allAlerts = [...realTimeAlerts];
    
    if (allAlerts.length === 0) {
      isProcessingQueue = false;
      return;
    }
    
    console.log(`[REAL-TIME] Running incremental analysis on ${allAlerts.length} alerts...`);
    
    const summary = collector!.generateSummary(allAlerts);
    
    const analyzer = new HistoricalAnalyzer(allAlerts);
    const analysisReport = analyzer.analyze();
    
    const adjuster = new ThresholdAdjuster(allAlerts, analysisReport.service_baselines);
    const thresholdRecommendations = adjuster.calculateAdaptiveThresholds();
    const thresholdConfig = adjuster.exportThresholdConfig();
    const impact = adjuster.calculateExpectedImpact();
    
    const router = new AlertRouter();
    const { decisions: routingDecisions, summary: routingSummary } = router.routeAlerts(allAlerts);
    const routingEfficiency = router.calculateEfficiency(routingSummary);
    const routingRecommendations = router.generateRoutingRecommendations(routingSummary);
    
    const suppressor = new AlertSuppressor();
    const { suppressed, allowed, summary: suppressionSummary } = suppressor.suppressAlerts(allAlerts);
    
    analysisData = {
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
    
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    collector!.writeCombinedAlertHistory(allAlerts, path.join(outputDir, 'combined-alert-history.json'));
    collector!.writeSummary(summary, path.join(outputDir, 'alert-summary.json'));
    fs.writeFileSync(
      path.join(outputDir, 'analysis-report.json'),
      JSON.stringify(analysisReport, null, 2)
    );
    fs.writeFileSync(
      path.join(outputDir, 'threshold-recommendations.json'),
      JSON.stringify(thresholdRecommendations, null, 2)
    );
    fs.writeFileSync(
      path.join(outputDir, 'adaptive-threshold-config.json'),
      JSON.stringify(thresholdConfig, null, 2)
    );
    fs.writeFileSync(
      path.join(outputDir, 'alert-routing-decisions.json'),
      JSON.stringify(routingDecisions, null, 2)
    );
    fs.writeFileSync(
      path.join(outputDir, 'routing-summary.json'),
      JSON.stringify({ summary: routingSummary, efficiency: routingEfficiency, recommendations: routingRecommendations }, null, 2)
    );
    fs.writeFileSync(
      path.join(outputDir, 'suppression-analysis.json'),
      JSON.stringify({ suppressed, allowed, summary: suppressionSummary }, null, 2)
    );
    
    alertProcessingQueue = [];
    
    console.log(`[REAL-TIME] Incremental analysis complete. Total alerts: ${allAlerts.length}`);
  } catch (error) {
    console.error('[REAL-TIME] Error in incremental analysis:', error);
  } finally {
    isProcessingQueue = false;
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(req, res);

  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const urlPath = req.url?.split('?')[0] || '';
    const queryParams = parseQueryParams(req.url || '');

    if (req.method === 'POST' && urlPath === '/api/alerts') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const alert = JSON.parse(body) as AlertEvent;
          await processRealTimeAlert(alert);
          
          res.writeHead(200);
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Alert received',
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error('[REAL-TIME] Error processing webhook alert:', error);
          res.writeHead(400);
          res.end(JSON.stringify({ 
            error: 'Invalid alert data',
            message: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });
      return;
    }

    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'Method not allowed. Only GET, POST /api/alerts, and OPTIONS are supported.' }));
      return;
    }

    if (urlPath === '/api/health') {
      const mlHealth = mlClient ? await mlClient.checkHealth() : null;
      res.writeHead(200);
      res.end(JSON.stringify({ 
        status: 'ok', 
        port: PORT,
        ml_service: mlHealth,
        data_ready: analysisData !== null,
        error: processingError ? processingError.message : null
      }));
      return;
    }

    if (!authenticateRequest(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized. Valid API key required.' }));
      return;
    }

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

    if (urlPath === '/' || urlPath === '/api/analysis') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData, null, 2));
    } else if (urlPath === '/api/realtime-stats') {
      res.writeHead(200);
      res.end(JSON.stringify({
        total_realtime_alerts: realTimeAlerts.length,
        queued_for_processing: alertProcessingQueue.length,
        is_processing: isProcessingQueue,
        last_alert_time: realTimeAlerts.length > 0 
          ? new Date(realTimeAlerts[realTimeAlerts.length - 1].normalized_timestamp).toISOString()
          : null
      }, null, 2));
    } else if (urlPath === '/api/summary') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.alert_summary, null, 2));
    } else if (urlPath === '/api/analysis-summary') {
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
      const mlReportPath = path.join(__dirname, '..', 'ml-module', 'models', 'training_report_enhanced.json');
      if (fs.existsSync(mlReportPath)) {
        const mlReport = JSON.parse(fs.readFileSync(mlReportPath, 'utf-8'));
        res.writeHead(200);
        res.end(JSON.stringify(mlReport, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'ML report not found. Please train models first.' }));
      }
    } else if (urlPath === '/api/ml-stats') {
      if (mlClient) {
        const mlStats = await mlClient.getStats();
        const clientStats = mlClient.getClientStats();
        res.writeHead(200);
        res.end(JSON.stringify({
          client: clientStats,
          service: mlStats
        }, null, 2));
      } else {
        res.writeHead(503);
        res.end(JSON.stringify({ error: 'ML client not initialized' }));
      }
    } else if (urlPath === '/api/adaptive-learning') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.adaptive_learning, null, 2));
    } else if (urlPath === '/api/correlations') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.correlations, null, 2));
    } else if (urlPath === '/api/incidents') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.correlations?.incidents || [], null, 2));
    } else if (urlPath === '/api/predictions') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.predictions, null, 2));
    } else if (urlPath === '/api/deduplication') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.deduplication, null, 2));
    } else if (urlPath === '/api/contextual-thresholds') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.contextual_thresholds, null, 2));
    } else if (urlPath === '/api/remediation') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.remediation_suggestions, null, 2));
    } else if (urlPath === '/api/experiments') {
      res.writeHead(200);
      res.end(JSON.stringify(analysisData.experiments, null, 2));
    } else if (urlPath === '/api/features') {
      res.writeHead(200);
      res.end(JSON.stringify({
        adaptive_learning: {
          enabled: !!analysisData.adaptive_learning,
          description: 'Real-time threshold learning based on alert outcomes',
          metrics: analysisData.adaptive_learning?.metrics
        },
        correlation_analysis: {
          enabled: !!analysisData.correlations,
          description: 'Root cause analysis and incident grouping',
          total_incidents: analysisData.correlations?.incidents?.length || 0,
          noise_reduction: analysisData.correlations?.summary?.noise_reduction
        },
        predictive_alerting: {
          enabled: !!analysisData.predictions,
          description: 'Forecast threshold breaches before they occur',
          total_predictions: analysisData.predictions?.predictions?.length || 0,
          avg_lead_time: analysisData.predictions?.metrics?.average_lead_time_minutes
        },
        smart_deduplication: {
          enabled: !!analysisData.deduplication,
          description: 'Intelligent alert grouping and batching',
          reduction_rate: analysisData.deduplication?.summary?.notification_reduction,
          total_groups: analysisData.deduplication?.summary?.total_groups
        },
        contextual_thresholds: {
          enabled: !!analysisData.contextual_thresholds,
          description: 'Time-aware and load-aware thresholds',
          total_contexts: analysisData.contextual_thresholds?.thresholds?.length || 0
        },
        auto_remediation: {
          enabled: !!analysisData.remediation_suggestions,
          description: 'Automated remediation suggestions',
          total_suggestions: analysisData.remediation_suggestions?.suggestions?.length || 0,
          auto_executable: analysisData.remediation_suggestions?.metrics?.auto_executable
        },
        ab_testing: {
          enabled: !!analysisData.experiments,
          description: 'Safe threshold experimentation',
          shadow_tests: analysisData.experiments?.shadow_tests?.length || 0
        }
      }, null, 2));
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
          '/api/ml-report',
          '/api/realtime-stats',
          'POST /api/alerts (webhook)',
          '/api/adaptive-learning',
          '/api/correlations',
          '/api/incidents',
          '/api/predictions',
          '/api/deduplication',
          '/api/contextual-thresholds',
          '/api/remediation',
          '/api/experiments',
          '/api/features'
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
    }
  }
});

function gracefulShutdown(signal: string): void {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  
  if (collector) {
    collector.stopRealTimeCollection();
  }
  
  server.close((err?: Error) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    } else {
      console.log('All connections closed. Exiting.');
      process.exit(0);
    }
  });
  
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

collector = new AlertDataCollector();

// Initialize ML client
console.log('Initializing ML prediction client...');
try {
  mlClient = getMLClient();
  const mlHealth = await mlClient.checkHealth();
  if (mlHealth && mlHealth.status === 'healthy') {
    console.log('[OK] ML prediction service connected');
  } else {
    console.warn('[!] ML prediction service not available - continuing without ML predictions');
    mlClient.setEnabled(false);
  }
} catch (error) {
  console.warn('[!] Could not connect to ML service:', error instanceof Error ? error.message : error);
  console.warn('[!] ML predictions will be disabled. To enable:');
  console.warn('    1. cd ml-module');
  console.warn('    2. pip install -r requirements_enhanced.txt');
  console.warn('    3. python ml_service.py');
  if (mlClient) {
    mlClient.setEnabled(false);
  }
}

console.log('Processing initial alert data...');
try {
  analysisData = processAlertData();
  if (analysisData) {
    console.log('Initial data processing complete');
    realTimeAlerts = [...analysisData.alerts];
  } else {
    console.warn('No initial data available - will collect in real-time');
  }
} catch (error) {
  processingError = error instanceof Error ? error : new Error(String(error));
  console.error('Error processing initial data:', processingError.message);
  console.error('Server will start and collect alerts in real-time');
}

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/analysis`);
  console.log(`Webhook: POST http://localhost:${PORT}/api/alerts`);
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
  
  console.log('Starting real-time alert collection...');
  collector!.startRealTimeCollection((alert: NormalizedAlertEvent) => {
    const alertEvent: AlertEvent = {
      timestamp: new Date(alert.normalized_timestamp).toISOString(),
      service_name: alert.service_name,
      alert_name: alert.alert_name,
      alert_type: alert.alert_type,
      alert_state: alert.alert_state,
      alert_duration: alert.alert_duration,
      severity: alert.severity,
      request_count: alert.request_count,
      error_count: alert.error_count,
      average_response_time: alert.average_response_time,
      process_cpu_usage: alert.process_cpu_usage,
      process_memory_usage: alert.process_memory_usage,
      event_loop_lag: alert.event_loop_lag,
      traffic_rate: alert.traffic_rate
    };
    processRealTimeAlert(alertEvent).catch(err => {
      console.error('[REAL-TIME] Error processing file-watched alert:', err);
    });
  });
  
  console.log('Ready - Real-time alert collection active');
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
