import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';

export function createTemplateRoutes(controller: TemplateController): Router {
  const router = Router();

  // Mine templates from logs
  router.post('/mine', controller.mineTemplates);

  // Get all templates
  router.get('/', controller.getTemplates);

  // Get template by ID
  router.get('/:id', controller.getTemplateById);

  // Delete template
  router.delete('/:id', controller.deleteTemplate);

  // Match log against templates
  router.post('/match', controller.matchTemplate);

  return router;
}

