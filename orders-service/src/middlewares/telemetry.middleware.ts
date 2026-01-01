// src/middlewares/telemetry.middleware.ts

import { Request, Response, NextFunction } from "express";
import { telemetryStore } from "../collectors/telemetry.collector";

export function telemetryMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1e6;

    telemetryStore.totalRequests += 1;
    telemetryStore.totalLatencyMs += latencyMs;

    if (res.statusCode >= 400) {
      telemetryStore.totalErrors += 1;
    }

    const method = req.method;
    // Express keeps the route pattern at req.route?.path but not always available here.
    // We’ll use originalUrl without query for now (good enough for Step 3).
    const path = req.originalUrl.split("?")[0];
    const key = `${method} ${path}`;

    if (!telemetryStore.routes[key]) {
      telemetryStore.routes[key] = { count: 0, errors: 0, totalLatencyMs: 0 };
    }

    telemetryStore.routes[key].count += 1;
    telemetryStore.routes[key].totalLatencyMs += latencyMs;
    if (res.statusCode >= 400) telemetryStore.routes[key].errors += 1;
  });

  next();
}
