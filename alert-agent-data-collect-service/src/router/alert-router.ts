import { NormalizedAlertEvent } from '../types';

export interface AlertRoutingDecision {
  alert_id: string;
  alert_name: string;
  service_name: string;
  action: 'suppress' | 'log' | 'notify' | 'escalate';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  recipients: string[];
  notification_channels: string[];
  reason: string;
  should_notify_admin: boolean;
}

export interface RoutingPolicy {
  name: string;
  condition: (alert: NormalizedAlertEvent) => boolean;
  action: 'suppress' | 'log' | 'notify' | 'escalate';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  recipients: string[];
  channels: string[];
  reason: string;
}

export interface RoutingSummary {
  total_alerts: number;
  suppressed: number;
  logged: number;
  notified: number;
  escalated: number;
  admin_notifications: number;
  by_urgency: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export class AlertRouter {
  private policies: RoutingPolicy[] = [];

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default routing policies
   */
  private initializeDefaultPolicies(): void {
    // Policy 1: Critical - High severity alerts
    this.policies.push({
      name: 'Critical High Severity',
      condition: (alert) => alert.severity === 'high',
      action: 'notify',
      urgency: 'critical',
      recipients: ['system-admin@company.com', 'oncall-engineer@company.com'],
      channels: ['email', 'sms', 'slack', 'pagerduty'],
      reason: 'High severity alert requires immediate attention'
    });

    // Policy 2: Availability Crisis (>80% error rate)
    this.policies.push({
      name: 'Availability Crisis',
      condition: (alert) => 
        alert.alert_type === 'availability' && 
        alert.request_count > 0 &&
        (alert.error_count / alert.request_count) > 0.8,
      action: 'escalate',
      urgency: 'critical',
      recipients: ['system-admin@company.com', 'senior-admin@company.com', 'manager@company.com'],
      channels: ['email', 'sms', 'slack', 'pagerduty'],
      reason: 'Service availability below 20% - critical situation'
    });

    // Policy 3: Error Burst with High Error Count (>50 errors)
    this.policies.push({
      name: 'Major Error Burst',
      condition: (alert) => 
        alert.alert_type === 'error' && 
        alert.error_count > 50,
      action: 'notify',
      urgency: 'high',
      recipients: ['oncall-engineer@company.com', 'team-lead@company.com'],
      channels: ['email', 'slack'],
      reason: 'Major error burst detected (>50 errors)'
    });

    // Policy 4: Medium Severity - Business Hours Only
    this.policies.push({
      name: 'Medium Severity Business Hours',
      condition: (alert) => 
        alert.severity === 'medium' && 
        this.isBusinessHours(),
      action: 'notify',
      urgency: 'medium',
      recipients: ['team@company.com'],
      channels: ['email', 'slack'],
      reason: 'Medium severity alert during business hours'
    });

    // Policy 5: Low Severity - Log Only
    this.policies.push({
      name: 'Low Severity Log Only',
      condition: (alert) => alert.severity === 'low',
      action: 'log',
      urgency: 'low',
      recipients: ['monitoring-logs@company.com'],
      channels: ['log'],
      reason: 'Low severity - logged for review, no immediate notification'
    });

    // Policy 6: Off-Hours Low Priority - Suppress
    this.policies.push({
      name: 'Off-Hours Suppression',
      condition: (alert) => 
        alert.severity === 'low' && 
        !this.isBusinessHours(),
      action: 'suppress',
      urgency: 'low',
      recipients: [],
      channels: [],
      reason: 'Low severity alert outside business hours - suppressed'
    });

    // Policy 7: Quick Resolve Pattern - Suppress (likely false positive)
    this.policies.push({
      name: 'Quick Resolve Suppression',
      condition: (alert) => 
        alert.alert_state === 'resolved' && 
        alert.alert_duration !== undefined &&
        alert.alert_duration < 30000, // < 30 seconds
      action: 'suppress',
      urgency: 'low',
      recipients: [],
      channels: [],
      reason: 'Alert resolved in <30s - likely false positive, suppressed'
    });
  }

  /**
   * Route an alert and determine notification policy
   */
  routeAlert(alert: NormalizedAlertEvent): AlertRoutingDecision {
    // Find the first matching policy
    for (const policy of this.policies) {
      if (policy.condition(alert)) {
        return {
          alert_id: `${alert.service_name}-${alert.timestamp}`,
          alert_name: alert.alert_name,
          service_name: alert.service_name,
          action: policy.action,
          urgency: policy.urgency,
          recipients: policy.recipients,
          notification_channels: policy.channels,
          reason: policy.reason,
          should_notify_admin: this.shouldNotifyAdmin(policy.action, policy.urgency)
        };
      }
    }

    // Default policy: notify with medium urgency
    return {
      alert_id: `${alert.service_name}-${alert.timestamp}`,
      alert_name: alert.alert_name,
      service_name: alert.service_name,
      action: 'notify',
      urgency: 'medium',
      recipients: ['team@company.com'],
      notification_channels: ['email'],
      reason: 'Default routing policy - medium urgency notification',
      should_notify_admin: false
    };
  }

  /**
   * Route multiple alerts and generate summary
   */
  routeAlerts(alerts: NormalizedAlertEvent[]): {
    decisions: AlertRoutingDecision[];
    summary: RoutingSummary;
  } {
    console.log('[Alert Router] Routing alerts...');
    
    const decisions: AlertRoutingDecision[] = [];
    const summary: RoutingSummary = {
      total_alerts: alerts.length,
      suppressed: 0,
      logged: 0,
      notified: 0,
      escalated: 0,
      admin_notifications: 0,
      by_urgency: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    for (const alert of alerts) {
      const decision = this.routeAlert(alert);
      decisions.push(decision);

      // Update summary
      switch (decision.action) {
        case 'suppress':
          summary.suppressed++;
          break;
        case 'log':
          summary.logged++;
          break;
        case 'notify':
          summary.notified++;
          break;
        case 'escalate':
          summary.escalated++;
          break;
      }

      summary.by_urgency[decision.urgency]++;

      if (decision.should_notify_admin) {
        summary.admin_notifications++;
      }
    }

    console.log(`[Alert Router]   Total: ${summary.total_alerts}`);
    console.log(`[Alert Router]   Suppressed: ${summary.suppressed} (${(summary.suppressed/summary.total_alerts*100).toFixed(1)}%)`);
    console.log(`[Alert Router]   Logged: ${summary.logged} (${(summary.logged/summary.total_alerts*100).toFixed(1)}%)`);
    console.log(`[Alert Router]   Notified: ${summary.notified} (${(summary.notified/summary.total_alerts*100).toFixed(1)}%)`);
    console.log(`[Alert Router]   Escalated: ${summary.escalated} (${(summary.escalated/summary.total_alerts*100).toFixed(1)}%)`);
    console.log(`[Alert Router]   Admin Notifications: ${summary.admin_notifications} (${(summary.admin_notifications/summary.total_alerts*100).toFixed(1)}%)`);

    return { decisions, summary };
  }

  /**
   * Determine if admin should be notified
   */
  private shouldNotifyAdmin(action: string, urgency: string): boolean {
    // Notify admin for critical/high urgency or escalations
    return (
      urgency === 'critical' || 
      urgency === 'high' || 
      action === 'escalate'
    );
  }

  /**
   * Check if current time is within business hours
   */
  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Monday-Friday, 9 AM - 5 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
  }

  /**
   * Calculate routing efficiency metrics
   */
  calculateEfficiency(summary: RoutingSummary): {
    noise_reduction_percentage: number;
    admin_alert_reduction_percentage: number;
    suppression_rate: number;
  } {
    const noiseReduction = ((summary.suppressed + summary.logged) / summary.total_alerts) * 100;
    const adminReduction = ((summary.total_alerts - summary.admin_notifications) / summary.total_alerts) * 100;
    const suppressionRate = (summary.suppressed / summary.total_alerts) * 100;

    return {
      noise_reduction_percentage: noiseReduction,
      admin_alert_reduction_percentage: adminReduction,
      suppression_rate: suppressionRate
    };
  }

  /**
   * Generate routing recommendations
   */
  generateRoutingRecommendations(summary: RoutingSummary): string[] {
    const recommendations: string[] = [];

    // High suppression rate
    if (summary.suppressed > summary.total_alerts * 0.3) {
      recommendations.push(
        `✅ High suppression rate (${(summary.suppressed/summary.total_alerts*100).toFixed(1)}%) - effectively filtering noise`
      );
    }

    // Too many admin notifications
    if (summary.admin_notifications > summary.total_alerts * 0.2) {
      recommendations.push(
        `⚠️ ${summary.admin_notifications} admin notifications (${(summary.admin_notifications/summary.total_alerts*100).toFixed(1)}%) - consider stricter routing policies`
      );
    }

    // Good balance
    if (summary.admin_notifications <= summary.total_alerts * 0.1) {
      recommendations.push(
        `✅ Excellent admin notification rate (${(summary.admin_notifications/summary.total_alerts*100).toFixed(1)}%) - only critical issues reach admins`
      );
    }

    // Escalations
    if (summary.escalated > 0) {
      recommendations.push(
        `🚨 ${summary.escalated} alerts escalated - requires immediate senior attention`
      );
    }

    return recommendations;
  }
}

