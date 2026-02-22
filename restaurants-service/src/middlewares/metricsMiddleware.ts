import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

interface RequestMetrics {
  request_id: string;
  service: string;
  http: {
    method: string;
    route: string;
    path: string;
    status_code: number;
  };
  timing: {
    start_ts_ms: number;
    end_ts_ms: number;
    duration_ms: number;
  };
  metrics: {
    cpu_percent: number;
    rss_mb: number;
    heap_used_mb: number;
    db_query_time_ms: number;
  };
}

// Store metrics per request using AsyncLocalStorage-like pattern
const requestMetricsMap = new Map<string, {
  startTime: number;
  dbQueryTime: number;
  cpuUsageStart: NodeJS.CpuUsage;
}>();

// Track DB query times per request
export function trackDbQuery(requestId: string, queryTimeMs: number): void {
  const metrics = requestMetricsMap.get(requestId);
  if (metrics) {
    metrics.dbQueryTime += queryTimeMs;
  }
}

// Get CPU usage percentage
function getCpuPercent(): number {
  const cpus = os.cpus();
  if (cpus.length === 0) return 0;
  
  // Simple approximation: use process.cpuUsage() if available
  // Otherwise return 0 (approximation)
  try {
    const usage = process.cpuUsage();
    // This is a simplified approximation
    // In production, you'd want to track over time
    return Math.min(100, (usage.user + usage.system) / 10000);
  } catch {
    return 0;
  }
}

// Get memory metrics
function getMemoryMetrics(): { rss_mb: number; heap_used_mb: number } {
  const memUsage = process.memoryUsage();
  return {
    rss_mb: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
    heap_used_mb: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
  };
}

// Write metrics to JSONL file
function writeMetrics(metrics: RequestMetrics, outputDir: string): void {
  const metricsFile = path.join(outputDir, 'metrics.jsonl');
  const line = JSON.stringify(metrics) + '\n';
  
  try {
    fs.appendFileSync(metricsFile, line, 'utf8');
  } catch (error) {
    console.error(`Failed to write metrics to ${metricsFile}:`, error);
  }
}

// Extract route pattern from path (simplified - you may want to enhance this)
function extractRoute(path: string, method: string): string {
  // Remove query strings
  const cleanPath = path.split('?')[0];
  
  // Common patterns - replace IDs with :id
  let route = cleanPath
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9]{24}/g, '/:id') // MongoDB ObjectId
    .replace(/\/[a-f0-9-]{36}/g, '/:id'); // UUID
  
  return `${method} ${route}`;
}

export function createMetricsMiddleware(serviceName: string, outputDir: string = './metrics') {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = req.get('X-Request-Id') || randomUUID();
    
    // Initialize metrics tracking for this request
    requestMetricsMap.set(requestId, {
      startTime,
      dbQueryTime: 0,
      cpuUsageStart: process.cpuUsage(),
    });

    // Store requestId in request object for DB tracking
    (req as any).metricsRequestId = requestId;

    // Capture response finish
    res.on('finish', () => {
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      
      const metricsData = requestMetricsMap.get(requestId);
      if (!metricsData) {
        return;
      }

      const memory = getMemoryMetrics();
      const cpuPercent = getCpuPercent();
      
      const metrics: RequestMetrics = {
        request_id: requestId,
        service: serviceName,
        http: {
          method: req.method,
          route: extractRoute(req.path || req.url || '', req.method),
          path: req.path || req.url?.split('?')[0] || '',
          status_code: res.statusCode,
        },
        timing: {
          start_ts_ms: startTime,
          end_ts_ms: endTime,
          duration_ms: Math.round(durationMs * 100) / 100,
        },
        metrics: {
          cpu_percent: Math.round(cpuPercent * 100) / 100,
          rss_mb: memory.rss_mb,
          heap_used_mb: memory.heap_used_mb,
          db_query_time_ms: Math.round(metricsData.dbQueryTime * 100) / 100,
        },
      };

      writeMetrics(metrics, outputDir);
      
      // Clean up
      requestMetricsMap.delete(requestId);
    });

    next();
  };
}

