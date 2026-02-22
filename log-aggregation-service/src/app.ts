import express, { Application } from 'express';
import cors from 'cors';
import { TraceController } from './controllers/trace.controller';
import { LogController } from './controllers/log.controller';
import { TrainingController } from './controllers/training.controller';
import { TemplateController } from './controllers/template.controller';
import { PIIController } from './controllers/pii.controller';
import { createTraceRoutes } from './routes/trace.routes';
import { createLogRoutes } from './routes/log.routes';
import { createTrainingRoutes } from './routes/training.routes';
import { createTemplateRoutes } from './routes/template.routes';
import { createPIIRoutes } from './routes/pii.routes';
import { TraceCorrelator } from './services/traceCorrelator';
import { MLBasedLogParser } from './services/logParser';
import { LogTemplateMiner } from './services/templateMiner';
import { TemplateModel } from './models/templateModel';
import { PIIDetector } from './services/piiDetector';

export function createApp(
  traceCorrelator: TraceCorrelator,
  logParser: MLBasedLogParser,
  templateMiner: LogTemplateMiner,
  templateModel: TemplateModel,
  piiDetector: PIIDetector
): Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Controllers
  const traceController = new TraceController(traceCorrelator);
  const logController = new LogController(traceCorrelator);
  const trainingController = new TrainingController(logParser);
  const templateController = new TemplateController(templateMiner, templateModel);
  const piiController = new PIIController(piiDetector);

  // Routes
  app.use('/api/traces', createTraceRoutes(traceController));
  app.use('/api/logs', createLogRoutes(logController));
  app.use('/api/train', createTrainingRoutes(trainingController));
  app.use('/api/templates', createTemplateRoutes(templateController));
  app.use('/api/pii', createPIIRoutes(piiController));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'log-aggregation-service',
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'log-aggregation-service',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        traces: '/api/traces/:traceId',
        rootCause: '/api/traces/:traceId/root-cause',
        logs: '/api/logs',
        train: '/api/train',
        templates: '/api/templates',
        mineTemplates: '/api/templates/mine',
        pii: {
          detect: '/api/pii/detect',
          redact: '/api/pii/redact',
          redactLog: '/api/pii/redact-log',
          redactMetadata: '/api/pii/redact-metadata',
          config: '/api/pii/config',
        },
      },
    });
  });

  return app;
}

