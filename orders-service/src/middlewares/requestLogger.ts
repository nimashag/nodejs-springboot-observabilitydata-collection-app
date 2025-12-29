import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { logInfo, requestContext } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  // Use existing X-Request-Id header if present, otherwise generate a new one
  const requestId = req.get('X-Request-Id') || randomUUID();
  req.requestId = requestId;

  // Extract X-Session-Id header or use default
  const sessionId = req.get('X-Session-Id') || 'no-session';

  // Set response headers so clients can track the IDs
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Session-Id', sessionId);

  // Run the request in AsyncLocalStorage context
  requestContext.run({ requestId, sessionId }, () => {
  const bodyKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];

  logInfo('http.request.received', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    bodyKeys,
    userAgent: req.get('user-agent'),
  });

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const contentLength = res.getHeader('content-length');
    logInfo('http.request.completed', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      contentLength,
    });
  });

  next();
  });
};
