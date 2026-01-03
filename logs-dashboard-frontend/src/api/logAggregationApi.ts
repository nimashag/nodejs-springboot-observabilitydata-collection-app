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
} from '../types/logAggregation.types';

const API_BASE_URL = import.meta.env.VITE_LOG_AGGREGATION_API_URL || 'http://localhost:3005';

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

