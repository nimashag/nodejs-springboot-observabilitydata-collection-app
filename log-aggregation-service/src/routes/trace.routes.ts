import { Router } from 'express';
import { TraceController } from '../controllers/trace.controller';

export function createTraceRoutes(traceController: TraceController): Router {
  const router = Router();

  router.get('/:traceId', traceController.getTraceLogs);
  router.get('/:traceId/root-cause', traceController.getRootCause);

  return router;
}

