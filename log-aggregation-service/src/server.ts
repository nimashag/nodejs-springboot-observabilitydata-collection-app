import dotenv from 'dotenv';
import { createApp } from './app';
import { LogCollector } from './services/logCollector';
import { MLBasedLogParser } from './services/logParser';
import { TraceCorrelator } from './services/traceCorrelator';
import { LogTemplateMiner } from './services/templateMiner';
import { TemplateModel } from './models/templateModel';
import { PIIDetector } from './services/piiDetector';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3005;

async function startServer() {
  try {
    console.log('Starting Log Aggregation Service...');

    // Initialize template miner and model
    const templateMiner = new LogTemplateMiner();
    const templateModel = new TemplateModel();
    
    // Load existing templates into miner
    const existingTemplates = templateModel.getAllTemplates();
    existingTemplates.forEach(template => {
      templateMiner.addTemplate(template);
    });
    console.log(`Loaded ${existingTemplates.length} existing templates`);

    // Initialize PII detector
    const piiDetector = new PIIDetector();
    console.log(`PII Detection: ${piiDetector.getConfig().enabled ? 'Enabled' : 'Disabled'}`);
    if (piiDetector.getConfig().enabled) {
      console.log(`  Strategy: ${piiDetector.getConfig().strategy}`);
      console.log(`  Detecting: IPs=${piiDetector.getConfig().detectIPs}, Emails=${piiDetector.getConfig().detectEmails}, Usernames=${piiDetector.getConfig().detectUsernames}, Credentials=${piiDetector.getConfig().detectCredentials}`);
    }

    // Initialize services
    const logParser = new MLBasedLogParser(templateMiner, piiDetector);
    const logCollector = new LogCollector(logParser);
    const traceCorrelator = new TraceCorrelator();

    // Initialize log collection
    console.log('Initializing log collection...');
    await logCollector.initialize();

    // Auto-train model if enabled and not already trained
    if (process.env.MODEL_TRAINING_ENABLED === 'true' && !logParser.isModelTrained()) {
      console.log('Auto-training ML model from existing logs...');
      try {
        // This will be handled by the API endpoint, but we can trigger it here
        // For now, we'll let it train on-the-fly as logs come in
        console.log('Model will train on-the-fly as logs are processed');
      } catch (error) {
        console.warn('Auto-training failed, continuing without trained model:', error);
      }
    }

    // Create Express app
    const app = createApp(traceCorrelator, logParser, templateMiner, templateModel, piiDetector);

    // Start server
    app.listen(PORT, () => {
      console.log(`Log Aggregation Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API docs: http://localhost:${PORT}/`);
      console.log(`Registered services: ${logCollector.getRegisteredServices().join(', ')}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      await logCollector.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      await logCollector.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

