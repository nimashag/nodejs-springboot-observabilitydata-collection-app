import express from 'express';
import cors from 'cors'; 
import './middlewares/registerMongooseMetricsPlugin';
import restaurantsRoutes from './routes/restaurants.routes';
import path from 'path';
import { requestLogger } from './middlewares/requestLogger';
import { initializeAlertCollector, alertCollectorMiddleware } from './collectors/alert-collector';
import { createMetricsMiddleware } from './middlewares/metricsMiddleware';
import { enhanceMongooseWithRequestId } from './middlewares/mongoosePlugin';
import { telemetryMiddleware } from "./middlewares/telemetry.middleware";

const app = express();

initializeAlertCollector('restaurants-service');

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());

// createMetricsMiddleware FIRST so requestId exists; enhanceMongooseWithRequestId keeps requestId on req for compatibility
app.use(createMetricsMiddleware('restaurants-service', './metrics'));
app.use(enhanceMongooseWithRequestId);

app.use(requestLogger);
app.use(alertCollectorMiddleware);
app.use(telemetryMiddleware);

app.use('/api/restaurants', restaurantsRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


export default app;
