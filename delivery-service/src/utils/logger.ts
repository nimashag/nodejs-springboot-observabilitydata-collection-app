import fs from 'fs';
import path from 'path';
import log4js from 'log4js';
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

// Custom layout to ensure a distinct shape vs other services:
// DELIVERY|ts=<iso>|lvl=<level>|ev=<event>|ctx=<json>
log4js.addLayout('deliveryLine', () => (logEvent) => {
  const ts = new Date(logEvent.startTime).toISOString();
  const lvl = logEvent.level.levelStr.toLowerCase();
  // logEvent.data is an array; first item is our formatted message string
  const msg = logEvent.data[0];
  return `DELIVERY|ts=${ts}|lvl=${lvl}|${msg}`;
});

log4js.configure({
  appenders: {
    console: { type: 'stdout', layout: { type: 'deliveryLine' } },
    file: {
      type: 'dateFile',
      filename: path.join(logDir, 'delivery-service.log'),
      pattern: 'yyyy-MM-dd',
      keepFileExt: true,
      daysToKeep: 14,
      compress: false,
      layout: { type: 'deliveryLine' },
    },
  },
  categories: {
    default: {
      appenders: ['console', 'file'],
      level: 'info',
    },
  },
});

const logger = log4js.getLogger('delivery-service');

type Meta = Record<string, unknown> | undefined;

const formatMeta = (meta?: Meta) =>
  meta && Object.keys(meta).length ? `ctx=${JSON.stringify(meta)}` : 'ctx={}';

export const logInfo = (event: string, meta?: Meta) => {
  const enrichedMeta = enrichMeta(meta);
  logger.info(`ev=${event}|${formatMeta(enrichedMeta)}`);
};

export const logWarn = (event: string, meta?: Meta) => {
  const enrichedMeta = enrichMeta(meta);
  logger.warn(`ev=${event}|${formatMeta(enrichedMeta)}`);
};

export const logError = (event: string, meta?: Meta, error?: Error) => {
  const enriched = enrichMeta({ ...meta, errMsg: error?.message, errStack: error?.stack });
  logger.error(`ev=${event}|${formatMeta(enriched)}`);
};

export default logger;
