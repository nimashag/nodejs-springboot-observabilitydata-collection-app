import express from "express";
import mongoose from "mongoose";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import deliveryRoutes from "./routes/delivery.routes";
import driverRoutes from "./routes/driver.routes";
import { requestLogger } from "./middleware/requestLogger";
import { initializeAlertCollector, alertCollectorMiddleware } from "./collectors/alert-collector";

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
app.use(requestLogger);
app.use(alertCollectorMiddleware);

app.use("/api/drivers", driverRoutes);
app.use("/api/delivery", deliveryRoutes);

export default app;
