import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; 
import restaurantsRoutes from './routes/restaurants.routes';
import path from 'path';
import { requestLogger } from './middlewares/requestLogger';
import { initializeAlertCollector, alertCollectorMiddleware } from './collectors/alert-collector';
import { createMetricsMiddleware } from './middlewares/metricsMiddleware';
import { enhanceMongooseWithRequestId, mongooseQueryTracker } from './middlewares/mongoosePlugin';

// Apply mongoose plugin BEFORE connecting to database
mongoose.plugin(mongooseQueryTracker);

const app = express();

initializeAlertCollector('restaurants-service');

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());

// createMetricsMiddleware FIRST so requestId exists; enhanceMongooseWithRequestId sets global for DB tracking
app.use(createMetricsMiddleware('restaurants-service', './metrics'));
app.use(enhanceMongooseWithRequestId);

app.use(requestLogger);
app.use(alertCollectorMiddleware);

app.use('/api/restaurants', restaurantsRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


export default app;
