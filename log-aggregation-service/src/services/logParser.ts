import { NlpManager } from 'node-nlp';
import * as natural from 'natural';
import { StructuredLog } from '../types/log.types';
import { LogTemplateMiner } from './templateMiner';
import { LogTemplate } from '../types/log.types';
import { PIIDetector } from './piiDetector';

export class MLBasedLogParser {
  private nlpManager: NlpManager;
  private tokenizer: natural.WordTokenizer;
  private traceIdPattern: RegExp;
  private spanIdPattern: RegExp;
  private requestIdPattern: RegExp;
  private sessionIdPattern: RegExp;
  private isTrained: boolean = false;
  private templateMiner?: LogTemplateMiner;
  private piiDetector?: PIIDetector;

  constructor(templateMiner?: LogTemplateMiner, piiDetector?: PIIDetector) {
    this.nlpManager = new NlpManager({ languages: ['en'], forceNER: true });
    this.tokenizer = new natural.WordTokenizer();
    this.templateMiner = templateMiner;
    this.piiDetector = piiDetector;
    
    // Patterns for extracting IDs
    this.traceIdPattern = /(?:trace[_-]?id|traceId|trace_id)[=:]\s*([a-f0-9-]{8,})/i;
    this.spanIdPattern = /(?:span[_-]?id|spanId|span_id)[=:]\s*([a-f0-9-]{8,})/i;
    this.requestIdPattern = /(?:request[_-]?id|requestId|request_id|correlation[_-]?id)[=:]\s*([a-f0-9-]{8,})/i;
    this.sessionIdPattern = /(?:session[_-]?id|sessionId|session_id)[=:]\s*([a-zA-Z0-9-]+)/i;
  }

  /**
   * Set template miner for enhanced parsing
   */
  setTemplateMiner(templateMiner: LogTemplateMiner): void {
    this.templateMiner = templateMiner;
  }

  /**
   * Set PII detector for privacy protection
   */
  setPIIDetector(piiDetector: PIIDetector): void {
    this.piiDetector = piiDetector;
  }

  /**
   * Get matched template for a log (if template miner is available)
   */
  getMatchedTemplate(log: string): LogTemplate | null {
    if (!this.templateMiner) {
      return null;
    }
    return this.templateMiner.matchTemplate(log);
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
    const sessionId = this.extractSessionId(rawLog);

    // Extract timestamp
    const timestamp = this.extractTimestamp(rawLog);

    // Extract log level
    const level = this.extractLevel(rawLog);

    // Extract event name
    const event = this.extractEvent(rawLog);

    // Extract metadata
    const metadata = this.extractMetadata(rawLog);

    // Normalize: Promote traceId, requestId, spanId, sessionId from metadata to top level if they exist
    // This ensures consistent structure across all services
    let normalizedTraceId = traceId;
    let normalizedSpanId = spanId;
    let normalizedRequestId = requestId;
    let normalizedSessionId = sessionId;

    // Check metadata for these fields and promote them (handle both camelCase and lowercase)
    // Also remove any lowercase duplicates to keep metadata clean
    
    // Check traceId
    if (!normalizedTraceId) {
      if (metadata.traceId) {
        normalizedTraceId = metadata.traceId;
      } else if (metadata.traceid) {
        normalizedTraceId = metadata.traceid;
      }
    }
    // Always remove from metadata to avoid duplication
    delete metadata.traceId;
    delete metadata.traceid;
    
    // Check requestId
    if (!normalizedRequestId) {
      if (metadata.requestId) {
        normalizedRequestId = metadata.requestId;
      } else if (metadata.requestid) {
        normalizedRequestId = metadata.requestid;
      }
    }
    // Always remove from metadata to avoid duplication
    delete metadata.requestId;
    delete metadata.requestid;
    
    // Check spanId
    if (!normalizedSpanId) {
      if (metadata.spanId) {
        normalizedSpanId = metadata.spanId;
      } else if (metadata.spanid) {
        normalizedSpanId = metadata.spanid;
      }
    }
    // Always remove from metadata to avoid duplication
    delete metadata.spanId;
    delete metadata.spanid;
    
    // Check sessionId
    if (!normalizedSessionId) {
      if (metadata.sessionId) {
        normalizedSessionId = metadata.sessionId;
      } else if (metadata.sessionid) {
        normalizedSessionId = metadata.sessionid;
      }
    }
    // Always remove from metadata to avoid duplication
    delete metadata.sessionId;
    delete metadata.sessionid;

    // Try to match against templates for enhanced parsing
    if (this.templateMiner) {
      const matchedTemplate = this.templateMiner.matchTemplate(rawLog);
      if (matchedTemplate) {
        // Use template information to enhance parsing
        if (matchedTemplate.eventType && matchedTemplate.eventType !== 'unknown') {
          metadata.templateEventType = matchedTemplate.eventType;
        }
        if (matchedTemplate.metadata?.parameterCount) {
          metadata.templateParameterCount = matchedTemplate.metadata.parameterCount;
        }
        metadata.matchedTemplateId = matchedTemplate.id;
        
        // Debug logging
        if (process.env.DEBUG_TEMPLATE_MATCHING === 'true') {
          console.log(`[LogParser] Matched template ${matchedTemplate.id} for log from ${serviceName}`);
        }
      } else if (process.env.DEBUG_TEMPLATE_MATCHING === 'true') {
        console.log(`[LogParser] No template matched for log from ${serviceName}: ${rawLog.substring(0, 80)}...`);
      }
    }

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

    // Build normalized structured log with consistent fields in proper order
    const structuredLog: StructuredLog = {
      timestamp: timestamp || new Date().toISOString(),
      service: serviceName,
      level: level || 'info',
      event,
      metadata,
      raw: rawLog,
    };

    // Add optional ID fields in consistent order (before sourceFile)
    if (normalizedTraceId) {
      structuredLog.traceId = normalizedTraceId;
    }
    if (normalizedSpanId) {
      structuredLog.spanId = normalizedSpanId;
    }
    if (normalizedRequestId) {
      structuredLog.requestId = normalizedRequestId;
    }
    if (normalizedSessionId) {
      structuredLog.sessionId = normalizedSessionId;
    }

    // Add sourceFile last if present
    if (sourceFile) {
      structuredLog.sourceFile = sourceFile;
    }

    // Apply PII redaction if detector is available
    if (this.piiDetector) {
      return this.piiDetector.redactStructuredLog(structuredLog);
    }

    return structuredLog;
  }

  private extractTraceId(log: string): string | undefined {
    // First, try to parse as JSON and extract traceId
    try {
      const jsonMatch = log.trim().match(/^\{.*\}$/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.meta && parsed.meta.traceId) {
          return parsed.meta.traceId;
        }
        if (parsed.traceId) {
          return parsed.traceId;
        }
      }
    } catch (e) {
      // Not valid JSON, continue with pattern matching
    }

    const match = log.match(this.traceIdPattern);
    return match ? match[1] : undefined;
  }

  private extractSpanId(log: string): string | undefined {
    // First, try to parse as JSON and extract spanId
    try {
      const jsonMatch = log.trim().match(/^\{.*\}$/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.meta && parsed.meta.spanId) {
          return parsed.meta.spanId;
        }
        if (parsed.spanId) {
          return parsed.spanId;
        }
      }
    } catch (e) {
      // Not valid JSON, continue with pattern matching
    }

    const match = log.match(this.spanIdPattern);
    return match ? match[1] : undefined;
  }

  private extractRequestId(log: string): string | undefined {
    // First, try to parse as JSON and extract requestId
    try {
      const jsonMatch = log.trim().match(/^\{.*\}$/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.meta && parsed.meta.requestId) {
          return parsed.meta.requestId;
        }
        if (parsed.requestId) {
          return parsed.requestId;
        }
      }
    } catch (e) {
      // Not valid JSON, continue with pattern matching
    }

    const match = log.match(this.requestIdPattern);
    return match ? match[1] : undefined;
  }

  private extractSessionId(log: string): string | undefined {
    // First, try to parse as JSON and extract sessionId
    try {
      const jsonMatch = log.trim().match(/^\{.*\}$/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.meta && parsed.meta.sessionId) {
          return parsed.meta.sessionId;
        }
        if (parsed.sessionId) {
          return parsed.sessionId;
        }
      }
    } catch (e) {
      // Not valid JSON, continue with pattern matching
    }

    // Try pattern matching - handle both key=value format and JSON format
    const match = log.match(this.sessionIdPattern);
    if (match && match[1]) {
      const sessionId = match[1].trim();
      if (sessionId && sessionId.length > 0) {
        return sessionId;
      }
    }

    // Also try extracting from key-value format directly (for users-service format: sessionId=VALUE |)
    // This is a more explicit pattern for the users-service log format
    const kvMatch = log.match(/sessionId[=:]\s*([a-zA-Z0-9-]+)(?:\s|\||$)/i);
    if (kvMatch && kvMatch[1]) {
      const sessionId = kvMatch[1].trim();
      if (sessionId && sessionId.length > 0) {
        return sessionId;
      }
    }

    // Try a more permissive pattern that captures until space, pipe, or end of line
    const permissiveMatch = log.match(/sessionId[=:]\s*([^\s|]+)/i);
    if (permissiveMatch && permissiveMatch[1]) {
      const sessionId = permissiveMatch[1].trim();
      if (sessionId && sessionId.length > 0) {
        return sessionId;
      }
    }

    return undefined;
  }

  private extractTimestamp(log: string): string | undefined {
    // First, try to parse as JSON and extract timestamp
    try {
      const jsonMatch = log.trim().match(/^\{.*\}$/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.time) return parsed.time;
        if (parsed.timestamp) return parsed.timestamp;
        if (parsed.ts) {
          // Handle both ISO strings and numeric timestamps
          if (typeof parsed.ts === 'string') return parsed.ts;
          if (typeof parsed.ts === 'number') return new Date(parsed.ts).toISOString();
        }
      }
    } catch (e) {
      // Not valid JSON, continue with pattern matching
    }

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

    // Try ts= pattern
    const tsPattern = /ts[=:]\s*([^\s|]+)/i;
    const tsMatch = log.match(tsPattern);
    if (tsMatch) {
      try {
        return new Date(tsMatch[1]).toISOString();
      } catch (e) {
        return undefined;
      }
    }

    return undefined;
  }

  private extractLevel(log: string): string | undefined {
    const levels = ['error', 'warn', 'info', 'debug', 'trace', 'fatal'];
    
    // First, try to parse as JSON and extract level
    try {
      const jsonMatch = log.trim().match(/^\{.*\}$/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.lvl) {
          const level = parsed.lvl.toLowerCase();
          if (levels.includes(level)) return level;
        }
        if (parsed.level) {
          const level = parsed.level.toLowerCase();
          if (levels.includes(level)) return level;
        }
      }
    } catch (e) {
      // Not valid JSON, continue with pattern matching
    }

    const lowerLog = log.toLowerCase();

    // Check for explicit level markers
    for (const level of levels) {
      if (
        lowerLog.includes(`lvl=${level}`) ||
        lowerLog.includes(`level=${level}`) ||
        lowerLog.includes(`"level":"${level}"`) ||
        lowerLog.includes(`'level':'${level}'`) ||
        lowerLog.includes(`"lvl":"${level}"`) ||
        lowerLog.includes(`'lvl':'${level}'`) ||
        lowerLog.match(new RegExp(`\\[${level}\\]`, 'i'))
      ) {
        return level;
      }
    }

    // Check for log level keywords (but be more careful to avoid false positives)
    if (lowerLog.match(/\berror\b/) || lowerLog.includes('exception')) return 'error';
    if (lowerLog.match(/\bwarn\b/)) return 'warn';
    if (lowerLog.match(/\binfo\b/)) return 'info';
    if (lowerLog.match(/\bdebug\b/)) return 'debug';
    if (lowerLog.match(/\btrace\b/)) return 'trace';
    if (lowerLog.match(/\bfatal\b/)) return 'fatal';

    return undefined;
  }

  private extractEvent(log: string): string {
    // First, try to parse as JSON (for services like orders-service that use JSON logs)
    try {
      const jsonMatch = log.trim().match(/^\{.*\}$/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Check for common event field names in JSON
        if (parsed.msg) return parsed.msg;
        if (parsed.event) return parsed.event;
        if (parsed.action) return parsed.action;
        if (parsed.evt) return parsed.evt;
        if (parsed.ev) return parsed.ev;
        if (parsed.message) return parsed.message;
      }
    } catch (e) {
      // Not valid JSON, continue with pattern matching
    }

    // Extract event name from key-value patterns
    // Support: action=, event=, ev=, evt=, msg=, message=
    const eventPatterns = [
      /(?:action|event|ev|evt|msg|message)[=:]\s*([^\s|"']+)/i,
      /"event":\s*"([^"]+)"/i,
      /'event':\s*'([^']+)'/i,
      /"action":\s*"([^"]+)"/i,
      /'action':\s*'([^']+)'/i,
      /"msg":\s*"([^"]+)"/i,
      /'msg':\s*'([^']+)'/i,
      /"message":\s*"([^"]+)"/i,
      /'message':\s*'([^']+)'/i,
    ];

    for (const pattern of eventPatterns) {
      const match = log.match(pattern);
      if (match && match[1] && match[1] !== 'unknown') {
        return match[1];
      }
    }

    // Try to extract from common log patterns (HTTP methods, etc.)
    const httpPattern = /(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)/i;
    const httpMatch = log.match(httpPattern);
    if (httpMatch) {
      return `http.${httpMatch[1].toLowerCase()}.${httpMatch[2]}`;
    }

    // Try to extract from class/method patterns (Java logs)
    const javaMethodPattern = /(\w+\.\w+)\s*-\s*(.+)/;
    const javaMatch = log.match(javaMethodPattern);
    if (javaMatch && javaMatch[2]) {
      // Try to extract action from the message part
      const actionMatch = javaMatch[2].match(/action=([^\s|]+)/);
      if (actionMatch) return actionMatch[1];
    }

    return 'unknown';
  }

  private extractMetadata(log: string): Record<string, any> {
    const metadata: Record<string, any> = {};

    // First, try to parse as complete JSON log (for services like orders-service)
    try {
      const jsonMatch = log.trim().match(/^\{.*\}$/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Extract metadata from JSON structure
        if (parsed.meta && typeof parsed.meta === 'object') {
          Object.assign(metadata, parsed.meta);
        }
        // Also include other fields that aren't event-related
        const eventFields = ['msg', 'event', 'action', 'evt', 'ev', 'message', 'lvl', 'level', 'svc', 'service', 'time', 'timestamp'];
        for (const [key, value] of Object.entries(parsed)) {
          if (!eventFields.includes(key.toLowerCase()) && key !== 'meta') {
            metadata[key] = value;
          }
        }
        return metadata;
      }
    } catch (e) {
      // Not valid JSON, continue with pattern matching
    }

    // Helper function to extract balanced JSON object
    const extractBalancedJson = (str: string, startIndex: number): string | null => {
      if (str[startIndex] !== '{') return null;
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      
      for (let i = startIndex; i < str.length; i++) {
        const char = str[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') depth++;
          if (char === '}') {
            depth--;
            if (depth === 0) {
              return str.substring(startIndex, i + 1);
            }
          }
        }
      }
      return null;
    };

    // Extract JSON context (ctx={...}, payload={...}, data={...})
    const jsonFieldPatterns = [
      /ctx=(\{)/,
      /data=(\{)/,
      /"context":\s*(\{)/,
      /'context':\s*(\{)/,
      /"data":\s*(\{)/,
      /'data':\s*(\{)/,
      /meta=(\{)/,
      /metadata=(\{)/,
    ];

    for (const pattern of jsonFieldPatterns) {
      const match = log.match(pattern);
      if (match && match.index !== undefined) {
        const jsonStart = match.index + match[0].length - 1; // Position of {
        const jsonStr = extractBalancedJson(log, jsonStart);
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr);
            Object.assign(metadata, parsed);
            break; // Only extract from first successful match
          } catch (e) {
            // Ignore parse errors - might be non-JSON format
          }
        }
      }
    }

    // Handle payload={...} format (could be JSON or key-value pairs like users-service)
    const payloadPattern = /payload=(\{)/;
    const payloadMatch = log.match(payloadPattern);
    if (payloadMatch && payloadMatch.index !== undefined) {
      const jsonStart = payloadMatch.index + payloadMatch[0].length - 1; // Position of {
      const jsonStr = extractBalancedJson(log, jsonStart);
      if (jsonStr) {
        try {
          // First try JSON parsing
          const parsed = JSON.parse(jsonStr);
          Object.assign(metadata, parsed);
        } catch (e) {
          // If not JSON, parse as key-value pairs (users-service format)
          const payloadContent = jsonStr.slice(1, -1); // Remove { }
          const kvPairs = payloadContent.split(',').map(pair => pair.trim());
          for (const pair of kvPairs) {
            const kvMatch = pair.match(/(\w+)=(.+)/);
            if (kvMatch) {
              const key = kvMatch[1].trim();
              let value: any = kvMatch[2].trim();
              // Try to parse as number or boolean
              if (/^\d+$/.test(value)) {
                value = parseInt(value, 10);
              } else if (/^\d+\.\d+$/.test(value)) {
                value = parseFloat(value);
              } else if (value === 'true' || value === 'false') {
                value = value === 'true';
              }
              metadata[key] = value;
            }
          }
        }
      }
    }

    // Extract key-value pairs (key=value format)
    // Support both space-separated and pipe-separated formats
    const kvPattern = /(\w+)=([^\s|"']+)/g;
    let match;
    const excludedKeys = ['ev', 'event', 'evt', 'action', 'msg', 'message', 'lvl', 'level', 'ts', 'timestamp', 'ctx', 'context', 'svc', 'service', 'data', 'payload', 'meta', 'metadata', 'requestid', 'sessionid', 'traceid', 'spanid'];
    
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

    // Extract duration (support both durationMs and duration)
    const durationMatch = log.match(/duration(?:Ms)?[=:]\s*([\d.]+)/i);
    if (durationMatch) {
      metadata.duration = parseFloat(durationMatch[1]);
      metadata.durationMs = parseFloat(durationMatch[1]);
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

    // Extract URI
    const uriMatch = log.match(/uri[=:]\s*([^\s|]+)/i);
    if (uriMatch) {
      metadata.uri = uriMatch[1];
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

