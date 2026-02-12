import { NormalizedAlertEvent } from '../types';

export interface AlertCorrelation {
  correlation_id: string;
  primary_alert: NormalizedAlertEvent;
  related_alerts: NormalizedAlertEvent[];
  correlation_score: number;
  correlation_type: 'temporal' | 'causal' | 'service' | 'cascade';
  time_window_ms: number;
}

export interface Incident {
  incident_id: string;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  alerts: NormalizedAlertEvent[];
  affected_services: string[];
  alert_types: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  root_cause_candidates: RootCause[];
  status: 'active' | 'resolved';
}

export interface RootCause {
  service_name: string;
  alert_type: string;
  confidence: number;
  reasoning: string;
  first_alert_time: string;
  propagation_pattern: string[];
}

export interface CorrelationSummary {
  total_incidents: number;
  avg_alerts_per_incident: number;
  correlation_rate: number;
  noise_reduction: number;
  top_root_causes: RootCause[];
}

export class CorrelationEngine {
  private temporalWindow: number = 300000; // 5 minutes
  private causalWindow: number = 120000; // 2 minutes for cascading
  private minCorrelationScore: number = 0.6;

  constructor(private alerts: NormalizedAlertEvent[]) {}

  /**
   * Find correlated alerts
   */
  findCorrelations(): AlertCorrelation[] {
    const correlations: AlertCorrelation[] = [];
    const processed = new Set<string>();

    // Sort alerts by timestamp
    const sortedAlerts = [...this.alerts].sort(
      (a, b) => a.normalized_timestamp - b.normalized_timestamp
    );

    for (let i = 0; i < sortedAlerts.length; i++) {
      const primaryAlert = sortedAlerts[i];
      const key = `${primaryAlert.service_name}:${primaryAlert.timestamp}:${primaryAlert.alert_type}`;

      if (processed.has(key)) {
        continue;
      }

      const relatedAlerts = this.findRelatedAlerts(primaryAlert, sortedAlerts.slice(i + 1));
      
      if (relatedAlerts.length > 0) {
        const correlation = this.buildCorrelation(primaryAlert, relatedAlerts);
        correlations.push(correlation);
        
        processed.add(key);
        relatedAlerts.forEach(alert => {
          processed.add(`${alert.service_name}:${alert.timestamp}:${alert.alert_type}`);
        });
      }
    }

    return correlations;
  }

  /**
   * Find alerts related to a primary alert
   */
  private findRelatedAlerts(
    primaryAlert: NormalizedAlertEvent,
    candidateAlerts: NormalizedAlertEvent[]
  ): NormalizedAlertEvent[] {
    const related: NormalizedAlertEvent[] = [];

    for (const candidate of candidateAlerts) {
      // Stop if we're beyond the temporal window
      if (candidate.normalized_timestamp - primaryAlert.normalized_timestamp > this.temporalWindow) {
        break;
      }

      const score = this.calculateCorrelationScore(primaryAlert, candidate);
      if (score >= this.minCorrelationScore) {
        related.push(candidate);
      }
    }

    return related;
  }

  /**
   * Calculate correlation score between two alerts
   */
  private calculateCorrelationScore(
    alert1: NormalizedAlertEvent,
    alert2: NormalizedAlertEvent
  ): number {
    let score = 0;

    // Temporal proximity (0-0.4 points)
    const timeDiff = Math.abs(alert2.normalized_timestamp - alert1.normalized_timestamp);
    const temporalScore = Math.max(0, 0.4 * (1 - timeDiff / this.temporalWindow));
    score += temporalScore;

    // Same service (0.3 points)
    if (alert1.service_name === alert2.service_name) {
      score += 0.3;
    }

    // Related services (0.15 points)
    if (this.areServicesRelated(alert1.service_name, alert2.service_name)) {
      score += 0.15;
    }

    // Same or related alert types (0.2 points)
    if (alert1.alert_type === alert2.alert_type) {
      score += 0.2;
    } else if (this.areAlertTypesRelated(alert1.alert_type, alert2.alert_type)) {
      score += 0.1;
    }

    // Severity alignment (0.1 points)
    if (alert1.severity === alert2.severity) {
      score += 0.1;
    }

    return score;
  }

  /**
   * Check if services are related (common architectural patterns)
   */
  private areServicesRelated(service1: string, service2: string): boolean {
    // Define service dependencies
    const dependencies: Record<string, string[]> = {
      'orders-service': ['restaurants-service', 'users-service', 'delivery-service'],
      'delivery-service': ['orders-service', 'restaurants-service'],
      'restaurants-service': ['orders-service'],
      'users-service': ['orders-service']
    };

    return dependencies[service1]?.includes(service2) || 
           dependencies[service2]?.includes(service1) ||
           false;
  }

  /**
   * Check if alert types are related
   */
  private areAlertTypesRelated(type1: string, type2: string): boolean {
    const relatedTypes: Record<string, string[]> = {
      'error': ['availability', 'latency'],
      'latency': ['error', 'resource', 'traffic'],
      'traffic': ['latency', 'resource'],
      'resource': ['latency', 'error'],
      'availability': ['error']
    };

    return relatedTypes[type1]?.includes(type2) || false;
  }

  /**
   * Build correlation object
   */
  private buildCorrelation(
    primaryAlert: NormalizedAlertEvent,
    relatedAlerts: NormalizedAlertEvent[]
  ): AlertCorrelation {
    const avgScore = relatedAlerts.reduce(
      (sum, alert) => sum + this.calculateCorrelationScore(primaryAlert, alert),
      0
    ) / relatedAlerts.length;

    // Determine correlation type
    let correlationType: 'temporal' | 'causal' | 'service' | 'cascade' = 'temporal';
    
    const sameService = relatedAlerts.every(a => a.service_name === primaryAlert.service_name);
    const multiService = new Set(relatedAlerts.map(a => a.service_name)).size > 1;
    const shortWindow = relatedAlerts.every(
      a => a.normalized_timestamp - primaryAlert.normalized_timestamp < this.causalWindow
    );

    if (multiService && shortWindow) {
      correlationType = 'cascade';
    } else if (sameService) {
      correlationType = 'service';
    } else if (shortWindow) {
      correlationType = 'causal';
    }

    return {
      correlation_id: `corr_${primaryAlert.normalized_timestamp}_${Date.now()}`,
      primary_alert: primaryAlert,
      related_alerts: relatedAlerts,
      correlation_score: avgScore,
      correlation_type: correlationType,
      time_window_ms: relatedAlerts.length > 0
        ? relatedAlerts[relatedAlerts.length - 1].normalized_timestamp - primaryAlert.normalized_timestamp
        : 0
    };
  }

  /**
   * Group correlations into incidents
   */
  groupIntoIncidents(correlations: AlertCorrelation[]): Incident[] {
    const incidents: Incident[] = [];
    const processed = new Set<string>();

    for (const correlation of correlations) {
      const primaryKey = `${correlation.primary_alert.service_name}:${correlation.primary_alert.timestamp}`;
      
      if (processed.has(primaryKey)) {
        continue;
      }

      const incident = this.buildIncident(correlation);
      incidents.push(incident);

      // Mark all alerts in this incident as processed
      processed.add(primaryKey);
      correlation.related_alerts.forEach(alert => {
        processed.add(`${alert.service_name}:${alert.timestamp}`);
      });
    }

    return incidents;
  }

  /**
   * Build incident from correlation
   */
  private buildIncident(correlation: AlertCorrelation): Incident {
    const allAlerts = [correlation.primary_alert, ...correlation.related_alerts];
    
    const startTime = Math.min(...allAlerts.map(a => a.normalized_timestamp));
    const endTime = Math.max(...allAlerts.map(a => a.normalized_timestamp));
    
    const affectedServices = [...new Set(allAlerts.map(a => a.service_name))];
    const alertTypes = [...new Set(allAlerts.map(a => a.alert_type))];
    
    // Determine incident severity (highest severity of all alerts)
    const severityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    const maxSeverity = allAlerts.reduce((max, alert) => {
      return severityOrder[alert.severity] > severityOrder[max] ? alert.severity : max;
    }, 'low' as 'low' | 'medium' | 'high' | 'critical');

    // Determine status (resolved if all alerts are resolved)
    const status = allAlerts.every(a => a.alert_state === 'resolved') ? 'resolved' : 'active';

    // Analyze root causes
    const rootCauses = this.identifyRootCauses(allAlerts);

    return {
      incident_id: `incident_${startTime}_${Date.now()}`,
      start_time: new Date(startTime).toISOString(),
      end_time: status === 'resolved' ? new Date(endTime).toISOString() : undefined,
      duration_ms: status === 'resolved' ? endTime - startTime : undefined,
      alerts: allAlerts,
      affected_services: affectedServices,
      alert_types: alertTypes,
      severity: maxSeverity,
      root_cause_candidates: rootCauses,
      status: status
    };
  }

  /**
   * Identify probable root causes
   */
  private identifyRootCauses(alerts: NormalizedAlertEvent[]): RootCause[] {
    const candidates: RootCause[] = [];

    // Sort by timestamp to find the first alert
    const sortedAlerts = [...alerts].sort(
      (a, b) => a.normalized_timestamp - b.normalized_timestamp
    );

    const firstAlert = sortedAlerts[0];
    
    // First alert is often the root cause
    const propagationPattern = this.tracePropagation(firstAlert, sortedAlerts.slice(1));
    
    candidates.push({
      service_name: firstAlert.service_name,
      alert_type: firstAlert.alert_type,
      confidence: 0.8,
      reasoning: 'First alert in incident sequence',
      first_alert_time: firstAlert.timestamp,
      propagation_pattern: propagationPattern
    });

    // Look for resource/latency issues that might cause errors
    const resourceIssues = sortedAlerts.filter(
      a => a.alert_type === 'resource' || a.alert_type === 'latency'
    );

    if (resourceIssues.length > 0 && resourceIssues[0] !== firstAlert) {
      const resourceAlert = resourceIssues[0];
      candidates.push({
        service_name: resourceAlert.service_name,
        alert_type: resourceAlert.alert_type,
        confidence: 0.7,
        reasoning: 'Resource constraint detected before errors',
        first_alert_time: resourceAlert.timestamp,
        propagation_pattern: this.tracePropagation(resourceAlert, sortedAlerts)
      });
    }

    // Sort by confidence
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Trace alert propagation pattern
   */
  private tracePropagation(
    rootAlert: NormalizedAlertEvent,
    subsequentAlerts: NormalizedAlertEvent[]
  ): string[] {
    const pattern: string[] = [`${rootAlert.service_name}:${rootAlert.alert_type}`];
    
    for (const alert of subsequentAlerts) {
      if (alert.normalized_timestamp > rootAlert.normalized_timestamp) {
        pattern.push(`${alert.service_name}:${alert.alert_type}`);
      }
    }

    return pattern;
  }

  /**
   * Generate correlation summary
   */
  generateSummary(correlations: AlertCorrelation[], incidents: Incident[]): CorrelationSummary {
    const totalAlerts = this.alerts.length;
    const correlatedAlerts = correlations.reduce(
      (sum, corr) => sum + corr.related_alerts.length + 1,
      0
    );

    const avgAlertsPerIncident = incidents.length > 0
      ? incidents.reduce((sum, inc) => sum + inc.alerts.length, 0) / incidents.length
      : 0;

    const correlationRate = totalAlerts > 0 ? correlatedAlerts / totalAlerts : 0;
    
    // Noise reduction: if 100 alerts become 20 incidents, that's 80% reduction
    const noiseReduction = totalAlerts > 0
      ? Math.max(0, (totalAlerts - incidents.length) / totalAlerts)
      : 0;

    // Get top root causes
    const rootCauseMap = new Map<string, RootCause>();
    incidents.forEach(incident => {
      incident.root_cause_candidates.forEach(rc => {
        const key = `${rc.service_name}:${rc.alert_type}`;
        const existing = rootCauseMap.get(key);
        if (!existing || rc.confidence > existing.confidence) {
          rootCauseMap.set(key, rc);
        }
      });
    });

    const topRootCauses = Array.from(rootCauseMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    return {
      total_incidents: incidents.length,
      avg_alerts_per_incident: avgAlertsPerIncident,
      correlation_rate: correlationRate,
      noise_reduction: noiseReduction,
      top_root_causes: topRootCauses
    };
  }
}

