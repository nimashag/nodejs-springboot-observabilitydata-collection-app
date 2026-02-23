import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import "./middleware/registerMongooseMetricsPlugin";
import deliveryRoutes from "./routes/delivery.routes";
import driverRoutes from "./routes/driver.routes";
import { requestLogger } from "./middleware/requestLogger";
import { initializeAlertCollector, alertCollectorMiddleware } from "./collectors/alert-collector";
import { createMetricsMiddleware } from "./middleware/metricsMiddleware";
import { enhanceMongooseWithRequestId } from "./middleware/mongoosePlugin";
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

// createMetricsMiddleware FIRST so requestId exists; enhanceMongooseWithRequestId keeps requestId on req for compatibility
app.use(createMetricsMiddleware('delivery-service', './metrics'));
app.use(enhanceMongooseWithRequestId);

app.use(requestLogger);
app.use(alertCollectorMiddleware);
app.use(telemetryMiddleware);

app.use("/api/drivers", driverRoutes);
app.use("/api/delivery", deliveryRoutes);

export default app;
