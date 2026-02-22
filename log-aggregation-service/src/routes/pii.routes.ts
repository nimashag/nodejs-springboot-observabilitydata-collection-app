import { Router } from 'express';
import { PIIController } from '../controllers/pii.controller';

export function createPIIRoutes(piiController: PIIController): Router {
  const router = Router();

  // Detect PII in text
  router.post('/detect', piiController.detectPII);

  // Redact PII from text
  router.post('/redact', piiController.redactPII);

  // Redact PII from structured log
  router.post('/redact-log', piiController.redactStructuredLog);

  // Redact PII from metadata
  router.post('/redact-metadata', piiController.redactMetadata);

  // Get configuration
  router.get('/config', piiController.getConfig);

  // Update configuration
  router.put('/config', piiController.updateConfig);

  return router;
}

