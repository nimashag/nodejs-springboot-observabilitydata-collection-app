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
  piiRedacted?: boolean;
  piiDetected?: string[];
}

export interface TraceSpan {
  traceId: string;
  spanId?: string;
  service: string;
  timestamp: string;
  duration?: number;
  parentSpanId?: string;
}

export interface RootCauseAnalysis {
  traceId: string;
  rootCause: string;
  errorLogs: StructuredLog[];
  timeline: TraceSpan[];
}

export interface LogQueryParams {
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

export interface LogQueryResponse {
  count: number;
  logs: StructuredLog[];
  query: LogQueryParams;
}

export interface LogTemplate {
  id: string;
  template: string;
  pattern: string;
  parameterizedLog: string;
  exampleLogs: string[];
  frequency: number;
  service?: string;
  eventType?: string;
  lastSeen: string;
  createdAt: string;
  metadata?: {
    avgLength?: number;
    parameterCount?: number;
    parameterTypes?: Record<string, string>;
  };
}

export interface TemplateMiningParams {
  source?: 'aggregated' | 'service';
  service?: string;
  logs?: string[];
  minClusterSize?: number;
  maxClusters?: number;
}

export interface TemplateMiningResult {
  templates: LogTemplate[];
  totalLogs: number;
  coverage: number;
  miningTime: number;
  statistics: {
    totalTemplates: number;
    avgTemplateFrequency: number;
  };
}

export interface TemplateMatchRequest {
  log: string;
}

export interface TemplateMatchResponse {
  matched: boolean;
  template?: LogTemplate;
}

