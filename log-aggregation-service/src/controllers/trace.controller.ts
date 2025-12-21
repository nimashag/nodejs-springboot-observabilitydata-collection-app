import { Request, Response } from 'express';
import { TraceCorrelator } from '../services/traceCorrelator';

export class TraceController {
  private traceCorrelator: TraceCorrelator;

  constructor(traceCorrelator: TraceCorrelator) {
    this.traceCorrelator = traceCorrelator;
  }

  /**
   * GET /api/traces/:traceId
   * Get all logs for a specific trace ID
   */
  getTraceLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { traceId } = req.params;
      
      if (!traceId) {
        res.status(400).json({ error: 'Trace ID is required' });
        return;
      }

      const logs = await this.traceCorrelator.getTraceLogs(traceId);
      
      res.json({
        traceId,
        count: logs.length,
        logs,
      });
    } catch (error) {
      console.error('Error getting trace logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * GET /api/traces/:traceId/root-cause
   * Get root cause analysis for a trace
   */
  getRootCause = async (req: Request, res: Response): Promise<void> => {
    try {
      const { traceId } = req.params;
      
      if (!traceId) {
        res.status(400).json({ error: 'Trace ID is required' });
        return;
      }

      const analysis = await this.traceCorrelator.findRootCause(traceId);
      
      res.json(analysis);
    } catch (error) {
      console.error('Error getting root cause:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

