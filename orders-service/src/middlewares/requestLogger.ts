import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { logInfo, logWarn, requestContext } from '../utils/logger';

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
  const requestIdGenerated = !req.get('X-Request-Id');
  req.requestId = requestId;

  // Extract X-Session-Id header or use default
  const sessionId = req.get('X-Session-Id') || 'no-session';

  // Set response headers so clients can track the IDs
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Session-Id', sessionId);

  // Run the request in AsyncLocalStorage context
  requestContext.run({ requestId, sessionId }, () => {
    const bodyKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
    const queryKeys = req.query && typeof req.query === 'object' ? Object.keys(req.query) : [];

    logInfo('http.request.received', {
      method: req.method,
      path: req.originalUrl,
      query: queryKeys.length > 0 ? queryKeys : undefined,
      ip: req.ip,
      bodyKeys: bodyKeys.length > 0 ? bodyKeys : undefined,
      userAgent: req.get('user-agent')?.substring(0, 100),
      requestIdGenerated,
    });

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const contentLength = res.getHeader('content-length');
      const meta: Record<string, unknown> = {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      };

      if (contentLength) {
        meta.contentLength = contentLength;
      }

      if ((req as any).user?.id) {
        meta.userId = (req as any).user.id;
      }

      if (res.statusCode >= 400) {
        logWarn('http.request.completed.error', meta);
      } else {
        logInfo('http.request.completed.success', meta);
      }
    });

    next();
  });
};
