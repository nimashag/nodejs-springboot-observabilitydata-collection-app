import { Request, Response } from 'express';
import { TraceCorrelator } from '../services/traceCorrelator';

export class LogController {
  private traceCorrelator: TraceCorrelator;

  constructor(traceCorrelator: TraceCorrelator) {
    this.traceCorrelator = traceCorrelator;
  }

  /**
   * GET /api/logs
   * Query structured logs with filters
   */
  queryLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        traceId,
        service,
        level,
        startTime,
        endTime,
        event,
        limit,
        offset,
      } = req.query;

      const query = {
        traceId: traceId as string | undefined,
        service: service as string | undefined,
        level: level as string | undefined,
        startTime: startTime as string | undefined,
        endTime: endTime as string | undefined,
        event: event as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const logs = await this.traceCorrelator.queryLogs(query);

      res.json({
        count: logs.length,
        logs,
        query,
      });
    } catch (error) {
      console.error('Error querying logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

