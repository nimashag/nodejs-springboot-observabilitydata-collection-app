import { NormalizedAlertEvent } from '../types';
import { Statistics } from '../analyzer/statistics';
import { AdaptiveThreshold } from './threshold-adjuster';

export interface ContextualThreshold {
  service_name: string;
  alert_type: string;
  contexts: ThresholdContext[];
  default_threshold: number;
  confidence: number;
}

export interface ThresholdContext {
  context_name: string;
  context_type: 'time_of_day' | 'day_of_week' | 'deployment' | 'load_level' | 'combined';
  condition: string;
  threshold: number;
  rationale: string;
  sample_size: number;
}

export interface TimeBasedPattern {
  service_name: string;
  alert_type: string;
  peak_hours: number[];
  off_peak_hours: number[];
  weekend_pattern: 'similar' | 'lower' | 'higher';
  peak_threshold: number;
  off_peak_threshold: number;
}

export interface LoadLevelThreshold {
  service_name: string;
  alert_type: string;
  load_levels: {
    low: { threshold: number; traffic_range: string };
    medium: { threshold: number; traffic_range: string };
    high: { threshold: number; traffic_range: string };
  };
}

export class ContextualThresholdAdjuster {
  private hourlyBuckets: number = 24;
  private minSamplesPerContext: number = 5;

  constructor(private alerts: NormalizedAlertEvent[]) {}

  /**
   * Calculate contextual thresholds for all services
   */
  calculateContextualThresholds(): ContextualThreshold[] {
    const thresholds: ContextualThreshold[] = [];
    const services = [...new Set(this.alerts.map(a => a.service_name))];

    for (const service of services) {
      const serviceAlerts = this.alerts.filter(a => a.service_name === service);
      const alertTypes = [...new Set(serviceAlerts.map(a => a.alert_type))];

      for (const alertType of alertTypes) {
        const typeAlerts = serviceAlerts.filter(a => a.alert_type === alertType);
        
        if (typeAlerts.length < this.minSamplesPerContext) {
          continue;
        }

        const contextual = this.buildContextualThreshold(service, alertType, typeAlerts);
        if (contextual) {
          thresholds.push(contextual);
        }
      }
    }

    return thresholds;
  }

  /**
   * Build contextual threshold for service/alert type
   */
  private buildContextualThreshold(
    serviceName: string,
    alertType: string,
    alerts: NormalizedAlertEvent[]
  ): ContextualThreshold | null {
    const contexts: ThresholdContext[] = [];

    // Time-based contexts
    const timeContexts = this.analyzeTimeBasedContexts(serviceName, alertType, alerts);
    contexts.push(...timeContexts);

    // Load-based contexts
    const loadContexts = this.analyzeLoadBasedContexts(serviceName, alertType, alerts);
    contexts.push(...loadContexts);

    // Day-of-week contexts
    const dayContexts = this.analyzeDayOfWeekContexts(serviceName, alertType, alerts);
    contexts.push(...dayContexts);

    if (contexts.length === 0) {
      return null;
    }

    // Calculate default threshold (overall average)
    const defaultThreshold = this.calculateDefaultThreshold(alertType, alerts);

    return {
      service_name: serviceName,
      alert_type: alertType,
      contexts: contexts,
      default_threshold: defaultThreshold,
      confidence: Math.min(0.9, alerts.length / 50)
    };
  }

  /**
   * Analyze time-based contexts (peak vs off-peak hours)
   */
  private analyzeTimeBasedContexts(
    serviceName: string,
    alertType: string,
    alerts: NormalizedAlertEvent[]
  ): ThresholdContext[] {
    const contexts: ThresholdContext[] = [];

    // Group alerts by hour
    const hourlyGroups = new Map<number, NormalizedAlertEvent[]>();
    for (let hour = 0; hour < 24; hour++) {
      hourlyGroups.set(hour, []);
    }

    alerts.forEach(alert => {
      const hour = new Date(alert.timestamp).getHours();
      hourlyGroups.get(hour)!.push(alert);
    });

    // Calculate average for each hour
    const hourlyAverages = new Map<number, number>();
    hourlyGroups.forEach((hourAlerts, hour) => {
      if (hourAlerts.length > 0) {
        const values = this.extractMetricValues(alertType, hourAlerts);
        if (values.length > 0) {
          hourlyAverages.set(hour, Statistics.mean(values));
        }
      }
    });

    // Identify peak and off-peak hours
    const allAverages = Array.from(hourlyAverages.values());
    if (allAverages.length < 6) {
      return contexts; // Not enough data
    }

    const overallMean = Statistics.mean(allAverages);
    const peakHours: number[] = [];
    const offPeakHours: number[] = [];

    hourlyAverages.forEach((avg, hour) => {
      if (avg > overallMean * 1.2) {
        peakHours.push(hour);
      } else if (avg < overallMean * 0.8) {
        offPeakHours.push(hour);
      }
    });

    // Create peak hours context
    if (peakHours.length > 0) {
      const peakAlerts = alerts.filter(a => {
        const hour = new Date(a.timestamp).getHours();
        return peakHours.includes(hour);
      });

      if (peakAlerts.length >= this.minSamplesPerContext) {
        const peakValues = this.extractMetricValues(alertType, peakAlerts);
        const peakThreshold = this.calculateThreshold(peakValues);

        contexts.push({
          context_name: 'Peak Hours',
          context_type: 'time_of_day',
          condition: `hour in [${peakHours.join(', ')}]`,
          threshold: peakThreshold,
          rationale: `Higher threshold for peak hours (${peakHours.length}h) due to elevated baseline`,
          sample_size: peakAlerts.length
        });
      }
    }

    // Create off-peak hours context
    if (offPeakHours.length > 0) {
      const offPeakAlerts = alerts.filter(a => {
        const hour = new Date(a.timestamp).getHours();
        return offPeakHours.includes(hour);
      });

      if (offPeakAlerts.length >= this.minSamplesPerContext) {
        const offPeakValues = this.extractMetricValues(alertType, offPeakAlerts);
        const offPeakThreshold = this.calculateThreshold(offPeakValues);

        contexts.push({
          context_name: 'Off-Peak Hours',
          context_type: 'time_of_day',
          condition: `hour in [${offPeakHours.join(', ')}]`,
          threshold: offPeakThreshold,
          rationale: `Lower threshold for off-peak hours (${offPeakHours.length}h) - less tolerance for issues`,
          sample_size: offPeakAlerts.length
        });
      }
    }

    return contexts;
  }

  /**
   * Analyze load-based contexts
   */
  private analyzeLoadBasedContexts(
    serviceName: string,
    alertType: string,
    alerts: NormalizedAlertEvent[]
  ): ThresholdContext[] {
    const contexts: ThresholdContext[] = [];

    // Extract traffic levels
    const trafficLevels = alerts.map(a => a.traffic_rate || a.request_count);
    if (trafficLevels.every(t => t === 0)) {
      return contexts; // No traffic data
    }

    const sortedTraffic = [...trafficLevels].sort((a, b) => a - b);
    const p33 = Statistics.percentile(sortedTraffic, 33);
    const p66 = Statistics.percentile(sortedTraffic, 66);

    // Low load context
    const lowLoadAlerts = alerts.filter(a => {
      const traffic = a.traffic_rate || a.request_count;
      return traffic <= p33;
    });

    if (lowLoadAlerts.length >= this.minSamplesPerContext) {
      const values = this.extractMetricValues(alertType, lowLoadAlerts);
      const threshold = this.calculateThreshold(values);

      contexts.push({
        context_name: 'Low Load',
        context_type: 'load_level',
        condition: `traffic <= ${p33.toFixed(0)}`,
        threshold: threshold,
        rationale: 'Lower threshold during low load - should handle traffic easily',
        sample_size: lowLoadAlerts.length
      });
    }

    // High load context
    const highLoadAlerts = alerts.filter(a => {
      const traffic = a.traffic_rate || a.request_count;
      return traffic >= p66;
    });

    if (highLoadAlerts.length >= this.minSamplesPerContext) {
      const values = this.extractMetricValues(alertType, highLoadAlerts);
      const threshold = this.calculateThreshold(values);

      contexts.push({
        context_name: 'High Load',
        context_type: 'load_level',
        condition: `traffic >= ${p66.toFixed(0)}`,
        threshold: threshold,
        rationale: 'Higher threshold during high load - expected degradation',
        sample_size: highLoadAlerts.length
      });
    }

    return contexts;
  }

  /**
   * Analyze day-of-week contexts
   */
  private analyzeDayOfWeekContexts(
    serviceName: string,
    alertType: string,
    alerts: NormalizedAlertEvent[]
  ): ThresholdContext[] {
    const contexts: ThresholdContext[] = [];

    // Group by weekday vs weekend
    const weekdayAlerts = alerts.filter(a => {
      const day = new Date(a.timestamp).getDay();
      return day >= 1 && day <= 5;
    });

    const weekendAlerts = alerts.filter(a => {
      const day = new Date(a.timestamp).getDay();
      return day === 0 || day === 6;
    });

    // Weekday context
    if (weekdayAlerts.length >= this.minSamplesPerContext) {
      const values = this.extractMetricValues(alertType, weekdayAlerts);
      const threshold = this.calculateThreshold(values);

      contexts.push({
        context_name: 'Weekdays',
        context_type: 'day_of_week',
        condition: 'day in [Monday-Friday]',
        threshold: threshold,
        rationale: 'Weekday threshold based on business day patterns',
        sample_size: weekdayAlerts.length
      });
    }

    // Weekend context
    if (weekendAlerts.length >= this.minSamplesPerContext) {
      const values = this.extractMetricValues(alertType, weekendAlerts);
      const threshold = this.calculateThreshold(values);

      contexts.push({
        context_name: 'Weekends',
        context_type: 'day_of_week',
        condition: 'day in [Saturday, Sunday]',
        threshold: threshold,
        rationale: 'Weekend threshold - different usage patterns',
        sample_size: weekendAlerts.length
      });
    }

    return contexts;
  }

  /**
   * Extract metric values based on alert type
   */
  private extractMetricValues(alertType: string, alerts: NormalizedAlertEvent[]): number[] {
    const values: number[] = [];

    for (const alert of alerts) {
      let value = 0;

      switch (alertType) {
        case 'error':
          value = alert.error_count;
          break;
        case 'latency':
          value = alert.average_response_time;
          break;
        case 'availability':
          value = alert.request_count > 0 ? alert.error_count / alert.request_count : 0;
          break;
        case 'traffic':
          value = alert.traffic_rate || alert.request_count;
          break;
        case 'resource':
          value = alert.process_cpu_usage || 0;
          if (value > 100) value = value / 10000000;
          break;
      }

      if (value > 0) {
        values.push(value);
      }
    }

    return values;
  }

  /**
   * Calculate threshold from values
   */
  private calculateThreshold(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const mean = Statistics.mean(values);
    const std = Statistics.stdDev(values);
    const p75 = Statistics.percentile(values, 75);
    const p90 = Statistics.percentile(values, 90);

    // Use p90 or mean + 1.5*std, whichever is higher
    const threshold = Math.max(p90, mean + 1.5 * std);
    
    return Math.ceil(threshold);
  }

  /**
   * Calculate default threshold
   */
  private calculateDefaultThreshold(alertType: string, alerts: NormalizedAlertEvent[]): number {
    const values = this.extractMetricValues(alertType, alerts);
    return this.calculateThreshold(values);
  }

  /**
   * Analyze time-based patterns
   */
  analyzeTimeBasedPatterns(): TimeBasedPattern[] {
    const patterns: TimeBasedPattern[] = [];
    const services = [...new Set(this.alerts.map(a => a.service_name))];

    for (const service of services) {
      const serviceAlerts = this.alerts.filter(a => a.service_name === service);
      const alertTypes = [...new Set(serviceAlerts.map(a => a.alert_type))];

      for (const alertType of alertTypes) {
        const typeAlerts = serviceAlerts.filter(a => a.alert_type === alertType);
        
        if (typeAlerts.length < 20) {
          continue;
        }

        const pattern = this.identifyTimePattern(service, alertType, typeAlerts);
        if (pattern) {
          patterns.push(pattern);
        }
      }
    }

    return patterns;
  }

  /**
   * Identify time pattern for service/alert type
   */
  private identifyTimePattern(
    serviceName: string,
    alertType: string,
    alerts: NormalizedAlertEvent[]
  ): TimeBasedPattern | null {
    // Analyze hourly distribution
    const hourlyDistribution = new Map<number, number>();
    for (let hour = 0; hour < 24; hour++) {
      hourlyDistribution.set(hour, 0);
    }

    alerts.forEach(alert => {
      const hour = new Date(alert.timestamp).getHours();
      hourlyDistribution.set(hour, hourlyDistribution.get(hour)! + 1);
    });

    const hourlyValues = Array.from(hourlyDistribution.values());
    const mean = Statistics.mean(hourlyValues);

    // Identify peak hours (>20% above average)
    const peakHours: number[] = [];
    const offPeakHours: number[] = [];

    hourlyDistribution.forEach((count, hour) => {
      if (count > mean * 1.2) {
        peakHours.push(hour);
      } else if (count < mean * 0.8) {
        offPeakHours.push(hour);
      }
    });

    // Weekend pattern
    const weekdayCount = alerts.filter(a => {
      const day = new Date(a.timestamp).getDay();
      return day >= 1 && day <= 5;
    }).length;

    const weekendCount = alerts.filter(a => {
      const day = new Date(a.timestamp).getDay();
      return day === 0 || day === 6;
    }).length;

    let weekendPattern: 'similar' | 'lower' | 'higher' = 'similar';
    if (weekendCount < weekdayCount * 0.3) {
      weekendPattern = 'lower';
    } else if (weekendCount > weekdayCount * 0.5) {
      weekendPattern = 'higher';
    }

    // Calculate thresholds
    const peakAlerts = alerts.filter(a => peakHours.includes(new Date(a.timestamp).getHours()));
    const offPeakAlerts = alerts.filter(a => offPeakHours.includes(new Date(a.timestamp).getHours()));

    const peakValues = this.extractMetricValues(alertType, peakAlerts);
    const offPeakValues = this.extractMetricValues(alertType, offPeakAlerts);

    return {
      service_name: serviceName,
      alert_type: alertType,
      peak_hours: peakHours,
      off_peak_hours: offPeakHours,
      weekend_pattern: weekendPattern,
      peak_threshold: this.calculateThreshold(peakValues),
      off_peak_threshold: this.calculateThreshold(offPeakValues)
    };
  }
}

