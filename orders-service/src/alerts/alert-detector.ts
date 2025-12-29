/**
 * Alert Detector for Orders Service
 * 
 * This module detects alert events based on application behavior:
 * - Error bursts (multiple errors in short time)
 * - Repeated failures (same error pattern)
 * - High latency conditions (slow responses)
 * 
 * NO OpenTelemetry, NO Prometheus, NO external observability libraries
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AlertEvent {
  timestamp: string;
  service_name: string;
  alert_name: string;
  alert_type: 'error' | 'latency' | 'availability';
  alert_state: 'fired' | 'resolved';
  alert_duration?: number; // milliseconds, only if resolved
  severity: 'low' | 'medium' | 'high';
  
  // Context fields captured at alert time
  request_count: number;
  error_count: number;
  average_response_time: number;
  process_cpu_usage: number;
  process_memory_usage: number;
}

interface RequestMetrics {
  timestamp: number;
  duration: number;
  isError: boolean;
  errorType?: string;
}

interface ActiveAlert {
  alert_name: string;
  alert_type: 'error' | 'latency' | 'availability';
  fired_at: number;
  severity: 'low' | 'medium' | 'high';
}

export class AlertDetector {
  private serviceName: string;
  private alertDataFile: string;
  private recentRequests: RequestMetrics[] = [];
  private activeAlerts: Map<string, ActiveAlert> = new Map();
  
  // Configuration thresholds
  private readonly ERROR_BURST_THRESHOLD = 5; // errors in window
  private readonly ERROR_BURST_WINDOW = 60000; // 1 minute
  private readonly HIGH_LATENCY_THRESHOLD = 3000; // 3 seconds
  private readonly HIGH_LATENCY_COUNT = 3; // consecutive slow requests
  private readonly AVAILABILITY_ERROR_RATE = 0.5; // 50% error rate
  private readonly METRICS_WINDOW = 300000; // 5 minutes
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
    
    // Create alert data directory if it doesn't exist
    const alertDir = path.join(process.cwd(), 'logs', 'alert');
    if (!fs.existsSync(alertDir)) {
      fs.mkdirSync(alertDir, { recursive: true });
    }
    
    this.alertDataFile = path.join(alertDir, `${serviceName}-alert-data.ndjson`);
    
    // Start periodic check
    this.startPeriodicCheck();
  }
  
  /**
   * Record a request for alert detection
   */
  public recordRequest(duration: number, isError: boolean, errorType?: string): void {
    const now = Date.now();
    
    this.recentRequests.push({
      timestamp: now,
      duration,
      isError,
      errorType
    });
    
    // Clean old requests outside the metrics window
    this.cleanOldMetrics(now);
    
    // Check for alert conditions immediately
    this.checkAlertConditions();
  }
  
  /**
   * Clean metrics older than the window
   */
  private cleanOldMetrics(now: number): void {
    const cutoff = now - this.METRICS_WINDOW;
    this.recentRequests = this.recentRequests.filter(r => r.timestamp > cutoff);
  }
  
  /**
   * Start periodic alert checking (every 30 seconds)
   */
  private startPeriodicCheck(): void {
    setInterval(() => {
      this.checkAlertConditions();
    }, 30000);
  }
  
  /**
   * Check all alert conditions
   */
  private checkAlertConditions(): void {
    const now = Date.now();
    this.cleanOldMetrics(now);
    
    // Check error burst
    this.checkErrorBurst(now);
    
    // Check high latency
    this.checkHighLatency(now);
    
    // Check availability
    this.checkAvailability(now);
  }
  
  /**
   * Check for error burst condition
   */
  private checkErrorBurst(now: number): void {
    const alertName = 'error_burst';
    const burstWindow = now - this.ERROR_BURST_WINDOW;
    const recentErrors = this.recentRequests.filter(
      r => r.isError && r.timestamp > burstWindow
    );
    
    if (recentErrors.length >= this.ERROR_BURST_THRESHOLD) {
      if (!this.activeAlerts.has(alertName)) {
        // Fire alert
        const severity = recentErrors.length >= 10 ? 'high' : 
                        recentErrors.length >= 7 ? 'medium' : 'low';
        
        this.fireAlert(alertName, 'error', severity);
      }
    } else {
      if (this.activeAlerts.has(alertName)) {
        // Resolve alert
        this.resolveAlert(alertName);
      }
    }
  }
  
  /**
   * Check for high latency condition
   */
  private checkHighLatency(now: number): void {
    const alertName = 'high_latency';
    
    // Get last N requests
    const recentNonError = this.recentRequests
      .filter(r => !r.isError)
      .slice(-this.HIGH_LATENCY_COUNT);
    
    if (recentNonError.length >= this.HIGH_LATENCY_COUNT) {
      const allSlow = recentNonError.every(r => r.duration > this.HIGH_LATENCY_THRESHOLD);
      
      if (allSlow) {
        if (!this.activeAlerts.has(alertName)) {
          const avgLatency = recentNonError.reduce((sum, r) => sum + r.duration, 0) / recentNonError.length;
          const severity = avgLatency > 5000 ? 'high' : avgLatency > 4000 ? 'medium' : 'low';
          
          this.fireAlert(alertName, 'latency', severity);
        }
      } else {
        if (this.activeAlerts.has(alertName)) {
          this.resolveAlert(alertName);
        }
      }
    }
  }
  
  /**
   * Check for availability issues (high error rate)
   */
  private checkAvailability(now: number): void {
    const alertName = 'availability_issue';
    
    if (this.recentRequests.length < 10) {
      // Not enough data
      return;
    }
    
    const errorCount = this.recentRequests.filter(r => r.isError).length;
    const errorRate = errorCount / this.recentRequests.length;
    
    if (errorRate >= this.AVAILABILITY_ERROR_RATE) {
      if (!this.activeAlerts.has(alertName)) {
        const severity = errorRate >= 0.8 ? 'high' : errorRate >= 0.65 ? 'medium' : 'low';
        
        this.fireAlert(alertName, 'availability', severity);
      }
    } else {
      if (this.activeAlerts.has(alertName)) {
        this.resolveAlert(alertName);
      }
    }
  }
  
  /**
   * Fire an alert
   */
  private fireAlert(alertName: string, alertType: 'error' | 'latency' | 'availability', severity: 'low' | 'medium' | 'high'): void {
    const now = Date.now();
    
    this.activeAlerts.set(alertName, {
      alert_name: alertName,
      alert_type: alertType,
      fired_at: now,
      severity
    });
    
    const alertEvent: AlertEvent = {
      timestamp: new Date(now).toISOString(),
      service_name: this.serviceName,
      alert_name: alertName,
      alert_type: alertType,
      alert_state: 'fired',
      severity,
      ...this.captureContext()
    };
    
    this.writeAlertEvent(alertEvent);
  }
  
  /**
   * Resolve an alert
   */
  private resolveAlert(alertName: string): void {
    const activeAlert = this.activeAlerts.get(alertName);
    if (!activeAlert) return;
    
    const now = Date.now();
    const duration = now - activeAlert.fired_at;
    
    this.activeAlerts.delete(alertName);
    
    const alertEvent: AlertEvent = {
      timestamp: new Date(now).toISOString(),
      service_name: this.serviceName,
      alert_name: alertName,
      alert_type: activeAlert.alert_type,
      alert_state: 'resolved',
      alert_duration: duration,
      severity: activeAlert.severity,
      ...this.captureContext()
    };
    
    this.writeAlertEvent(alertEvent);
  }
  
  /**
   * Capture context metrics at alert time
   */
  private captureContext(): {
    request_count: number;
    error_count: number;
    average_response_time: number;
    process_cpu_usage: number;
    process_memory_usage: number;
  } {
    const requestCount = this.recentRequests.length;
    const errorCount = this.recentRequests.filter(r => r.isError).length;
    const avgResponseTime = requestCount > 0
      ? this.recentRequests.reduce((sum, r) => sum + r.duration, 0) / requestCount
      : 0;
    
    // Get process metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      request_count: requestCount,
      error_count: errorCount,
      average_response_time: Math.round(avgResponseTime),
      process_cpu_usage: cpuUsage.user + cpuUsage.system,
      process_memory_usage: memUsage.heapUsed
    };
  }
  
  /**
   * Write alert event to file (append-only NDJSON)
   */
  private writeAlertEvent(alertEvent: AlertEvent): void {
    const line = JSON.stringify(alertEvent) + '\n';
    
    fs.appendFile(this.alertDataFile, line, (err) => {
      if (err) {
        console.error(`Failed to write alert event: ${err.message}`);
      }
    });
  }
  
  /**
   * Get current alert statistics (for monitoring)
   */
  public getStats(): {
    activeAlerts: number;
    recentRequests: number;
    recentErrors: number;
  } {
    return {
      activeAlerts: this.activeAlerts.size,
      recentRequests: this.recentRequests.length,
      recentErrors: this.recentRequests.filter(r => r.isError).length
    };
  }
}

