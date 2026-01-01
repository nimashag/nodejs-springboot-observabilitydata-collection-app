import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { requestContext } from './logger';

// Create axios instance with default config
const httpClient: AxiosInstance = axios.create();

// Add request interceptor to include X-Request-Id and X-Session-Id headers from AsyncLocalStorage context
httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const context = requestContext.getStore();
  if (context) {
    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {} as any;
    }
    // Propagate requestId if available
    if (context.requestId) {
      config.headers['X-Request-Id'] = context.requestId;
    }
    // Propagate sessionId if available
    if (context.sessionId) {
      config.headers['X-Session-Id'] = context.sessionId;
    }
  }
  return config;
});

export { httpClient };

