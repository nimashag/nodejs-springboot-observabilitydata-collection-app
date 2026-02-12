import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';

export interface AlertEvent {
  timestamp: string;
  service_name: string;
  alert_name: string;
  alert_type: 'error' | 'latency' | 'availability' | 'resource' | 'traffic' | 'security' | 'performance';
  alert_state: 'fired' | 'resolved';
  alert_duration?: number; // milliseconds, only if resolved
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Context fields captured at alert time
  request_count: number;
  error_count: number;
  average_response_time: number;
  process_cpu_usage: number;
  process_memory_usage: number;
  event_loop_lag?: number;
  traffic_rate?: number;
}

interface RequestMetrics {
  timestamp: number;
  duration: number;
  isError: boolean;
  errorType?: string;
}

interface ActiveAlert {
  alert_name: string;
  alert_type: 'error' | 'latency' | 'availability' | 'resource' | 'traffic' | 'security' | 'performance';
  fired_at: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class AlertDetector {
  private serviceName: string;
  private alertDataFile: string;
  private recentRequests: RequestMetrics[] = [];
  private activeAlerts: Map<string, ActiveAlert> = new Map();
  private periodicCheckInterval: NodeJS.Timeout | null = null;
  private previousCpuUsage: NodeJS.CpuUsage | null = null;
  private processStartTime: number = Date.now();
  private eventLoopLagHistory: number[] = [];
  private lastEventLoopCheck: number = Date.now();
  private trafficRateHistory: Array<{ timestamp: number; count: number }> = [];
  private authFailures: Array<{ timestamp: number; type: string }> = [];
  private baselineTrafficRate: number = 0;
  private baselineCalculated: boolean = false;
  
  // Configuration thresholds - Original
  private readonly ERROR_BURST_THRESHOLD = 5; // errors in window
  private readonly ERROR_BURST_WINDOW = 60000; // 1 minute
  private readonly HIGH_LATENCY_THRESHOLD = 3000; // 3 seconds
  private readonly HIGH_LATENCY_COUNT = 3; // consecutive slow requests
  private readonly AVAILABILITY_ERROR_RATE = 0.5; // 50% error rate
  private readonly METRICS_WINDOW = 300000; // 5 minutes
  
  // Configuration thresholds - New
  private readonly MEMORY_THRESHOLD_PERCENT = 85; // 85% of heap limit
  private readonly CPU_THRESHOLD_PERCENT = 80; // 80% CPU usage
  private readonly CPU_SUSTAINED_WINDOW = 120000; // 2 minutes
  private readonly EVENT_LOOP_LAG_THRESHOLD = 100; // 100ms lag
  private readonly EVENT_LOOP_LAG_CRITICAL = 500; // 500ms critical
  private readonly TRAFFIC_SPIKE_MULTIPLIER = 3; // 3x normal traffic
  private readonly TRAFFIC_DROP_MULTIPLIER = 0.3; // 30% of normal traffic
  private readonly TRAFFIC_BASELINE_WINDOW = 600000; // 10 minutes for baseline
  private readonly AUTH_FAILURE_THRESHOLD = 10; // 10 failures in window
  private readonly AUTH_FAILURE_WINDOW = 300000; // 5 minutes
  private readonly MEMORY_LEAK_CHECK_INTERVAL = 60000; // Check every minute
  private readonly MEMORY_LEAK_GROWTH_THRESHOLD = 1.2; // 20% growth over time
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
    
    // Create alert data directory if it doesn't exist
    const alertDir = path.join(process.cwd(), 'alerts');
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
    this.periodicCheckInterval = setInterval(() => {
      this.checkAlertConditions();
    }, 30000);
  }
  
  /**
   * Cleanup method to stop periodic checking and clear resources
   */
  public cleanup(): void {
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }
  }
  
  /**
   * Check all alert conditions
   */
  private checkAlertConditions(): void {
    const now = Date.now();
    this.cleanOldMetrics(now);
    
    // Original alerts
    this.checkErrorBurst(now);
    this.checkHighLatency(now);
    this.checkAvailability(now);
    
    // New resource alerts
    this.checkMemoryUsage(now);
    this.checkCPUUsage(now);
    this.checkEventLoopLag(now);
    
    // Traffic anomaly alerts
    this.checkTrafficAnomaly(now);
    
    // Security alerts
    this.checkAuthFailures(now);
    
    // Database alerts
    this.checkDatabaseConnection(now);
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
   * Check for high memory usage
   */
  private checkMemoryUsage(now: number): void {
    const alertName = 'high_memory_usage';
    const memUsage = process.memoryUsage();
    const heapLimit = require('v8').getHeapStatistics().heap_size_limit;
    const usagePercent = (memUsage.heapUsed / heapLimit) * 100;
    
    if (usagePercent >= this.MEMORY_THRESHOLD_PERCENT) {
      if (!this.activeAlerts.has(alertName)) {
        const severity: 'low' | 'medium' | 'high' | 'critical' = 
          usagePercent >= 95 ? 'critical' :
          usagePercent >= 90 ? 'high' : 'medium';
        
        this.fireAlert(alertName, 'resource', severity);
      }
    } else if (usagePercent < this.MEMORY_THRESHOLD_PERCENT - 5) {
      // Resolve with 5% hysteresis
      if (this.activeAlerts.has(alertName)) {
        this.resolveAlert(alertName);
      }
    }
  }
  
  /**
   * Check for sustained high CPU usage
   */
  private checkCPUUsage(now: number): void {
    const alertName = 'high_cpu_usage';
    const currentCpuUsage = process.cpuUsage();
    
    // Calculate CPU usage percentage
    const totalCpuMicros = currentCpuUsage.user + currentCpuUsage.system;
    const elapsedMicros = process.uptime() * 1e6;
    const cpuUsagePercent = elapsedMicros > 0
      ? (totalCpuMicros / elapsedMicros) * 100
      : 0;
    
    if (cpuUsagePercent >= this.CPU_THRESHOLD_PERCENT) {
      if (!this.activeAlerts.has(alertName)) {
        const severity: 'low' | 'medium' | 'high' | 'critical' = 
          cpuUsagePercent >= 95 ? 'critical' :
          cpuUsagePercent >= 90 ? 'high' : 'medium';
        
        this.fireAlert(alertName, 'resource', severity);
      }
    } else if (cpuUsagePercent < this.CPU_THRESHOLD_PERCENT - 10) {
      // Resolve with 10% hysteresis
      if (this.activeAlerts.has(alertName)) {
        this.resolveAlert(alertName);
      }
    }
  }
  
  /**
   * Check for event loop lag (Node.js specific)
   */
  private checkEventLoopLag(now: number): void {
    const alertName = 'event_loop_lag';
    
    // Measure event loop lag
    const expectedDelay = now - this.lastEventLoopCheck;
    const actualDelay = Date.now() - this.lastEventLoopCheck;
    const lag = Math.max(0, actualDelay - expectedDelay);
    
    this.eventLoopLagHistory.push(lag);
    if (this.eventLoopLagHistory.length > 10) {
      this.eventLoopLagHistory.shift();
    }
    
    this.lastEventLoopCheck = Date.now();
    
    // Calculate average lag
    const avgLag = this.eventLoopLagHistory.reduce((a, b) => a + b, 0) / this.eventLoopLagHistory.length;
    
    if (avgLag >= this.EVENT_LOOP_LAG_THRESHOLD) {
      if (!this.activeAlerts.has(alertName)) {
        const severity: 'low' | 'medium' | 'high' | 'critical' = 
          avgLag >= this.EVENT_LOOP_LAG_CRITICAL ? 'critical' :
          avgLag >= 300 ? 'high' :
          avgLag >= 200 ? 'medium' : 'low';
        
        this.fireAlert(alertName, 'performance', severity);
      }
    } else if (avgLag < this.EVENT_LOOP_LAG_THRESHOLD - 20) {
      if (this.activeAlerts.has(alertName)) {
        this.resolveAlert(alertName);
      }
    }
  }
  
  /**
   * Check for traffic anomalies (spikes or drops)
   */
  private checkTrafficAnomaly(now: number): void {
    // Update traffic rate
    const oneMinuteAgo = now - 60000;
    const recentTraffic = this.recentRequests.filter(r => r.timestamp > oneMinuteAgo);
    const currentRate = recentTraffic.length / 60; // requests per second
    
    this.trafficRateHistory.push({ timestamp: now, count: recentTraffic.length });
    
    // Keep only last 10 minutes of traffic history
    this.trafficRateHistory = this.trafficRateHistory.filter(
      t => t.timestamp > now - this.TRAFFIC_BASELINE_WINDOW
    );
    
    // Calculate baseline if we have enough data
    if (!this.baselineCalculated && this.trafficRateHistory.length >= 5) {
      const rates = this.trafficRateHistory.map(t => t.count / 60);
      this.baselineTrafficRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      this.baselineCalculated = true;
    }
    
    if (this.baselineCalculated && this.baselineTrafficRate > 0) {
      // Check for traffic spike
      if (currentRate >= this.baselineTrafficRate * this.TRAFFIC_SPIKE_MULTIPLIER) {
        const alertName = 'traffic_spike';
        if (!this.activeAlerts.has(alertName)) {
          const multiplier = currentRate / this.baselineTrafficRate;
          const severity: 'low' | 'medium' | 'high' | 'critical' = 
            multiplier >= 5 ? 'high' :
            multiplier >= 4 ? 'medium' : 'low';
          
          this.fireAlert(alertName, 'traffic', severity);
        }
      } else if (currentRate < this.baselineTrafficRate * (this.TRAFFIC_SPIKE_MULTIPLIER - 0.5)) {
        const alertName = 'traffic_spike';
        if (this.activeAlerts.has(alertName)) {
          this.resolveAlert(alertName);
        }
      }
      
      // Check for traffic drop
      if (currentRate <= this.baselineTrafficRate * this.TRAFFIC_DROP_MULTIPLIER) {
        const alertName = 'traffic_drop';
        if (!this.activeAlerts.has(alertName)) {
          const dropPercent = (1 - currentRate / this.baselineTrafficRate) * 100;
          const severity: 'low' | 'medium' | 'high' | 'critical' = 
            dropPercent >= 90 ? 'critical' :
            dropPercent >= 80 ? 'high' :
            dropPercent >= 70 ? 'medium' : 'low';
          
          this.fireAlert(alertName, 'traffic', severity);
        }
      } else if (currentRate > this.baselineTrafficRate * (this.TRAFFIC_DROP_MULTIPLIER + 0.2)) {
        const alertName = 'traffic_drop';
        if (this.activeAlerts.has(alertName)) {
          this.resolveAlert(alertName);
        }
      }
    }
  }
  
  /**
   * Check for authentication failure spikes
   */
  private checkAuthFailures(now: number): void {
    const alertName = 'auth_failure_spike';
    
    // Clean old auth failures
    this.authFailures = this.authFailures.filter(
      f => f.timestamp > now - this.AUTH_FAILURE_WINDOW
    );
    
    if (this.authFailures.length >= this.AUTH_FAILURE_THRESHOLD) {
      if (!this.activeAlerts.has(alertName)) {
        const severity: 'low' | 'medium' | 'high' | 'critical' = 
          this.authFailures.length >= 50 ? 'critical' :
          this.authFailures.length >= 30 ? 'high' :
          this.authFailures.length >= 20 ? 'medium' : 'low';
        
        this.fireAlert(alertName, 'security', severity);
      }
    } else if (this.authFailures.length < this.AUTH_FAILURE_THRESHOLD - 3) {
      if (this.activeAlerts.has(alertName)) {
        this.resolveAlert(alertName);
      }
    }
  }
  
  /**
   * Record authentication failure (call this from auth middleware)
   */
  public recordAuthFailure(failureType: string): void {
    this.authFailures.push({
      timestamp: Date.now(),
      type: failureType
    });
  }
  
  /**
   * Check database connection health
   */
  private checkDatabaseConnection(now: number): void {
    const alertName = 'database_connection_issue';
    
    // Check if mongoose is connected
    const isConnected = mongoose.connection.readyState === 1; // 1 = connected
    const isConnecting = mongoose.connection.readyState === 2; // 2 = connecting
    const isDisconnected = mongoose.connection.readyState === 0; // 0 = disconnected
    
    if (isDisconnected || (!isConnected && !isConnecting)) {
      if (!this.activeAlerts.has(alertName)) {
        this.fireAlert(alertName, 'resource', 'critical');
      }
    } else if (isConnected) {
      if (this.activeAlerts.has(alertName)) {
        this.resolveAlert(alertName);
      }
    }
  }
  
  /**
   * Fire an alert
   */
  private fireAlert(alertName: string, alertType: 'error' | 'latency' | 'availability' | 'resource' | 'traffic' | 'security' | 'performance', severity: 'low' | 'medium' | 'high' | 'critical'): void {
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
    
    // Push to collector in real-time (webhook)
    this.sendAlertToCollector(alertEvent);
    
    // Also write to file (backup)
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
    
    // Push to collector in real-time (webhook)
    this.sendAlertToCollector(alertEvent);
    
    // Also write to file (backup)
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
    event_loop_lag?: number;
    traffic_rate?: number;
  } {
    const requestCount = this.recentRequests.length;
    const errorCount = this.recentRequests.filter(r => r.isError).length;
    const avgResponseTime = requestCount > 0
      ? this.recentRequests.reduce((sum, r) => sum + r.duration, 0) / requestCount
      : 0;
    
    // Get process metrics
    const memUsage = process.memoryUsage();
    const currentCpuUsage = process.cpuUsage();
    
    // Calculate CPU usage percentage
    const totalCpuMicros = currentCpuUsage.user + currentCpuUsage.system;
    const elapsedMicros = process.uptime() * 1e6;
    const cpuUsagePercent = elapsedMicros > 0
      ? (totalCpuMicros / elapsedMicros) * 100
      : 0;
    
    // Store current CPU usage for next calculation
    this.previousCpuUsage = currentCpuUsage;
    
    // Calculate event loop lag
    const avgEventLoopLag = this.eventLoopLagHistory.length > 0
      ? this.eventLoopLagHistory.reduce((a, b) => a + b, 0) / this.eventLoopLagHistory.length
      : 0;
    
    // Calculate current traffic rate (requests per second)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentTraffic = this.recentRequests.filter(r => r.timestamp > oneMinuteAgo);
    const trafficRate = recentTraffic.length / 60;
    
    return {
      request_count: requestCount,
      error_count: errorCount,
      average_response_time: Math.round(avgResponseTime),
      process_cpu_usage: Math.round(cpuUsagePercent * 100) / 100,
      process_memory_usage: memUsage.heapUsed,
      event_loop_lag: Math.round(avgEventLoopLag * 100) / 100,
      traffic_rate: Math.round(trafficRate * 100) / 100
    };
  }
  
  /**
   * Write alert event to file (append-only NDJSON)
   * Uses synchronous write to prevent race conditions from concurrent alert checks
   */
  /**
   * Send alert to collector via HTTP webhook (real-time push)
   */
  private async sendAlertToCollector(alertEvent: AlertEvent): Promise<void> {
    const collectorUrl = process.env.ALERT_COLLECTOR_URL || 'http://localhost:3008/api/alerts';
    
    try {
      // Non-blocking async send (fire and forget)
      fetch(collectorUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alertEvent)
      }).catch(err => {
        // Silent fail - file write is backup
        console.error(`[AlertDetector] Failed to push alert to collector: ${err.message}`);
      });
    } catch (err: any) {
      // Fallback to file only
      console.error(`[AlertDetector] Error sending alert to collector: ${err.message}`);
    }
  }

  private writeAlertEvent(alertEvent: AlertEvent): void {
    const line = JSON.stringify(alertEvent) + '\n';
    
    try {
      // Use synchronous append to avoid interleaved writes from concurrent calls
      fs.appendFileSync(this.alertDataFile, line);
    } catch (err: any) {
      console.error(`Failed to write alert event: ${err.message}`);
    }
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

