import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import orderRoutes from './routes/orders.routes';
import { requestLogger } from './middlewares/requestLogger';
import { initializeAlertCollector, alertCollectorMiddleware } from './collectors/alert-collector';

const app = express();

// Initialize Alert Collector
initializeAlertCollector('orders-service');

//Allow requests from your frontend
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));

app.use(express.json());
app.use(requestLogger);
app.use(alertCollectorMiddleware);

app.use('/api/orders', orderRoutes);

export default app;
