import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; 
import restaurantsRoutes from './routes/restaurants.routes';
import path from 'path';
import { requestLogger } from './middlewares/requestLogger';
import { initializeAlertCollector, alertCollectorMiddleware } from './collectors/alert-collector';

const app = express();

// Initialize Alert Collector
initializeAlertCollector('restaurants-service');

//Allow requests from your frontend
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));

app.use(express.json());
app.use(requestLogger);
app.use(alertCollectorMiddleware);

app.use('/api/restaurants', restaurantsRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


export default app;
