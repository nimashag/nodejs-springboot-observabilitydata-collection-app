export interface StructuredLog {
  timestamp: string;
  service: string;
  level: string;
  traceId?: string;
  spanId?: string;
  requestId?: string;
  sessionId?: string;
  event: string;
  metadata: Record<string, any>;
  raw: string;
  sourceFile?: string;
  piiRedacted?: boolean; // Flag indicating if PII was redacted
  piiDetected?: string[]; // Types of PII detected (for audit)
}

export interface TraceSpan {
  traceId: string;
  spanId?: string;
  service: string;
  timestamp: string;
  duration?: number;
  parentSpanId?: string;
  logs: StructuredLog[];
}

export interface RootCauseAnalysis {
  traceId: string;
  rootCause: StructuredLog | null;
  errorChain: StructuredLog[];
  affectedServices: string[];
  timeline: TraceSpan[];
}

export interface LogQuery {
  traceId?: string;
  service?: string;
  level?: string;
  startTime?: string;
  endTime?: string;
  event?: string;
  templateId?: string;
  piiRedacted?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Log Template - Represents a parameterized log pattern
 */
export interface LogTemplate {
  id: string;
  template: string; // Parameterized template (e.g., "GET /api/orders/<ID>")
  pattern: string; // Regex pattern for matching
  parameterizedLog: string; // Example parameterized log
  exampleLogs: string[]; // Sample logs that match this template
  frequency: number; // How many logs match this template
  service?: string; // Service name if template is service-specific
  eventType?: string; // Inferred event type
  lastSeen: string; // ISO timestamp of last occurrence
  createdAt: string; // ISO timestamp of template creation
  metadata?: {
    avgLength?: number;
    parameterCount?: number;
    parameterTypes?: Record<string, string>; // e.g., { "ID": "uuid", "NUM": "number" }
  };
}

/**
 * Template Mining Result
 */
export interface TemplateMiningResult {
  templates: LogTemplate[];
  totalLogs: number;
  coverage: number; // Percentage of logs covered by templates
  miningTime: number; // Time taken in milliseconds
  statistics: {
    totalTemplates: number;
    avgTemplateFrequency: number;
    mostCommonTemplate?: LogTemplate;
  };
}

