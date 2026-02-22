/**
 * ML Client - Bridge between Node.js Alert Agent and Python ML Service
 */

import * as http from 'http';

export interface MLPredictionRequest {
  service_name: string;
  alert_name: string;
  severity: string;
  error_count?: number;
  response_time?: number;
  cpu_usage?: number;
  memory_usage?: number;
  traffic_rate?: number;
  [key: string]: any;
}

export interface PriorityPrediction {
  priority_level: string;
  priority_score: number;
  confidence: number;
  explanation: string;
}

export interface TTRPrediction {
  ttr_minutes: number;
  ttr_category: string;
  confidence: number;
  sla_breach_risk: string;
}

export interface MLPredictionResponse {
  success: boolean;
  predictions?: {
    suppressed: boolean;
    priority: PriorityPrediction;
    ttr: TTRPrediction;
    email_sent: boolean;
  };
  error?: string;
  timestamp: string;
}

export interface MLServiceHealth {
  status: string;
  service: string;
  timestamp: string;
  models_loaded: boolean;
  stats: {
    requests_processed: number;
    errors: number;
    start_time: string;
  };
}

export class MLClient {
  private mlServiceUrl: string;
  private mlServicePort: number;
  private timeout: number;
  private enabled: boolean;
  private stats: {
    requests_sent: number;
    requests_succeeded: number;
    requests_failed: number;
    last_error?: string;
  };

  constructor(
    mlServiceUrl: string = 'localhost',
    mlServicePort: number = 5000,
    timeout: number = 5000,
    enabled: boolean = true
  ) {
    this.mlServiceUrl = mlServiceUrl;
    this.mlServicePort = mlServicePort;
    this.timeout = timeout;
    this.enabled = enabled;
    this.stats = {
      requests_sent: 0,
      requests_succeeded: 0,
      requests_failed: 0
    };
  }

  /**
   * Check if ML service is healthy
   */
  async checkHealth(): Promise<MLServiceHealth | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await this.makeRequest('/health', 'GET');
      return JSON.parse(response);
    } catch (error) {
      console.error('[ML Client] Health check failed:', error);
      return null;
    }
  }

  /**
   * Get ML predictions for an alert
   */
  async predict(alertData: MLPredictionRequest): Promise<MLPredictionResponse | null> {
    if (!this.enabled) {
      console.log('[ML Client] ML predictions disabled');
      return null;
    }

    this.stats.requests_sent++;

    try {
      const response = await this.makeRequest('/predict', 'POST', alertData);
      const result: MLPredictionResponse = JSON.parse(response);
      
      if (result.success) {
        this.stats.requests_succeeded++;
      } else {
        this.stats.requests_failed++;
        this.stats.last_error = result.error;
      }

      return result;
    } catch (error) {
      this.stats.requests_failed++;
      this.stats.last_error = error instanceof Error ? error.message : String(error);
      console.error('[ML Client] Prediction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get priority prediction only
   */
  async predictPriority(alertData: MLPredictionRequest): Promise<PriorityPrediction | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await this.makeRequest('/predict/priority', 'POST', alertData);
      const result = JSON.parse(response);
      return result.success ? result.priority : null;
    } catch (error) {
      console.error('[ML Client] Priority prediction failed:', error);
      return null;
    }
  }

  /**
   * Get TTR prediction only
   */
  async predictTTR(alertData: MLPredictionRequest): Promise<TTRPrediction | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await this.makeRequest('/predict/ttr', 'POST', alertData);
      const result = JSON.parse(response);
      return result.success ? result.ttr : null;
    } catch (error) {
      console.error('[ML Client] TTR prediction failed:', error);
      return null;
    }
  }

  /**
   * Get ML service statistics
   */
  async getStats(): Promise<any> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await this.makeRequest('/stats', 'GET');
      return JSON.parse(response);
    } catch (error) {
      console.error('[ML Client] Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Get ML models information
   */
  async getModelsInfo(): Promise<any> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await this.makeRequest('/models/info', 'GET');
      return JSON.parse(response);
    } catch (error) {
      console.error('[ML Client] Failed to get models info:', error);
      return null;
    }
  }

  /**
   * Get client statistics
   */
  getClientStats() {
    return {
      ...this.stats,
      enabled: this.enabled,
      ml_service_url: `http://${this.mlServiceUrl}:${this.mlServicePort}`
    };
  }

  /**
   * Enable or disable ML predictions
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    console.log(`[ML Client] ML predictions ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Make HTTP request to ML service
   */
  private makeRequest(path: string, method: 'GET' | 'POST', data?: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const postData = data ? JSON.stringify(data) : undefined;

      const options = {
        hostname: this.mlServiceUrl,
        port: this.mlServicePort,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
        },
        timeout: this.timeout
      };

      const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (postData) {
        req.write(postData);
      }

      req.end();
    });
  }
}

// Singleton instance
let mlClientInstance: MLClient | null = null;

/**
 * Get or create ML client instance
 */
export function getMLClient(
  mlServiceUrl?: string,
  mlServicePort?: number,
  timeout?: number,
  enabled?: boolean
): MLClient {
  if (!mlClientInstance) {
    mlClientInstance = new MLClient(
      mlServiceUrl || process.env.ML_SERVICE_URL || 'localhost',
      mlServicePort || (process.env.ML_SERVICE_PORT ? parseInt(process.env.ML_SERVICE_PORT) : 5001),
      timeout || (process.env.ML_SERVICE_TIMEOUT ? parseInt(process.env.ML_SERVICE_TIMEOUT) : 5000),
      enabled !== undefined ? enabled : (process.env.ML_PREDICTIONS_ENABLED !== 'false')
    );
  }
  return mlClientInstance;
}

