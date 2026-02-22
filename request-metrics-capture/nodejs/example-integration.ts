/**
 * Example integration for Node.js services
 * 
 * This shows how to integrate the metrics middleware into your Express app
 */

import express from 'express';
import mongoose from 'mongoose';
import { createMetricsMiddleware, enhanceMongooseWithRequestId } from './metricsMiddleware';
import { mongooseQueryTracker } from './mongoosePlugin';

const app = express();

// 1. Apply mongoose plugin globally to track all queries
mongoose.plugin(mongooseQueryTracker);

// 2. Add middleware to enhance mongoose with requestId (before other middleware)
app.use(enhanceMongooseWithRequestId);

// 3. Add metrics capture middleware (after requestId middleware, before routes)
// Replace 'your-service-name' with your actual service name
app.use(createMetricsMiddleware('your-service-name', './metrics'));

// 4. Your existing middleware and routes
// app.use(requestLogger);
// app.use('/api/orders', orderRoutes);

export default app;

/**
 * For services like orders-service, restaurants-service, delivery-service:
 * 
 * 1. Copy metricsMiddleware.ts and mongoosePlugin.ts to your service
 * 2. Install uuid: npm install uuid @types/uuid
 * 3. Update your app.ts:
 * 
 * import { createMetricsMiddleware, enhanceMongooseWithRequestId } from './middlewares/metricsMiddleware';
 * import { mongooseQueryTracker } from './middlewares/mongoosePlugin';
 * import mongoose from 'mongoose';
 * 
 * // Apply plugin before connecting to DB
 * mongoose.plugin(mongooseQueryTracker);
 * 
 * // In your app setup:
 * app.use(enhanceMongooseWithRequestId);
 * app.use(createMetricsMiddleware('orders-service', './metrics'));
 * app.use(requestLogger); // Your existing middleware
 * 
 * 4. Metrics will be written to ./metrics/metrics.jsonl
 */

