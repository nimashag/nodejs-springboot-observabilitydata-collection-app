import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { logInfo, logWarn, requestContext } from '../utils/logger';

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
    const requestIdGenerated = !req.get('X-Request-Id');
    
    // Extract X-Session-Id header or use default
    const sessionId = req.get('X-Session-Id') || 'no-session';
    
    // Set response headers so clients can track the IDs
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Session-Id', sessionId);

    req.logMeta = {
        requestId,
        sessionId,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
    };

    // Run the request in AsyncLocalStorage context
    requestContext.run({ requestId, sessionId }, () => {
        logInfo('http.request.received', {
            method: req.method,
            path: req.originalUrl,
            query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
            ip: req.ip,
            userAgent: req.get('User-Agent')?.substring(0, 100),
            requestIdGenerated,
        });

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        const meta: Record<string, unknown> = {
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs: Number(durationMs.toFixed(2)),
        };
        
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
