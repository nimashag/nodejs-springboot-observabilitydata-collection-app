import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getSessionId } from './sessionManager';

/**
 * Generate a UUID v4 compatible string
 * Uses crypto.randomUUID() if available, otherwise falls back to a simple generator
 */
function generateRequestId(): string {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Create axios instance
const httpClient: AxiosInstance = axios.create();

// Add request interceptor to generate and include X-Request-Id and X-Session-Id headers
httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Generate a new request ID for each frontend request
  const requestId = generateRequestId();
  
  // Get or create session ID (persists across requests)
  const sessionId = getSessionId();
  
  // Ensure headers object exists
  if (!config.headers) {
    config.headers = {} as any;
  }
  
  // Add X-Request-Id header (unique per request)
  config.headers['X-Request-Id'] = requestId;
  
  // Add X-Session-Id header (same across all requests in this session)
  config.headers['X-Session-Id'] = sessionId;
  
  return config;
});

export default httpClient;

