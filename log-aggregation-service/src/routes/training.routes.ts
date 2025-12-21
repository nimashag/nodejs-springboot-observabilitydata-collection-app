import { Router } from 'express';
import { TrainingController } from '../controllers/training.controller';

export function createTrainingRoutes(trainingController: TrainingController): Router {
  const router = Router();

  router.post('/', trainingController.trainModel);
  router.post('/auto', trainingController.autoTrain);
  router.get('/status', trainingController.getTrainingStatus);

  return router;
}

