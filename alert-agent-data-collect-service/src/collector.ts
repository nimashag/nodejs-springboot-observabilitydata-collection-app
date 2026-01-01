import * as fs from 'fs';
import * as path from 'path';
import { AlertEvent, NormalizedAlertEvent } from './types';

export class AlertDataCollector {
  private serviceAlertFiles: Map<string, string> = new Map();
  
  constructor() {
    // Define service alert data file paths
    this.serviceAlertFiles.set('delivery-service', '../delivery-service/alerts/delivery-service-alert-data.ndjson');
    this.serviceAlertFiles.set('orders-service', '../orders-service/alerts/orders-service-alert-data.ndjson');
    this.serviceAlertFiles.set('restaurants-service', '../restaurants-service/alerts/restaurants-service-alert-data.ndjson');
    this.serviceAlertFiles.set('users-service', '../users-service/alerts/users-service-alert-data.ndjson');
  }
  
  /**
   * Read alert events from a single service file
   */
  private readServiceAlertFile(serviceName: string, filePath: string): AlertEvent[] {
    // Resolve path: __dirname is dist/ when running compiled code
    // Go up to alert-agent-data-collect-service, then resolve relative path
    const collectorDir = path.resolve(__dirname, '..'); // alert-agent-data-collect-service
    const fullPath = path.resolve(collectorDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`[Collector] Alert file not found for ${serviceName}: ${fullPath}`);
      return [];
    }
    
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      
      const events: AlertEvent[] = [];
      for (const line of lines) {
        try {
          const event = JSON.parse(line) as AlertEvent;
          events.push(event);
        } catch (err) {
          console.error(`[Collector] Failed to parse line in ${serviceName}: ${err}`);
        }
      }
      
      console.log(`[Collector] Read ${events.length} alert events from ${serviceName}`);
      return events;
    } catch (err) {
      console.error(`[Collector] Failed to read ${serviceName} alert file: ${err}`);
      return [];
    }
  }
  
  /**
   * Normalize an alert event
   */
  private normalizeAlertEvent(event: AlertEvent): NormalizedAlertEvent {
    // Determine service type based on service name
    const serviceType = event.service_name === 'users-service' ? 'java' : 'nodejs';
    
    // Parse timestamp to Unix milliseconds
    const normalizedTimestamp = new Date(event.timestamp).getTime();
    
    return {
      ...event,
      normalized_timestamp: normalizedTimestamp,
      service_type: serviceType
    };
  }
  
  /**
   * Collect and merge alert data from all services
   */
  public collectAllAlerts(): NormalizedAlertEvent[] {
    console.log('[Collector] Starting alert data collection...');
    
    const allAlerts: NormalizedAlertEvent[] = [];
    
    for (const [serviceName, filePath] of this.serviceAlertFiles.entries()) {
      const serviceAlerts = this.readServiceAlertFile(serviceName, filePath);
      
      // Normalize each alert
      for (const alert of serviceAlerts) {
        const normalized = this.normalizeAlertEvent(alert);
        allAlerts.push(normalized);
      }
    }
    
    // Sort by timestamp (oldest first)
    allAlerts.sort((a, b) => a.normalized_timestamp - b.normalized_timestamp);
    
    console.log(`[Collector] Total alerts collected: ${allAlerts.length}`);
    return allAlerts;
  }
  
  /**
   * Generate summary statistics
   */
  public generateSummary(alerts: NormalizedAlertEvent[]): any {
    const summary = {
      total_alerts: alerts.length,
      alerts_by_service: {} as { [key: string]: number },
      alerts_by_type: {} as { [key: string]: number },
      alerts_by_severity: {} as { [key: string]: number },
      alerts_by_state: {} as { [key: string]: number },
      collection_timestamp: new Date().toISOString()
    };
    
    for (const alert of alerts) {
      // Count by service
      summary.alerts_by_service[alert.service_name] = 
        (summary.alerts_by_service[alert.service_name] || 0) + 1;
      
      // Count by type
      summary.alerts_by_type[alert.alert_type] = 
        (summary.alerts_by_type[alert.alert_type] || 0) + 1;
      
      // Count by severity
      summary.alerts_by_severity[alert.severity] = 
        (summary.alerts_by_severity[alert.severity] || 0) + 1;
      
      // Count by state
      summary.alerts_by_state[alert.alert_state] = 
        (summary.alerts_by_state[alert.alert_state] || 0) + 1;
    }
    
    return summary;
  }
  
  /**
   * Write combined alert history to file
   */
  public writeCombinedAlertHistory(alerts: NormalizedAlertEvent[], outputPath: string): void {
    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Write as JSON array
      const json = JSON.stringify(alerts, null, 2);
      fs.writeFileSync(outputPath, json, 'utf-8');
      
      console.log(`[Collector] Combined alert history written to: ${outputPath}`);
    } catch (err) {
      console.error(`[Collector] Failed to write combined alert history: ${err}`);
    }
  }
  
  /**
   * Write summary to file
   */
  public writeSummary(summary: any, outputPath: string): void {
    try {
      const json = JSON.stringify(summary, null, 2);
      fs.writeFileSync(outputPath, json, 'utf-8');
      
      console.log(`[Collector] Summary written to: ${outputPath}`);
    } catch (err) {
      console.error(`[Collector] Failed to write summary: ${err}`);
    }
  }
}

