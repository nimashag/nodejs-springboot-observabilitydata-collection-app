import { Request, Response } from 'express';
import { MLBasedLogParser } from '../services/logParser';
import { StructuredLog } from '../types/log.types';
import fs from 'fs';
import path from 'path';

export class TrainingController {
  private parser: MLBasedLogParser;

  constructor(parser: MLBasedLogParser) {
    this.parser = parser;
  }

  /**
   * POST /api/train
   * Train the ML model with sample logs
   */
  trainModel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sampleLogs } = req.body;

      if (!sampleLogs || !Array.isArray(sampleLogs) || sampleLogs.length === 0) {
        res.status(400).json({ 
          error: 'sampleLogs array is required with format: [{raw: string, structured: StructuredLog}]' 
        });
        return;
      }

      // Validate sample logs format
      const validSamples = sampleLogs.filter((sample: any) => 
        sample.raw && sample.structured
      );

      if (validSamples.length === 0) {
        res.status(400).json({ 
          error: 'Invalid sample logs format. Expected: [{raw: string, structured: StructuredLog}]' 
        });
        return;
      }

      await this.parser.trainModel(validSamples);

      res.json({
        message: 'Model trained successfully',
        samplesUsed: validSamples.length,
        isTrained: this.parser.isModelTrained(),
      });
    } catch (error) {
      console.error('Error training model:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * POST /api/train/auto
   * Auto-train model using existing aggregated logs
   */
  autoTrain = async (req: Request, res: Response): Promise<void> => {
    try {
      const aggregatedLogPath = path.join(__dirname, '..', '..', 'aggregated-logs');
      
      if (!fs.existsSync(aggregatedLogPath)) {
        res.status(404).json({ error: 'No aggregated logs found. Collect some logs first.' });
        return;
      }

      const files = fs.readdirSync(aggregatedLogPath)
        .filter(file => file.endsWith('.jsonl'))
        .sort()
        .reverse()
        .slice(0, 5); // Use last 5 files

      const sampleLogs: Array<{ raw: string; structured: StructuredLog }> = [];

      for (const file of files) {
        const filePath = path.join(aggregatedLogPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines.slice(0, 100)) { // Limit per file
          try {
            const structured = JSON.parse(line) as StructuredLog;
            if (structured.raw) {
              sampleLogs.push({
                raw: structured.raw,
                structured,
              });
            }
          } catch (e) {
            // Skip invalid lines
          }
        }
      }

      if (sampleLogs.length === 0) {
        res.status(400).json({ error: 'No valid logs found for training' });
        return;
      }

      await this.parser.trainModel(sampleLogs);

      res.json({
        message: 'Model auto-trained successfully',
        samplesUsed: sampleLogs.length,
        filesUsed: files.length,
        isTrained: this.parser.isModelTrained(),
      });
    } catch (error) {
      console.error('Error auto-training model:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * GET /api/train/status
   * Get training status
   */
  getTrainingStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        isTrained: this.parser.isModelTrained(),
      });
    } catch (error) {
      console.error('Error getting training status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

