import { NlpManager } from 'node-nlp';
import * as natural from 'natural';
import { StructuredLog } from '../types/log.types';

export class MLBasedLogParser {
  private nlpManager: NlpManager;
  private tokenizer: natural.WordTokenizer;
  private traceIdPattern: RegExp;
  private spanIdPattern: RegExp;
  private requestIdPattern: RegExp;
  private isTrained: boolean = false;

  constructor() {
    this.nlpManager = new NlpManager({ languages: ['en'], forceNER: true });
    this.tokenizer = new natural.WordTokenizer();
    
    // Patterns for extracting IDs
    this.traceIdPattern = /(?:trace[_-]?id|traceId|trace_id)[=:]\s*([a-f0-9-]{8,})/i;
    this.spanIdPattern = /(?:span[_-]?id|spanId|span_id)[=:]\s*([a-f0-9-]{8,})/i;
    this.requestIdPattern = /(?:request[_-]?id|requestId|request_id|correlation[_-]?id)[=:]\s*([a-f0-9-]{8,})/i;
  }

  /**
   * Train the model on sample logs
   */
  async trainModel(sampleLogs: Array<{ raw: string; structured: StructuredLog }>): Promise<void> {
    console.log(`Training ML model on ${sampleLogs.length} sample logs...`);
    
    for (const sample of sampleLogs) {
      // Add document for pattern recognition
      this.nlpManager.addDocument('en', sample.raw, 'log_pattern');
      // Add answer with structured format
      this.nlpManager.addAnswer('en', 'log_pattern', JSON.stringify(sample.structured));
    }
    
    await this.nlpManager.train();
    this.isTrained = true;
    console.log('ML model training completed');
  }

  /**
   * Parse unstructured log into structured format
   */
  async parseLog(rawLog: string, serviceName: string, sourceFile?: string): Promise<StructuredLog> {
    // Extract trace ID (check multiple patterns)
    const traceId = this.extractTraceId(rawLog) || this.extractRequestId(rawLog);
    const spanId = this.extractSpanId(rawLog);
    const requestId = this.extractRequestId(rawLog);

    // Extract timestamp
    const timestamp = this.extractTimestamp(rawLog);

    // Extract log level
    const level = this.extractLevel(rawLog);

    // Extract event name
    const event = this.extractEvent(rawLog);

    // Extract metadata
    const metadata = this.extractMetadata(rawLog);

    // Use NLP for additional extraction if trained
    if (this.isTrained) {
      try {
        const result = await this.nlpManager.process('en', rawLog);
        if (result.answer) {
          try {
            const nlpExtracted = JSON.parse(result.answer);
            // Merge NLP extracted data with pattern-based extraction
            Object.assign(metadata, nlpExtracted.metadata || {});
          } catch (e) {
            // Ignore parse errors
          }
        }
      } catch (e) {
        // NLP processing failed, continue with pattern-based extraction
      }
    }

    return {
      timestamp: timestamp || new Date().toISOString(),
      service: serviceName,
      level: level || 'info',
      traceId,
      spanId,
      requestId,
      event,
      metadata,
      raw: rawLog,
      sourceFile,
    };
  }

  private extractTraceId(log: string): string | undefined {
    const match = log.match(this.traceIdPattern);
    return match ? match[1] : undefined;
  }

  private extractSpanId(log: string): string | undefined {
    const match = log.match(this.spanIdPattern);
    return match ? match[1] : undefined;
  }

  private extractRequestId(log: string): string | undefined {
    const match = log.match(this.requestIdPattern);
    return match ? match[1] : undefined;
  }

  private extractTimestamp(log: string): string | undefined {
    // ISO timestamp pattern
    const isoPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/;
    const match = log.match(isoPattern);
    if (match) return match[0];

    // Try other common formats
    const datePattern = /\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}(\.\d+)?/;
    const dateMatch = log.match(datePattern);
    if (dateMatch) {
      try {
        return new Date(dateMatch[0]).toISOString();
      } catch (e) {
        return undefined;
      }
    }

    return undefined;
  }

  private extractLevel(log: string): string | undefined {
    const levels = ['error', 'warn', 'info', 'debug', 'trace', 'fatal'];
    const lowerLog = log.toLowerCase();

    // Check for explicit level markers
    for (const level of levels) {
      if (
        lowerLog.includes(`lvl=${level}`) ||
        lowerLog.includes(`level=${level}`) ||
        lowerLog.includes(`"level":"${level}"`) ||
        lowerLog.includes(`'level':'${level}'`) ||
        lowerLog.match(new RegExp(`\\[${level}\\]`, 'i'))
      ) {
        return level;
      }
    }

    // Check for log level keywords
    if (lowerLog.includes('error') || lowerLog.includes('exception')) return 'error';
    if (lowerLog.includes('warn')) return 'warn';
    if (lowerLog.includes('debug')) return 'debug';
    if (lowerLog.includes('trace')) return 'trace';

    return undefined;
  }

  private extractEvent(log: string): string {
    // Extract event name from patterns like "ev=...", "event=...", "evt=..."
    const eventPatterns = [
      /(?:ev|event|evt)[=:]\s*([^\s|"']+)/i,
      /"event":\s*"([^"]+)"/i,
      /'event':\s*'([^']+)'/i,
    ];

    for (const pattern of eventPatterns) {
      const match = log.match(pattern);
      if (match) return match[1];
    }

    // Try to extract from common log patterns
    const httpPattern = /(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)/i;
    const httpMatch = log.match(httpPattern);
    if (httpMatch) {
      return `http.${httpMatch[1].toLowerCase()}.${httpMatch[2]}`;
    }

    return 'unknown';
  }

  private extractMetadata(log: string): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Extract JSON context (ctx={...})
    const jsonPatterns = [
      /ctx=(\{.*?\})/,
      /"context":\s*(\{.*?\})/,
      /'context':\s*(\{.*?\})/,
      /meta=(\{.*?\})/,
      /metadata=(\{.*?\})/,
    ];

    for (const pattern of jsonPatterns) {
      const match = log.match(pattern);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          Object.assign(metadata, parsed);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    // Extract key-value pairs (key=value format)
    const kvPattern = /(\w+)=([^\s|"']+)/g;
    let match;
    const excludedKeys = ['ev', 'event', 'evt', 'lvl', 'level', 'ts', 'timestamp', 'ctx', 'context'];
    
    while ((match = kvPattern.exec(log)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2];
      
      if (!excludedKeys.includes(key) && !metadata[key]) {
        // Try to parse as number or boolean
        if (/^\d+$/.test(value)) {
          metadata[key] = parseInt(value, 10);
        } else if (/^\d+\.\d+$/.test(value)) {
          metadata[key] = parseFloat(value);
        } else if (value === 'true' || value === 'false') {
          metadata[key] = value === 'true';
        } else {
          metadata[key] = value;
        }
      }
    }

    // Extract HTTP status codes
    const statusMatch = log.match(/status[=:]\s*(\d{3})/i);
    if (statusMatch) {
      metadata.statusCode = parseInt(statusMatch[1], 10);
    }

    // Extract duration
    const durationMatch = log.match(/duration[=:]\s*([\d.]+)/i);
    if (durationMatch) {
      metadata.duration = parseFloat(durationMatch[1]);
    }

    // Extract method and path
    const methodMatch = log.match(/method[=:]\s*([A-Z]+)/i);
    if (methodMatch) {
      metadata.method = methodMatch[1];
    }

    const pathMatch = log.match(/path[=:]\s*([^\s|]+)/i);
    if (pathMatch) {
      metadata.path = pathMatch[1];
    }

    return metadata;
  }

  /**
   * Check if model is trained
   */
  isModelTrained(): boolean {
    return this.isTrained;
  }
}

