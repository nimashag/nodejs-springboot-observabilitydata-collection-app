import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { logInfo, requestContext } from '../utils/logger';

declare global {
    namespace Express {
        interface Request {
            logMeta?: Record<string, unknown>;
        }
    }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    // Use existing X-Request-Id header if present, otherwise generate a new one
    const requestId = req.get('X-Request-Id') || randomUUID();
    
    // Set response header so clients can track the request ID
    res.setHeader('X-Request-Id', requestId);

    req.logMeta = {
        requestId,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
    };

    // Run the request in AsyncLocalStorage context
    requestContext.run({ requestId }, () => {
        logInfo('http.request.received', {
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
        });

        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
            const meta = {
                status: res.statusCode,
                durationMs: Number(durationMs.toFixed(2)),
                userId: (req as any).user?.id,
            };
            logInfo('http.request.completed', meta);
        });

        next();
    });
};
