import fs from 'fs';
import path from 'path';
import pino from 'pino';

const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

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

export const logInfo = (event: string, meta?: Record<string, unknown>) =>
    meta ? logger.info(meta, event) : logger.info(event);

export const logWarn = (event: string, meta?: Record<string, unknown>) =>
    meta ? logger.warn(meta, event) : logger.warn(event);

export const logError = (event: string, meta?: Record<string, unknown>, error?: Error) => {
    if (error) {
        const metaWithErr = { ...meta, errMsg: error.message, errStack: error.stack };
        return logger.error(metaWithErr, event);
    }
    return meta ? logger.error(meta, event) : logger.error(event);
};

export default logger;
