import { Request, Response } from 'express';
import { LogTemplateMiner } from '../services/templateMiner';
import { TemplateModel } from '../models/templateModel';
import fs from 'fs';
import path from 'path';
import { StructuredLog } from '../types/log.types';

export class TemplateController {
  private templateMiner: LogTemplateMiner;
  private templateModel: TemplateModel;

  constructor(templateMiner: LogTemplateMiner, templateModel: TemplateModel) {
    this.templateMiner = templateMiner;
    this.templateModel = templateModel;
  }

  /**
   * POST /api/templates/mine
   * Mine templates from logs
   */
  mineTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { service, minClusterSize, maxClusters, source } = req.body;

      let logs: string[] = [];

      // Get logs from different sources
      if (source === 'aggregated' || !source) {
        // Read from aggregated logs
        logs = await this.readAggregatedLogs();
      } else if (source === 'service' && service) {
        // Read from specific service logs
        logs = await this.readServiceLogs(service);
      } else if (req.body.logs && Array.isArray(req.body.logs)) {
        // Use provided logs
        logs = req.body.logs;
      } else {
        res.status(400).json({ 
          error: 'Invalid source. Provide "aggregated", "service" with service name, or logs array' 
        });
        return;
      }

      if (logs.length === 0) {
        res.status(404).json({ error: 'No logs found to mine' });
        return;
      }

      // Mine templates
      const result = await this.templateMiner.mineTemplates(
        logs,
        service,
        minClusterSize || 3,
        maxClusters || 50
      );

      // Save templates
      await this.templateModel.saveTemplates(result.templates);

      // Add templates to miner
      result.templates.forEach(template => {
        this.templateMiner.addTemplate(template);
      });

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error('Error mining templates:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * GET /api/templates
   * Get all templates
   */
  getTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { service } = req.query;

      let templates;
      if (service) {
        templates = this.templateModel.getTemplatesByService(service as string);
      } else {
        templates = this.templateModel.getAllTemplates();
      }

      res.json({
        count: templates.length,
        templates,
      });
    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * GET /api/templates/:id
   * Get template by ID
   */
  getTemplateById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const template = this.templateModel.getTemplateById(id);

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json(template);
    } catch (error) {
      console.error('Error getting template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * DELETE /api/templates/:id
   * Delete template
   */
  deleteTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.templateModel.deleteTemplate(id);

      if (!deleted) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * POST /api/templates/match
   * Match a log against templates
   */
  matchTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { log } = req.body;

      if (!log || typeof log !== 'string') {
        res.status(400).json({ error: 'Log string is required' });
        return;
      }

      const matchedTemplate = this.templateMiner.matchTemplate(log);

      res.json({
        matched: matchedTemplate !== null,
        template: matchedTemplate,
      });
    } catch (error) {
      console.error('Error matching template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Read aggregated logs
   */
  private async readAggregatedLogs(): Promise<string[]> {
    const aggregatedLogsPath = path.join(__dirname, '..', '..', 'aggregated-logs');
    const logs: string[] = [];

    if (!fs.existsSync(aggregatedLogsPath)) {
      return logs;
    }

    const files = fs.readdirSync(aggregatedLogsPath);
    
    for (const file of files) {
      if (file.endsWith('.jsonl')) {
        const filePath = path.join(aggregatedLogsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const log: StructuredLog = JSON.parse(line);
            logs.push(log.raw);
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }

    return logs;
  }

  /**
   * Read service logs
   */
  private async readServiceLogs(serviceName: string): Promise<string[]> {
    // Try to find service log file
    const possiblePaths = [
      path.join(__dirname, '..', '..', '..', `${serviceName}`, 'logs', `${serviceName}.log`),
      path.join(__dirname, '..', '..', '..', `${serviceName}-service`, 'logs', `${serviceName}-service.log`),
    ];

    for (const logPath of possiblePaths) {
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf-8');
        return content.split('\n').filter(line => line.trim());
      }
    }

    return [];
  }
}

