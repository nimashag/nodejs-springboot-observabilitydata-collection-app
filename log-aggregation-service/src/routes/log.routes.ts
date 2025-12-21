import { Router } from 'express';
import { LogController } from '../controllers/log.controller';

export function createLogRoutes(logController: LogController): Router {
  const router = Router();

  router.get('/', logController.queryLogs);

  return router;
}

