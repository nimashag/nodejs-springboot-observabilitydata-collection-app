import express from "express";
import mongoose from "mongoose";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import deliveryRoutes from "./routes/delivery.routes";
import driverRoutes from "./routes/driver.routes";
import { requestLogger } from "./middleware/requestLogger";
import { initializeAlertCollector, alertCollectorMiddleware } from "./collectors/alert-collector";
import { createMetricsMiddleware } from "./middleware/metricsMiddleware";
import { enhanceMongooseWithRequestId, mongooseQueryTracker } from "./middleware/mongoosePlugin";

// Apply mongoose plugin BEFORE connecting to database
mongoose.plugin(mongooseQueryTracker);
import { telemetryMiddleware } from "./middleware/telemetry.middleware";

dotenv.config();
const app = express();

// Initialize Alert Collector
initializeAlertCollector('delivery-service');

//Allow requests from your frontend
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());

// createMetricsMiddleware FIRST so requestId exists; enhanceMongooseWithRequestId sets global for DB tracking
app.use(createMetricsMiddleware('delivery-service', './metrics'));
app.use(enhanceMongooseWithRequestId);

app.use(requestLogger);
app.use(alertCollectorMiddleware);
app.use(telemetryMiddleware);

app.use("/api/drivers", driverRoutes);
app.use("/api/delivery", deliveryRoutes);

export default app;
