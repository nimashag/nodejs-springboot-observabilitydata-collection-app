// src/middlewares/telemetry.middleware.ts
import { Request, Response, NextFunction } from "express";
import { recordTelemetry } from "../collectors/telemetry.collector";

export function telemetryMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const latencyMs = Date.now() - start;

    const routePath = req.originalUrl?.split("?")[0] || req.path || "";
    const key = `${req.method} ${routePath}`;

    const isError = res.statusCode >= 400;

    recordTelemetry(key, latencyMs, isError);
  });

  next();
}
