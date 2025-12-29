import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { requestContext } from './logger';

// Create axios instance with default config
const httpClient: AxiosInstance = axios.create();

// Add request interceptor to include X-Request-Id header from AsyncLocalStorage context
httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const context = requestContext.getStore();
  if (context?.requestId) {
    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers['X-Request-Id'] = context.requestId;
  }
  return config;
});

export { httpClient };

