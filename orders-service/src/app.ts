import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import orderRoutes from './routes/orders.routes';
import { requestLogger } from './middlewares/requestLogger';
import { initializeAlertCollector, alertCollectorMiddleware } from './collectors/alert-collector';
import { createMetricsMiddleware } from './middlewares/metricsMiddleware';
import { enhanceMongooseWithRequestId, mongooseQueryTracker } from './middlewares/mongoosePlugin';

// Apply plugin BEFORE connecting to DB (where you do connectDB, or here if you connect inline)
mongoose.plugin(mongooseQueryTracker);

const app = express();

initializeAlertCollector('orders-service');

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// createMetricsMiddleware FIRST so requestId exists; enhanceMongooseWithRequestId sets global for DB tracking
app.use(createMetricsMiddleware('orders-service', './metrics'));
app.use(enhanceMongooseWithRequestId);

app.use(requestLogger);
app.use(alertCollectorMiddleware);

app.use('/api/orders', orderRoutes);

export default app;