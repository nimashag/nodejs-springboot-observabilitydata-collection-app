import fs from 'fs';
import path from 'path';
import { StructuredLog, TraceSpan, RootCauseAnalysis } from '../types/log.types';

export class TraceCorrelator {
  private aggregatedLogPath: string;
  private traceCache: Map<string, StructuredLog[]> = new Map();

  constructor() {
    this.aggregatedLogPath = path.join(__dirname, '..', '..', 'aggregated-logs');
  }

  /**
   * Correlate logs by trace ID
   */
  correlateLogs(structuredLogs: StructuredLog[]): Map<string, StructuredLog[]> {
    const traceMap = new Map<string, StructuredLog[]>();

    for (const log of structuredLogs) {
      // Use traceId, requestId, or spanId as correlation key
      const correlationId = log.traceId || log.requestId || log.spanId;
      
      if (correlationId) {
        if (!traceMap.has(correlationId)) {
          traceMap.set(correlationId, []);
        }
        traceMap.get(correlationId)!.push(log);
      }
    }

    // Sort logs by timestamp within each trace
    for (const [traceId, logs] of traceMap) {
      logs.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }

    return traceMap;
  }

  /**
   * Get all logs for a specific trace ID
   */
  async getTraceLogs(traceId: string): Promise<StructuredLog[]> {
    // Check cache first
    if (this.traceCache.has(traceId)) {
      return this.traceCache.get(traceId)!;
    }

    // Load from aggregated logs
    const logs = await this.loadLogsFromFiles();
    const traceLogs = logs.filter(log => 
      log.traceId === traceId || 
      log.requestId === traceId || 
      log.spanId === traceId
    );

    // Cache the result
    this.traceCache.set(traceId, traceLogs);

    return traceLogs;
  }

  /**
   * Find root cause of errors in a trace
   */
  async findRootCause(traceId: string): Promise<RootCauseAnalysis> {
    const logs = await this.getTraceLogs(traceId);

    // Find all error logs
    const errorLogs = logs.filter(log => 
      log.level === 'error' || 
      log.level === 'fatal' ||
      (log.metadata && (log.metadata.statusCode >= 400 || log.metadata.error))
    );

    // Sort errors by timestamp to find the first one (root cause)
    errorLogs.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const rootCause = errorLogs.length > 0 ? errorLogs[0] : null;

    // Build error chain (errors that occurred after root cause)
    const errorChain = rootCause 
      ? errorLogs.filter(log => 
          new Date(log.timestamp).getTime() >= new Date(rootCause.timestamp).getTime()
        )
      : [];

    // Get affected services
    const affectedServices = Array.from(
      new Set(errorLogs.map(log => log.service))
    );

    // Build timeline
    const timeline = this.buildTimeline(logs);

    return {
      traceId,
      rootCause,
      errorChain,
      affectedServices,
      timeline,
    };
  }

  /**
   * Build timeline of trace spans
   */
  private buildTimeline(logs: StructuredLog[]): TraceSpan[] {
    const spans: TraceSpan[] = [];
    const spanMap = new Map<string, TraceSpan>();

    for (const log of logs) {
      const spanId = log.spanId || log.traceId || 'default';
      
      if (!spanMap.has(spanId)) {
        const span: TraceSpan = {
          traceId: log.traceId || log.requestId || 'unknown',
          spanId,
          service: log.service,
          timestamp: log.timestamp,
          logs: [],
        };
        spanMap.set(spanId, span);
        spans.push(span);
      }

      spanMap.get(spanId)!.logs.push(log);
    }

    // Calculate durations
    for (const span of spans) {
      if (span.logs.length > 1) {
        const start = new Date(span.logs[0].timestamp).getTime();
        const end = new Date(span.logs[span.logs.length - 1].timestamp).getTime();
        span.duration = end - start;
      }
    }

    // Sort by timestamp
    spans.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return spans;
  }

  /**
   * Load logs from aggregated log files
   */
  private async loadLogsFromFiles(): Promise<StructuredLog[]> {
    const logs: StructuredLog[] = [];

    if (!fs.existsSync(this.aggregatedLogPath)) {
      return logs;
    }

    const files = fs.readdirSync(this.aggregatedLogPath)
      .filter(file => file.endsWith('.jsonl'))
      .sort()
      .reverse(); // Most recent first

    // Load from recent files (last 7 days)
    const recentFiles = files.slice(0, 7);

    for (const file of recentFiles) {
      const filePath = path.join(this.aggregatedLogPath, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const log = JSON.parse(line) as StructuredLog;
            logs.push(log);
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      } catch (error) {
        console.error(`Error reading log file ${file}:`, error);
      }
    }

    return logs;
  }

  /**
   * Query logs with filters
   */
  async queryLogs(query: {
    traceId?: string;
    service?: string;
    level?: string;
    startTime?: string;
    endTime?: string;
    event?: string;
    limit?: number;
    offset?: number;
  }): Promise<StructuredLog[]> {
    let logs = await this.loadLogsFromFiles();

    // Apply filters
    if (query.traceId) {
      logs = logs.filter(log => 
        log.traceId === query.traceId || 
        log.requestId === query.traceId ||
        log.spanId === query.traceId
      );
    }

    if (query.service) {
      logs = logs.filter(log => log.service === query.service);
    }

    if (query.level) {
      logs = logs.filter(log => log.level === query.level);
    }

    if (query.startTime) {
      const start = new Date(query.startTime).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= start);
    }

    if (query.endTime) {
      const end = new Date(query.endTime).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() <= end);
    }

    if (query.event) {
      logs = logs.filter(log => log.event.includes(query.event!));
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return logs.slice(offset, offset + limit);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.traceCache.clear();
  }
}

