import express, { Application } from 'express';
import cors from 'cors';
import { TraceController } from './controllers/trace.controller';
import { LogController } from './controllers/log.controller';
import { TrainingController } from './controllers/training.controller';
import { createTraceRoutes } from './routes/trace.routes';
import { createLogRoutes } from './routes/log.routes';
import { createTrainingRoutes } from './routes/training.routes';
import { TraceCorrelator } from './services/traceCorrelator';
import { MLBasedLogParser } from './services/logParser';

export function createApp(
  traceCorrelator: TraceCorrelator,
  logParser: MLBasedLogParser
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

  // Routes
  app.use('/api/traces', createTraceRoutes(traceController));
  app.use('/api/logs', createLogRoutes(logController));
  app.use('/api/train', createTrainingRoutes(trainingController));

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
      },
    });
  });

  return app;
}

