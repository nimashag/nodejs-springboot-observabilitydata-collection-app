import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// AsyncLocalStorage to store request context
export const requestContext = new AsyncLocalStorage<{ requestId: string; sessionId: string }>();

// Helper to get requestId from context or use default
const getRequestId = (): string => {
    const context = requestContext.getStore();
    return context?.requestId || 'system';
};

// Helper to get sessionId from context or use default
const getSessionId = (): string => {
    const context = requestContext.getStore();
    return context?.sessionId || 'no-session';
};

// Helper to ensure requestId and sessionId are always in meta
const enrichMeta = (meta?: Record<string, unknown>): Record<string, unknown> => {
    const requestId = getRequestId();
    const sessionId = getSessionId();
    return { ...meta, requestId, sessionId };
};

const baseFormat = format.printf(({ timestamp, level, message, ...meta }) => {
    const service = 'restaurants-service';
    // Ensure requestId is always present
    const enrichedMeta = enrichMeta(meta);
    const metaKeys = Object.keys(enrichedMeta || {});
    const metaString = metaKeys.length ? ` | data=${JSON.stringify(enrichedMeta)}` : '';
    // Distinct order vs users-service: service first, then level, then timestamp
    return `svc=${service} | level=${level.toUpperCase()} | ts=${timestamp} | event=${message}${metaString}`;
});

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        format.errors({ stack: true }),
        format.splat(),
        baseFormat
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: path.join(logDir, 'restaurants-service.log') })
    ],
});

export const logInfo = (event: string, meta?: Record<string, unknown>) => {
    const enrichedMeta = enrichMeta(meta);
    return logger.info(event, enrichedMeta);
};

export const logWarn = (event: string, meta?: Record<string, unknown>) => {
    const enrichedMeta = enrichMeta(meta);
    return logger.warn(event, enrichedMeta);
};

export const logError = (event: string, meta?: Record<string, unknown>, error?: Error) => {
    const enrichedMeta = enrichMeta(meta);
    if (error) {
        return logger.error(event, { ...enrichedMeta, error: error.message, stack: error.stack });
    }
    return logger.error(event, enrichedMeta);
};

export default logger;
