import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { MLBasedLogParser } from './logParser';
import { StructuredLog } from '../types/log.types';

export class LogCollector {
  private parser: MLBasedLogParser;
  private aggregatedLogPath: string;
  private serviceLogPaths: Map<string, string>;
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private processedFiles: Set<string> = new Set();

  constructor(parser: MLBasedLogParser) {
    this.parser = parser;
    this.aggregatedLogPath = path.join(__dirname, '..', '..', 'aggregated-logs');
    this.serviceLogPaths = new Map();

    // Ensure aggregated logs directory exists
    if (!fs.existsSync(this.aggregatedLogPath)) {
      fs.mkdirSync(this.aggregatedLogPath, { recursive: true });
    }
  }

  /**
   * Initialize log collection from environment variables or defaults
   */
  async initialize(): Promise<void> {
    // Load service log paths from environment or use defaults
    const services = [
      { name: 'delivery-service', path: process.env.DELIVERY_SERVICE_LOG_PATH || '../delivery-service/logs' },
      { name: 'orders-service', path: process.env.ORDERS_SERVICE_LOG_PATH || '../orders-service/logs' },
      { name: 'restaurants-service', path: process.env.RESTAURANTS_SERVICE_LOG_PATH || '../restaurants-service/logs' },
      { name: 'users-service', path: process.env.USERS_SERVICE_LOG_PATH || '../users-service/logs' },
    ];

    // Get the log-aggregation-service root directory
    // __dirname will be either src/services (source) or dist/services (compiled)
    const serviceRoot = path.resolve(__dirname, '..', '..');
    
    for (const service of services) {
      // Resolve path: service.path is relative to log-aggregation-service root (e.g., ../delivery-service/logs)
      // So we resolve from serviceRoot
      let absolutePath = path.resolve(serviceRoot, service.path);
      
      // If path doesn't exist, try resolving from project root (parent of log-aggregation-service)
      if (!fs.existsSync(absolutePath)) {
        const projectRoot = path.resolve(serviceRoot, '..');
        const serviceName = service.path.replace(/^\.\.\//, '').split('/')[0];
        absolutePath = path.resolve(projectRoot, serviceName, 'logs');
      }
      
      if (fs.existsSync(absolutePath)) {
        this.serviceLogPaths.set(service.name, absolutePath);
        console.log(`✓ Registered log path for ${service.name}: ${absolutePath}`);
      } else {
        console.warn(`✗ Log path not found for ${service.name}: ${absolutePath}`);
        console.warn(`  Tried: ${path.resolve(serviceRoot, service.path)}`);
      }
    }

    // Start watching all service log files
    for (const [serviceName, logPath] of this.serviceLogPaths) {
      await this.watchServiceLogs(serviceName, logPath);
    }

    console.log(`Log collection initialized for ${this.serviceLogPaths.size} services`);
  }

  /**
   * Watch log files for a specific service
   */
  private async watchServiceLogs(serviceName: string, logDir: string): Promise<void> {
    const pattern = path.join(logDir, '*.log');
    
    const watcher = chokidar.watch(pattern, {
      ignored: /^\./,
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100,
      },
    });

    watcher
      .on('add', (filePath: string) => {
        console.log(`New log file detected: ${filePath}`);
        this.processLogFile(serviceName, filePath);
      })
      .on('change', (filePath: string) => {
        // Only process new lines
        this.processLogFile(serviceName, filePath, true);
      })
      .on('error', (error: Error) => {
        console.error(`Error watching ${serviceName} logs:`, error);
      });

    this.watchers.set(serviceName, watcher);
    console.log(`Started watching logs for ${serviceName} at ${pattern}`);
  }

  /**
   * Process a log file
   */
  private async processLogFile(
    serviceName: string,
    filePath: string,
    incremental: boolean = false
  ): Promise<void> {
    try {
      const fileKey = `${serviceName}:${filePath}`;
      
      if (!fs.existsSync(filePath)) {
        return;
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // Track file position for incremental reading
      const positionKey = `${fileKey}:position`;
      let lastPosition = 0;

      if (incremental && this.processedFiles.has(positionKey)) {
        // Read last position from a simple tracking mechanism
        // In production, use a proper database or cache
        lastPosition = fileSize > 0 ? fileSize - 1000 : 0; // Read last 1KB if file changed
      }

      // Read file content
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n');

      // Process each line
      let processedCount = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) continue;

        // Skip if we've already processed this line (simple check)
        if (incremental && i < Math.floor(lines.length * 0.9)) {
          continue; // Skip older lines in incremental mode
        }

        try {
          const structured = await this.parser.parseLog(line, serviceName, path.basename(filePath));
          await this.writeAggregatedLog(structured);
          processedCount++;
        } catch (error) {
          console.error(`Error parsing log line from ${serviceName}:`, error);
          // Write raw log even if parsing fails
          const fallbackLog: StructuredLog = {
            timestamp: new Date().toISOString(),
            service: serviceName,
            level: 'unknown',
            event: 'parse_error',
            metadata: { error: String(error) },
            raw: line,
            sourceFile: path.basename(filePath),
          };
          await this.writeAggregatedLog(fallbackLog);
        }
      }

      if (processedCount > 0) {
        console.log(`Processed ${processedCount} log lines from ${serviceName}:${path.basename(filePath)}`);
        this.processedFiles.add(fileKey);
      }
    } catch (error) {
      console.error(`Error processing log file ${filePath}:`, error);
    }
  }

  /**
   * Write structured log to aggregated log file (JSONL format)
   */
  private async writeAggregatedLog(log: StructuredLog): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(this.aggregatedLogPath, `aggregated-${date}.jsonl`);

    const logLine = JSON.stringify(log) + '\n';
    
    try {
      fs.appendFileSync(filePath, logLine, 'utf-8');
    } catch (error) {
      console.error(`Error writing aggregated log:`, error);
    }
  }

  /**
   * Stop watching logs
   */
  async stop(): Promise<void> {
    for (const [serviceName, watcher] of this.watchers) {
      await watcher.close();
      console.log(`Stopped watching logs for ${serviceName}`);
    }
    this.watchers.clear();
  }

  /**
   * Get list of registered services
   */
  getRegisteredServices(): string[] {
    return Array.from(this.serviceLogPaths.keys());
  }
}

