import axios from 'axios';
import type {
  StructuredLog,
  LogQueryParams,
  LogQueryResponse,
  RootCauseAnalysis,
  LogTemplate,
  TemplateMiningParams,
  TemplateMiningResult,
  TemplateMatchRequest,
  TemplateMatchResponse,
} from '../../types/logs/logAggregation.types';

// Dynamically determine API base URL based on current hostname
// This works for both local development and remote deployments (EC2, etc.)
function getApiBaseUrl(): string {
  // If explicitly set via environment variable, use it
  // if (import.meta.env.VITE_LOG_AGGREGATION_API_URL) {
  //   return import.meta.env.VITE_LOG_AGGREGATION_API_URL;
  // }

  // Get current hostname, protocol, and port from the browser
  const { protocol, hostname, port } = window.location;
  const currentPort = port || (protocol === 'https:' ? '443' : '80');
  
  // For local development (direct service access), use direct service port
  // Only use direct port if accessing on the service's actual port (3005) or its exposed port (31005)
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && 
      (currentPort === '3005' || currentPort === '31005')) {
    // Direct service access - use the port we're already on or the exposed port
    return currentPort === '3005' ? 'http://localhost:3005' : 'http://localhost:31005';
  }

  // For Docker deployments or when accessing through nginx gateway ports
  // Use nginx gateway (port 31000) which proxies to log-aggregation-service
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // When accessing via Docker-exposed frontend port (30011), use nginx gateway
    return 'http://localhost:31000';
  }

  // For remote deployments (EC2, etc.), use nginx gateway on the same host
  // Use port 31000 (nginx gateway) on the same hostname
  // Always use http (not https) for the API gateway
  const apiProtocol = protocol === 'https:' ? 'https:' : 'http:';
  const nginxPort = '31000';
  const apiUrl = `${apiProtocol}//${hostname}:${nginxPort}`;
  
  // Debug logging (remove in production if needed)
  console.log('[LogAggregationAPI] Detected hostname:', hostname, 'port:', currentPort, 'Using API URL:', apiUrl);
  
  return apiUrl;
}

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Log Querying
export const queryLogs = async (params: LogQueryParams): Promise<LogQueryResponse> => {
  const response = await api.get<LogQueryResponse>('/api/logs', { params });
  return response.data;
};

// Trace Correlation
export const getTrace = async (traceId: string): Promise<StructuredLog[]> => {
  const response = await api.get<StructuredLog[]>(`/api/traces/${traceId}`);
  return response.data;
};

export const getRootCause = async (traceId: string): Promise<RootCauseAnalysis> => {
  const response = await api.get<RootCauseAnalysis>(`/api/traces/${traceId}/root-cause`);
  return response.data;
};

// Templates
export const getTemplates = async (service?: string): Promise<LogTemplate[]> => {
  const params = service ? { service } : {};
  const response = await api.get<{ count: number; templates: LogTemplate[] }>('/api/templates', { params });
  return response.data.templates || [];
};

export const getTemplate = async (id: string): Promise<LogTemplate> => {
  const response = await api.get<LogTemplate>(`/api/templates/${id}`);
  return response.data;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await api.delete(`/api/templates/${id}`);
};

export const mineTemplates = async (params: TemplateMiningParams): Promise<TemplateMiningResult> => {
  const response = await api.post<{ success: boolean; result: TemplateMiningResult }>('/api/templates/mine', params);
  return response.data.result;
};

export const matchTemplate = async (request: TemplateMatchRequest): Promise<TemplateMatchResponse> => {
  const response = await api.post<TemplateMatchResponse>('/api/templates/match', request);
  return response.data;
};

// PII Detection (optional)
export const detectPII = async (text: string) => {
  const response = await api.post('/api/pii/detect', { text });
  return response.data;
};

export const redactPII = async (text: string) => {
  const response = await api.post('/api/pii/redact', { text });
  return response.data;
};