import { Request, Response } from 'express';
import { PIIDetector } from '../services/piiDetector';
import { StructuredLog } from '../types/log.types';

export class PIIController {
  private piiDetector: PIIDetector;

  constructor(piiDetector: PIIDetector) {
    this.piiDetector = piiDetector;
  }

  /**
   * POST /api/pii/detect
   * Detect PII in a text string
   */
  detectPII = async (req: Request, res: Response): Promise<void> => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Text is required and must be a string' });
        return;
      }

      const matches = this.piiDetector.detectPII(text);
      const stats = this.piiDetector.getDetectionStats(matches);

      res.json({
        success: true,
        matches,
        count: matches.length,
        statistics: stats,
      });
    } catch (error) {
      console.error('Error detecting PII:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * POST /api/pii/redact
   * Redact PII from a text string
   */
  redactPII = async (req: Request, res: Response): Promise<void> => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Text is required and must be a string' });
        return;
      }

      const matches = this.piiDetector.detectPII(text);
      const redacted = this.piiDetector.redactPII(text, matches);
      const stats = this.piiDetector.getDetectionStats(matches);

      res.json({
        success: true,
        original: text,
        redacted,
        matches,
        count: matches.length,
        statistics: stats,
      });
    } catch (error) {
      console.error('Error redacting PII:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * POST /api/pii/redact-log
   * Redact PII from a structured log
   */
  redactStructuredLog = async (req: Request, res: Response): Promise<void> => {
    try {
      const log: StructuredLog = req.body;

      if (!log || typeof log !== 'object') {
        res.status(400).json({ error: 'Structured log is required' });
        return;
      }

      const redactedLog = this.piiDetector.redactStructuredLog(log);

      res.json({
        success: true,
        original: log,
        redacted: redactedLog,
        piiDetected: redactedLog.piiDetected || [],
        piiRedacted: redactedLog.piiRedacted || false,
      });
    } catch (error) {
      console.error('Error redacting structured log:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * POST /api/pii/redact-metadata
   * Redact PII from metadata object
   */
  redactMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      const { metadata } = req.body;

      if (!metadata || typeof metadata !== 'object') {
        res.status(400).json({ error: 'Metadata is required and must be an object' });
        return;
      }

      const redactedMetadata = this.piiDetector.redactMetadata(metadata);

      res.json({
        success: true,
        original: metadata,
        redacted: redactedMetadata,
      });
    } catch (error) {
      console.error('Error redacting metadata:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * GET /api/pii/config
   * Get current PII detection configuration
   */
  getConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const config = this.piiDetector.getConfig();
      res.json({
        success: true,
        config,
      });
    } catch (error) {
      console.error('Error getting PII config:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * PUT /api/pii/config
   * Update PII detection configuration
   */
  updateConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const configUpdate = req.body;

      if (!configUpdate || typeof configUpdate !== 'object') {
        res.status(400).json({ error: 'Configuration update is required' });
        return;
      }

      this.piiDetector.updateConfig(configUpdate);
      const updatedConfig = this.piiDetector.getConfig();

      res.json({
        success: true,
        message: 'Configuration updated',
        config: updatedConfig,
      });
    } catch (error) {
      console.error('Error updating PII config:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

