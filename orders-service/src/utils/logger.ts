import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// AsyncLocalStorage to store request context
export const requestContext = new AsyncLocalStorage<{ requestId: string; sessionId: string }>();

const streams = [
    { stream: pino.destination(1) }, // stdout
    {
        stream: pino.destination({
            dest: path.join(logDir, 'orders-service.log'),
            append: true,
            sync: false,
        }),
    },
];

const logger = pino(
    {
        level: 'info',
        base: { svc: 'orders-service' },
        timestamp: pino.stdTimeFunctions.isoTime, // ISO string
        formatters: {
            level: (label) => ({ lvl: label }),
            log: (obj) => {
                const { msg, ...rest } = obj as Record<string, unknown>;
                const meta = rest && Object.keys(rest).length ? rest : undefined;
                return meta ? { evt: msg, meta } : { evt: msg };
            },
        },
    },
    pino.multistream(streams)
);

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

export const logInfo = (event: string, meta?: Record<string, unknown>) => {
    const enrichedMeta = enrichMeta(meta);
    return logger.info(enrichedMeta, event);
};

export const logWarn = (event: string, meta?: Record<string, unknown>) => {
    const enrichedMeta = enrichMeta(meta);
    return logger.warn(enrichedMeta, event);
};

export const logError = (event: string, meta?: Record<string, unknown>, error?: Error) => {
    const enrichedMeta = enrichMeta(meta);
    if (error) {
        const metaWithErr = { ...enrichedMeta, errMsg: error.message, errStack: error.stack };
        return logger.error(metaWithErr, event);
    }
    return logger.error(enrichedMeta, event);
};

export default logger;
