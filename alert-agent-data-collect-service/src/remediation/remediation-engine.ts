import { NormalizedAlertEvent } from '../types';

export interface RemediationSuggestion {
  suggestion_id: string;
  alert_id: string;
  service_name: string;
  alert_type: string;
  severity: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  actions: RemediationAction[];
  estimated_resolution_time: string;
  requires_approval: boolean;
  can_auto_execute: boolean;
  confidence: number;
}

export interface RemediationAction {
  action_type: 'scale' | 'restart' | 'rollback' | 'investigate' | 'rate_limit' | 'cache_clear' | 'manual';
  description: string;
  command?: string;
  risk_level: 'low' | 'medium' | 'high';
  prerequisites?: string[];
  expected_outcome: string;
  rollback_plan?: string;
}

export interface RemediationPlaybook {
  playbook_name: string;
  alert_type: string;
  severity_levels: string[];
  conditions: string[];
  actions: RemediationAction[];
  success_rate: number;
  avg_resolution_time_minutes: number;
}

export interface RemediationMetrics {
  total_suggestions: number;
  auto_executable: number;
  manual_required: number;
  by_priority: {
    immediate: number;
    high: number;
    medium: number;
    low: number;
  };
  estimated_time_saved_hours: number;
}

export class RemediationEngine {
  private playbooks: RemediationPlaybook[] = [];

  constructor() {
    this.initializePlaybooks();
  }

  /**
   * Initialize standard remediation playbooks
   */
  private initializePlaybooks(): void {
    // Error Burst Playbook
    this.playbooks.push({
      playbook_name: 'Error Burst Response',
      alert_type: 'error',
      severity_levels: ['high', 'critical'],
      conditions: ['error_count > 50', 'error_rate > 0.1'],
      actions: [
        {
          action_type: 'investigate',
          description: 'Check recent logs for error patterns',
          risk_level: 'low',
          expected_outcome: 'Identify error source'
        },
        {
          action_type: 'rollback',
          description: 'Rollback to previous stable deployment if errors started after recent deploy',
          command: 'kubectl rollout undo deployment/{service_name}',
          risk_level: 'medium',
          prerequisites: ['Recent deployment within 1 hour'],
          expected_outcome: 'Restore service to stable state',
          rollback_plan: 'Redeploy current version if rollback fails'
        },
        {
          action_type: 'scale',
          description: 'Scale up service replicas to handle load',
          command: 'kubectl scale deployment/{service_name} --replicas=5',
          risk_level: 'low',
          expected_outcome: 'Distribute load across more instances'
        }
      ],
      success_rate: 0.85,
      avg_resolution_time_minutes: 15
    });

    // High Latency Playbook
    this.playbooks.push({
      playbook_name: 'Latency Mitigation',
      alert_type: 'latency',
      severity_levels: ['medium', 'high', 'critical'],
      conditions: ['response_time > 3000'],
      actions: [
        {
          action_type: 'cache_clear',
          description: 'Clear application cache to remove stale data',
          command: 'curl -X POST http://{service_name}/admin/cache/clear',
          risk_level: 'low',
          expected_outcome: 'Reduced latency from fresh cache'
        },
        {
          action_type: 'investigate',
          description: 'Check database query performance and slow queries',
          risk_level: 'low',
          expected_outcome: 'Identify slow database operations'
        },
        {
          action_type: 'scale',
          description: 'Scale up resources if CPU/memory constrained',
          command: 'kubectl scale deployment/{service_name} --replicas=+2',
          risk_level: 'low',
          expected_outcome: 'Improved response times with more resources'
        }
      ],
      success_rate: 0.75,
      avg_resolution_time_minutes: 20
    });

    // Resource Exhaustion Playbook
    this.playbooks.push({
      playbook_name: 'Resource Exhaustion Response',
      alert_type: 'resource',
      severity_levels: ['high', 'critical'],
      conditions: ['cpu_usage > 80', 'memory_usage > 85'],
      actions: [
        {
          action_type: 'scale',
          description: 'Immediately scale up service replicas',
          command: 'kubectl scale deployment/{service_name} --replicas=+3',
          risk_level: 'low',
          expected_outcome: 'Distribute load to prevent outage',
          rollback_plan: 'Scale down after load stabilizes'
        },
        {
          action_type: 'restart',
          description: 'Restart service to clear memory leaks (if pattern detected)',
          command: 'kubectl rollout restart deployment/{service_name}',
          risk_level: 'medium',
          prerequisites: ['Memory leak pattern detected', 'Service has >3 replicas'],
          expected_outcome: 'Free up leaked resources',
          rollback_plan: 'Restore from backup if restart causes issues'
        },
        {
          action_type: 'investigate',
          description: 'Analyze resource usage patterns and identify memory/CPU hogs',
          risk_level: 'low',
          expected_outcome: 'Identify optimization opportunities'
        }
      ],
      success_rate: 0.90,
      avg_resolution_time_minutes: 10
    });

    // Traffic Spike Playbook
    this.playbooks.push({
      playbook_name: 'Traffic Spike Handling',
      alert_type: 'traffic',
      severity_levels: ['medium', 'high', 'critical'],
      conditions: ['traffic_rate > threshold * 2'],
      actions: [
        {
          action_type: 'scale',
          description: 'Auto-scale to handle traffic spike',
          command: 'kubectl autoscale deployment/{service_name} --min=5 --max=20 --cpu-percent=70',
          risk_level: 'low',
          expected_outcome: 'Automatically handle traffic increases'
        },
        {
          action_type: 'rate_limit',
          description: 'Enable rate limiting to protect service',
          command: 'curl -X POST http://{service_name}/admin/ratelimit/enable',
          risk_level: 'medium',
          prerequisites: ['Rate limiting configured'],
          expected_outcome: 'Prevent service overload',
          rollback_plan: 'Disable rate limiting when traffic normalizes'
        },
        {
          action_type: 'investigate',
          description: 'Check if traffic spike is legitimate or potential DDoS',
          risk_level: 'low',
          expected_outcome: 'Determine traffic source and legitimacy'
        }
      ],
      success_rate: 0.80,
      avg_resolution_time_minutes: 12
    });

    // Availability Crisis Playbook
    this.playbooks.push({
      playbook_name: 'Availability Recovery',
      alert_type: 'availability',
      severity_levels: ['high', 'critical'],
      conditions: ['error_rate > 0.5', 'availability < 0.5'],
      actions: [
        {
          action_type: 'restart',
          description: 'Emergency restart of all service instances',
          command: 'kubectl rollout restart deployment/{service_name}',
          risk_level: 'high',
          prerequisites: ['Service has >1 replica', 'Backup available'],
          expected_outcome: 'Restore service availability',
          rollback_plan: 'Rollback to previous version if restart fails'
        },
        {
          action_type: 'rollback',
          description: 'Rollback to last known good deployment',
          command: 'kubectl rollout undo deployment/{service_name}',
          risk_level: 'medium',
          prerequisites: ['Recent deployment detected'],
          expected_outcome: 'Return to stable version',
          rollback_plan: 'Manual intervention required'
        },
        {
          action_type: 'investigate',
          description: 'Check dependent services and infrastructure',
          risk_level: 'low',
          expected_outcome: 'Identify root cause of unavailability'
        },
        {
          action_type: 'manual',
          description: 'Escalate to on-call engineer for immediate investigation',
          risk_level: 'low',
          expected_outcome: 'Expert intervention'
        }
      ],
      success_rate: 0.70,
      avg_resolution_time_minutes: 25
    });
  }

  /**
   * Generate remediation suggestions for an alert
   */
  generateSuggestion(alert: NormalizedAlertEvent): RemediationSuggestion {
    const playbook = this.findMatchingPlaybook(alert);
    
    if (!playbook) {
      return this.createDefaultSuggestion(alert);
    }

    const priority = this.determinePriority(alert);
    const actions = this.customizeActions(playbook.actions, alert);
    const canAutoExecute = this.canAutoExecute(alert, actions);

    return {
      suggestion_id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alert_id: `${alert.service_name}-${alert.timestamp}`,
      service_name: alert.service_name,
      alert_type: alert.alert_type,
      severity: alert.severity,
      priority: priority,
      actions: actions,
      estimated_resolution_time: `${playbook.avg_resolution_time_minutes} minutes`,
      requires_approval: !canAutoExecute,
      can_auto_execute: canAutoExecute,
      confidence: playbook.success_rate
    };
  }

  /**
   * Find matching playbook for alert
   */
  private findMatchingPlaybook(alert: NormalizedAlertEvent): RemediationPlaybook | null {
    for (const playbook of this.playbooks) {
      if (
        playbook.alert_type === alert.alert_type &&
        playbook.severity_levels.includes(alert.severity)
      ) {
        return playbook;
      }
    }
    return null;
  }

  /**
   * Determine priority based on alert characteristics
   */
  private determinePriority(alert: NormalizedAlertEvent): 'immediate' | 'high' | 'medium' | 'low' {
    if (alert.severity === 'critical') {
      return 'immediate';
    }
    
    if (alert.severity === 'high') {
      return 'high';
    }

    if (alert.alert_type === 'availability' || alert.alert_type === 'error') {
      return 'high';
    }

    if (alert.severity === 'medium') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Customize actions with alert-specific details
   */
  private customizeActions(actions: RemediationAction[], alert: NormalizedAlertEvent): RemediationAction[] {
    return actions.map(action => ({
      ...action,
      command: action.command?.replace('{service_name}', alert.service_name)
    }));
  }

  /**
   * Determine if actions can be auto-executed
   */
  private canAutoExecute(alert: NormalizedAlertEvent, actions: RemediationAction[]): boolean {
    // Only auto-execute low-risk actions for non-critical alerts
    if (alert.severity === 'critical') {
      return false;
    }

    const hasHighRisk = actions.some(action => action.risk_level === 'high');
    if (hasHighRisk) {
      return false;
    }

    // Auto-execute only for scaling actions
    const onlyScaling = actions.every(
      action => action.action_type === 'scale' || action.action_type === 'investigate'
    );

    return onlyScaling;
  }

  /**
   * Create default suggestion when no playbook matches
   */
  private createDefaultSuggestion(alert: NormalizedAlertEvent): RemediationSuggestion {
    const defaultActions: RemediationAction[] = [
      {
        action_type: 'investigate',
        description: `Investigate ${alert.alert_type} alert for ${alert.service_name}`,
        risk_level: 'low',
        expected_outcome: 'Understand the issue'
      },
      {
        action_type: 'manual',
        description: 'Review logs and metrics manually',
        risk_level: 'low',
        expected_outcome: 'Manual diagnosis'
      }
    ];

    return {
      suggestion_id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alert_id: `${alert.service_name}-${alert.timestamp}`,
      service_name: alert.service_name,
      alert_type: alert.alert_type,
      severity: alert.severity,
      priority: 'medium',
      actions: defaultActions,
      estimated_resolution_time: '30 minutes',
      requires_approval: true,
      can_auto_execute: false,
      confidence: 0.5
    };
  }

  /**
   * Generate suggestions for multiple alerts
   */
  generateSuggestions(alerts: NormalizedAlertEvent[]): RemediationSuggestion[] {
    return alerts.map(alert => this.generateSuggestion(alert));
  }

  /**
   * Get remediation metrics
   */
  getRemediationMetrics(suggestions: RemediationSuggestion[]): RemediationMetrics {
    const metrics: RemediationMetrics = {
      total_suggestions: suggestions.length,
      auto_executable: 0,
      manual_required: 0,
      by_priority: {
        immediate: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      estimated_time_saved_hours: 0
    };

    suggestions.forEach(suggestion => {
      if (suggestion.can_auto_execute) {
        metrics.auto_executable++;
      } else {
        metrics.manual_required++;
      }

      metrics.by_priority[suggestion.priority]++;

      // Estimate time saved (assuming manual investigation takes 30 min)
      const estimatedMinutes = parseInt(suggestion.estimated_resolution_time) || 30;
      metrics.estimated_time_saved_hours += (30 - estimatedMinutes) / 60;
    });

    return metrics;
  }

  /**
   * Format suggestion for display
   */
  formatSuggestion(suggestion: RemediationSuggestion): string {
    const lines: string[] = [
      `=== Remediation Suggestion (${suggestion.suggestion_id}) ===`,
      `Service: ${suggestion.service_name}`,
      `Alert Type: ${suggestion.alert_type}`,
      `Severity: ${suggestion.severity}`,
      `Priority: ${suggestion.priority.toUpperCase()}`,
      `Estimated Resolution: ${suggestion.estimated_resolution_time}`,
      `Can Auto-Execute: ${suggestion.can_auto_execute ? 'Yes' : 'No'}`,
      `Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`,
      ``,
      `Actions:`
    ];

    suggestion.actions.forEach((action, i) => {
      lines.push(`  ${i + 1}. [${action.action_type.toUpperCase()}] ${action.description}`);
      lines.push(`     Risk: ${action.risk_level}`);
      lines.push(`     Expected: ${action.expected_outcome}`);
      if (action.command) {
        lines.push(`     Command: ${action.command}`);
      }
      if (action.rollback_plan) {
        lines.push(`     Rollback: ${action.rollback_plan}`);
      }
      lines.push('');
    });

    return lines.join('\n');
  }
}

