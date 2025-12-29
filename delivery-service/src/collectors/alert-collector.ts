/**
 * Alert Collector for Delivery Service
 * 
 * This module integrates the alert detector with the Express middleware
 * to automatically track requests and detect alert conditions.
 * 
 * NO OpenTelemetry, NO Prometheus, NO external observability libraries
 */

import { Request, Response, NextFunction } from 'express';
import { AlertDetector } from '../alerts/alert-detector';

let alertDetector: AlertDetector | null = null;

/**
 * Initialize the alert collector
 */
export function initializeAlertCollector(serviceName: string): void {
  alertDetector = new AlertDetector(serviceName);
  console.log(`[Alert Collector] Initialized for ${serviceName}`);
}

/**
 * Express middleware to track requests for alert detection
 */
export function alertCollectorMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!alertDetector) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Capture the original end function
  const originalEnd = res.end;
  
  // Override res.end to capture response
  res.end = function(this: Response, ...args: any[]): Response {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    const errorType = isError ? `HTTP_${res.statusCode}` : undefined;
    
    // Record request metrics
    alertDetector!.recordRequest(duration, isError, errorType);
    
    // Call original end with proper arguments
    // @ts-ignore - Complex overload handling
    return originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * Get alert detector instance (for manual recording)
 */
export function getAlertDetector(): AlertDetector | null {
  return alertDetector;
}

/**
 * Manually record an error event (for non-HTTP errors)
 */
export function recordErrorEvent(errorType: string): void {
  if (alertDetector) {
    alertDetector.recordRequest(0, true, errorType);
  }
}

/**
 * Get current alert statistics
 */
export function getAlertStats(): any {
  if (alertDetector) {
    return alertDetector.getStats();
  }
  return null;
}

