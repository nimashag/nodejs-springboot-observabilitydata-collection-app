import { NormalizedAlertEvent } from '../types';

export interface SuppressionRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: (alert: NormalizedAlertEvent) => boolean;
  reason: string;
}

export interface MaintenanceWindow {
  service_name: string;
  start_time: Date;
  end_time: Date;
  reason: string;
}

export interface SuppressionResult {
  alert: NormalizedAlertEvent;
  suppressed: boolean;
  reason: string;
  rule_applied?: string;
}

export class AlertSuppressor {
  private rules: SuppressionRule[] = [];
  private maintenanceWindows: MaintenanceWindow[] = [];
  private recentAlerts: Map<string, NormalizedAlertEvent[]> = new Map();
  private readonly DUPLICATE_WINDOW = 300000; // 5 minutes

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default suppression rules
   */
  private initializeDefaultRules(): void {
    // Rule 1: Quick Resolve (< 30 seconds)
    this.rules.push({
      id: 'quick-resolve',
      name: 'Quick Resolve Suppression',
      enabled: true,
      condition: (alert) => 
        alert.alert_state === 'resolved' && 
        alert.alert_duration !== undefined &&
        alert.alert_duration < 30000,
      reason: 'Alert resolved in less than 30 seconds - likely false positive'
    });

    // Rule 2: Low Severity Off-Hours
    this.rules.push({
      id: 'low-severity-offhours',
      name: 'Low Severity Off-Hours',
      enabled: true,
      condition: (alert) => {
        const hour = new Date().getHours();
        const isOffHours = hour < 9 || hour >= 17;
        return alert.severity === 'low' && isOffHours;
      },
      reason: 'Low severity alert outside business hours (9 AM - 5 PM)'
    });

    // Rule 3: Duplicate Alert (same alert within 5 minutes)
    this.rules.push({
      id: 'duplicate-alert',
      name: 'Duplicate Alert Suppression',
      enabled: true,
      condition: (alert) => this.isDuplicate(alert),
      reason: 'Duplicate alert detected within 5-minute window'
    });

    // Rule 4: Very Low Error Count (< 3 errors)
    this.rules.push({
      id: 'very-low-error',
      name: 'Very Low Error Count',
      enabled: true,
      condition: (alert) => 
        alert.alert_type === 'error' && 
        alert.error_count < 3,
      reason: 'Very low error count (< 3 errors) - noise threshold'
    });

    // Rule 5: Test/Dev Service Alerts
    this.rules.push({
      id: 'test-dev-services',
      name: 'Test/Dev Service Suppression',
      enabled: true,
      condition: (alert) => 
        alert.service_name.includes('test') || 
        alert.service_name.includes('dev') ||
        alert.service_name.includes('staging'),
      reason: 'Alert from test/dev/staging environment'
    });
  }

  /**
   * Check if alert should be suppressed
   */
  shouldSuppress(alert: NormalizedAlertEvent): SuppressionResult {
    // Check maintenance windows first
    if (this.isInMaintenanceWindow(alert)) {
      return {
        alert,
        suppressed: true,
        reason: 'Service is in maintenance window',
        rule_applied: 'maintenance-window'
      };
    }

    // Check suppression rules
    for (const rule of this.rules) {
      if (rule.enabled && rule.condition(alert)) {
        return {
          alert,
          suppressed: true,
          reason: rule.reason,
          rule_applied: rule.id
        };
      }
    }

    // Track alert for duplicate detection
    this.trackAlert(alert);

    return {
      alert,
      suppressed: false,
      reason: 'No suppression rules matched'
    };
  }

  /**
   * Process multiple alerts and apply suppression
   */
  suppressAlerts(alerts: NormalizedAlertEvent[]): {
    suppressed: SuppressionResult[];
    allowed: SuppressionResult[];
    summary: {
      total: number;
      suppressed_count: number;
      allowed_count: number;
      suppression_rate: number;
      by_rule: Record<string, number>;
    };
  } {
    const suppressed: SuppressionResult[] = [];
    const allowed: SuppressionResult[] = [];
    const byRule: Record<string, number> = {};

    for (const alert of alerts) {
      const result = this.shouldSuppress(alert);
      
      if (result.suppressed) {
        suppressed.push(result);
        if (result.rule_applied) {
          byRule[result.rule_applied] = (byRule[result.rule_applied] || 0) + 1;
        }
      } else {
        allowed.push(result);
      }
    }

    const summary = {
      total: alerts.length,
      suppressed_count: suppressed.length,
      allowed_count: allowed.length,
      suppression_rate: (suppressed.length / alerts.length) * 100,
      by_rule: byRule
    };

    return { suppressed, allowed, summary };
  }

  /**
   * Check if alert is a duplicate
   */
  private isDuplicate(alert: NormalizedAlertEvent): boolean {
    const key = `${alert.service_name}-${alert.alert_name}-${alert.alert_type}`;
    const recent = this.recentAlerts.get(key) || [];
    
    const now = alert.normalized_timestamp;
    const duplicates = recent.filter(
      a => Math.abs(now - a.normalized_timestamp) < this.DUPLICATE_WINDOW
    );

    return duplicates.length > 0;
  }

  /**
   * Track alert for duplicate detection
   */
  private trackAlert(alert: NormalizedAlertEvent): void {
    const key = `${alert.service_name}-${alert.alert_name}-${alert.alert_type}`;
    const recent = this.recentAlerts.get(key) || [];
    
    // Add current alert
    recent.push(alert);
    
    // Keep only alerts within the duplicate window
    const now = alert.normalized_timestamp;
    const filtered = recent.filter(
      a => Math.abs(now - a.normalized_timestamp) < this.DUPLICATE_WINDOW
    );
    
    this.recentAlerts.set(key, filtered);
  }

  /**
   * Check if service is in maintenance window
   */
  private isInMaintenanceWindow(alert: NormalizedAlertEvent): boolean {
    const now = new Date(alert.normalized_timestamp);
    
    return this.maintenanceWindows.some(
      window => 
        window.service_name === alert.service_name &&
        now >= window.start_time &&
        now <= window.end_time
    );
  }

  /**
   * Add maintenance window
   */
  addMaintenanceWindow(window: MaintenanceWindow): void {
    this.maintenanceWindows.push(window);
  }

  /**
   * Enable/disable suppression rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Get all suppression rules
   */
  getRules(): SuppressionRule[] {
    return this.rules;
  }
}

