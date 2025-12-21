export interface StructuredLog {
  timestamp: string;
  service: string;
  level: string;
  traceId?: string;
  spanId?: string;
  requestId?: string;
  event: string;
  metadata: Record<string, any>;
  raw: string;
  sourceFile?: string;
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
  limit?: number;
  offset?: number;
}

