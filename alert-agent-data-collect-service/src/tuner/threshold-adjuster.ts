import { NormalizedAlertEvent } from '../types';
import { Statistics } from '../analyzer/statistics';
import { ServiceBaseline } from '../analyzer/historical-analyzer';

export interface AdaptiveThreshold {
  service_name: string;
  alert_type: string;
  current_threshold: number;
  recommended_threshold: number;
  adjustment_percentage: number;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
  based_on_samples: number;
  // Enhanced labeling fields
  threshold_label: string;
  description: string;
  unit: string;
  category: 'error' | 'performance' | 'availability' | 'resource' | 'traffic';
}

export interface ThresholdConfig {
  generated_at: string;
  thresholds: Record<string, ServiceThresholds>;
}

export interface ServiceThresholds {
  error_burst_threshold?: number;
  error_burst_window: number;
  high_latency_threshold?: number;
  availability_error_rate?: number;
  traffic_rate_threshold?: number;
  cpu_usage_threshold?: number;
  memory_usage_threshold?: number;
  [key: string]: number | undefined;
}

export class ThresholdAdjuster {
  // Current static thresholds (from your services)
  private static readonly CURRENT_THRESHOLDS = {
    ERROR_BURST_THRESHOLD: 5,
    ERROR_BURST_WINDOW: 60000,
    HIGH_LATENCY_THRESHOLD: 3000,
    AVAILABILITY_ERROR_RATE: 0.5,
    TRAFFIC_RATE_THRESHOLD: 100, // requests/sec
    CPU_USAGE_THRESHOLD: 80, // percentage
    MEMORY_USAGE_THRESHOLD: 85 // percentage
  };

  constructor(
    private alerts: NormalizedAlertEvent[],
    private baselines: Record<string, ServiceBaseline>
  ) {}

  /**
   * Calculate adaptive thresholds for all services and all alert types
   */
  calculateAdaptiveThresholds(): AdaptiveThreshold[] {
    const recommendations: AdaptiveThreshold[] = [];
    const services = [...new Set(this.alerts.map(a => a.service_name))];

    for (const service of services) {
      const serviceAlerts = this.alerts.filter(a => a.service_name === service);
      
      // Get all alert types for this service
      const alertTypes = [...new Set(serviceAlerts.map(a => a.alert_type))];
      
      for (const alertType of alertTypes) {
        const threshold = this.calculateThresholdForType(serviceAlerts, alertType);
        if (threshold) {
          recommendations.push(threshold);
        }
      }
    }

    return recommendations;
  }

  /**
   * Calculate threshold for a specific alert type
   */
  private calculateThresholdForType(alerts: NormalizedAlertEvent[], alertType: string): AdaptiveThreshold | null {
    switch (alertType) {
      case 'error':
        return this.calculateErrorBurstThreshold(alerts);
      case 'availability':
        return this.calculateAvailabilityThreshold(alerts);
      case 'latency':
        return this.calculateLatencyThreshold(alerts);
      case 'traffic':
        return this.calculateTrafficThreshold(alerts);
      case 'resource':
        return this.calculateResourceThreshold(alerts);
      default:
        console.warn(`Unknown alert type: ${alertType}`);
        return null;
    }
  }

  /**
   * Calculate error burst threshold using statistical methods
   */
  private calculateErrorBurstThreshold(alerts: NormalizedAlertEvent[]): AdaptiveThreshold {
    const errorAlerts = alerts.filter(a => a.alert_type === 'error');
    const errorCounts = errorAlerts.map(a => a.error_count);

    if (errorCounts.length < 5) {
      return this.getDefaultThreshold(alerts[0]?.service_name || 'unknown', 'error');
    }

    // Use statistical analysis: mean + k*std
    const mean = Statistics.mean(errorCounts);
    const std = Statistics.stdDev(errorCounts);
    const p75 = Statistics.percentile(errorCounts, 75);
    const p90 = Statistics.percentile(errorCounts, 90);

    // Calculate false positive rate
    const resolvedQuickly = errorAlerts.filter(
      a => a.alert_state === 'resolved' && a.alert_duration && a.alert_duration < 30000
    );
    const resolvedAlerts = errorAlerts.filter(a => a.alert_state === 'resolved');
    const fpRate = resolvedAlerts.length > 0 
      ? resolvedQuickly.length / resolvedAlerts.length 
      : 0;

    // Adjust sensitivity factor (k) based on FP rate
    let k = 1.5; // Base sensitivity
    if (fpRate > 0.4) k = 2.5; // Less sensitive if high FP
    else if (fpRate > 0.2) k = 2.0;

    // Calculate recommended threshold
    // Use the higher of: (mean + k*std) or 75th percentile
    const statisticalThreshold = mean + k * std;
    const recommendedThreshold = Math.max(
      3, // Minimum threshold
      Math.ceil(Math.max(statisticalThreshold, p75))
    );

    const currentThreshold = ThresholdAdjuster.CURRENT_THRESHOLDS.ERROR_BURST_THRESHOLD;

    return {
      service_name: alerts[0]?.service_name || 'unknown',
      alert_type: 'error',
      current_threshold: currentThreshold,
      recommended_threshold: recommendedThreshold,
      adjustment_percentage: ((recommendedThreshold - currentThreshold) / currentThreshold) * 100,
      confidence: errorCounts.length > 20 ? 'high' : errorCounts.length > 10 ? 'medium' : 'low',
      rationale: `Statistical analysis: mean=${mean.toFixed(1)}, std=${std.toFixed(1)}, p75=${p75.toFixed(1)}, FP rate=${(fpRate * 100).toFixed(1)}%, k=${k}`,
      based_on_samples: errorCounts.length,
      threshold_label: 'Error Burst Threshold',
      description: 'Maximum number of errors allowed within the time window before triggering an alert',
      unit: 'errors',
      category: 'error'
    };
  }

  /**
   * Calculate availability threshold
   */
  private calculateAvailabilityThreshold(alerts: NormalizedAlertEvent[]): AdaptiveThreshold {
    const availAlerts = alerts.filter(a => a.alert_type === 'availability');
    
    if (availAlerts.length < 3) {
      return this.getDefaultThreshold(alerts[0]?.service_name || 'unknown', 'availability');
    }

    // Calculate error rates from alerts
    const errorRates = availAlerts.map(a => 
      a.request_count > 0 ? a.error_count / a.request_count : 0
    );
    
    const mean = Statistics.mean(errorRates);
    const p90 = Statistics.percentile(errorRates, 90);
    const p95 = Statistics.percentile(errorRates, 95);
    
    // Use 90th percentile as threshold (balance between sensitivity and noise)
    const recommendedRate = Math.max(0.3, Math.min(0.8, p90));
    const currentRate = ThresholdAdjuster.CURRENT_THRESHOLDS.AVAILABILITY_ERROR_RATE;

    return {
      service_name: alerts[0]?.service_name || 'unknown',
      alert_type: 'availability',
      current_threshold: currentRate,
      recommended_threshold: parseFloat(recommendedRate.toFixed(2)),
      adjustment_percentage: ((recommendedRate - currentRate) / currentRate) * 100,
      confidence: availAlerts.length > 15 ? 'high' : availAlerts.length > 8 ? 'medium' : 'low',
      rationale: `Percentile analysis: mean=${(mean * 100).toFixed(1)}%, p90=${(p90 * 100).toFixed(1)}%, p95=${(p95 * 100).toFixed(1)}%`,
      based_on_samples: availAlerts.length,
      threshold_label: 'Availability Error Rate Threshold',
      description: 'Maximum acceptable error rate (0.0 to 1.0) before triggering an availability alert',
      unit: 'rate',
      category: 'availability'
    };
  }

  /**
   * Calculate latency threshold
   */
  private calculateLatencyThreshold(alerts: NormalizedAlertEvent[]): AdaptiveThreshold {
    const latencyAlerts = alerts.filter(a => a.alert_type === 'latency');
    
    if (latencyAlerts.length < 3) {
      return this.getDefaultThreshold(alerts[0]?.service_name || 'unknown', 'latency');
    }

    // Extract response times
    const responseTimes = latencyAlerts.map(a => a.average_response_time).filter(rt => rt > 0);
    
    if (responseTimes.length === 0) {
      return this.getDefaultThreshold(alerts[0]?.service_name || 'unknown', 'latency');
    }

    const mean = Statistics.mean(responseTimes);
    const std = Statistics.stdDev(responseTimes);
    const p75 = Statistics.percentile(responseTimes, 75);
    const p90 = Statistics.percentile(responseTimes, 90);
    const p95 = Statistics.percentile(responseTimes, 95);

    // Use p90 for latency threshold
    const recommendedThreshold = Math.ceil(Math.max(p90, mean + 2 * std));
    const currentThreshold = ThresholdAdjuster.CURRENT_THRESHOLDS.HIGH_LATENCY_THRESHOLD;

    return {
      service_name: alerts[0]?.service_name || 'unknown',
      alert_type: 'latency',
      current_threshold: currentThreshold,
      recommended_threshold: recommendedThreshold,
      adjustment_percentage: ((recommendedThreshold - currentThreshold) / currentThreshold) * 100,
      confidence: latencyAlerts.length > 10 ? 'high' : latencyAlerts.length > 5 ? 'medium' : 'low',
      rationale: `Latency analysis: mean=${mean.toFixed(1)}ms, std=${std.toFixed(1)}ms, p75=${p75.toFixed(1)}ms, p90=${p90.toFixed(1)}ms, p95=${p95.toFixed(1)}ms`,
      based_on_samples: latencyAlerts.length,
      threshold_label: 'High Latency Threshold',
      description: 'Maximum acceptable response time in milliseconds before triggering a latency alert',
      unit: 'milliseconds',
      category: 'performance'
    };
  }

  /**
   * Calculate traffic threshold
   */
  private calculateTrafficThreshold(alerts: NormalizedAlertEvent[]): AdaptiveThreshold {
    const trafficAlerts = alerts.filter(a => a.alert_type === 'traffic');
    
    if (trafficAlerts.length < 3) {
      return this.getDefaultThreshold(alerts[0]?.service_name || 'unknown', 'traffic');
    }

    // Extract traffic rates (using request_count as proxy)
    const trafficRates = trafficAlerts
      .map(a => a.traffic_rate || a.request_count)
      .filter(rate => rate > 0);
    
    if (trafficRates.length === 0) {
      return this.getDefaultThreshold(alerts[0]?.service_name || 'unknown', 'traffic');
    }

    const mean = Statistics.mean(trafficRates);
    const std = Statistics.stdDev(trafficRates);
    const p90 = Statistics.percentile(trafficRates, 90);
    const p95 = Statistics.percentile(trafficRates, 95);

    // Use p90 + buffer for traffic spike detection
    const recommendedThreshold = Math.ceil(Math.max(p90, mean + 2 * std));
    const currentThreshold = ThresholdAdjuster.CURRENT_THRESHOLDS.TRAFFIC_RATE_THRESHOLD;

    return {
      service_name: alerts[0]?.service_name || 'unknown',
      alert_type: 'traffic',
      current_threshold: currentThreshold,
      recommended_threshold: recommendedThreshold,
      adjustment_percentage: ((recommendedThreshold - currentThreshold) / currentThreshold) * 100,
      confidence: trafficAlerts.length > 10 ? 'high' : trafficAlerts.length > 5 ? 'medium' : 'low',
      rationale: `Traffic analysis: mean=${mean.toFixed(1)}, std=${std.toFixed(1)}, p90=${p90.toFixed(1)}, p95=${p95.toFixed(1)}`,
      based_on_samples: trafficAlerts.length,
      threshold_label: 'Traffic Rate Threshold',
      description: 'Maximum acceptable traffic rate (requests/sec) before triggering a traffic alert',
      unit: 'requests/sec',
      category: 'traffic'
    };
  }

  /**
   * Calculate resource threshold (CPU/Memory)
   */
  private calculateResourceThreshold(alerts: NormalizedAlertEvent[]): AdaptiveThreshold {
    const resourceAlerts = alerts.filter(a => a.alert_type === 'resource');
    
    if (resourceAlerts.length < 3) {
      return this.getDefaultThreshold(alerts[0]?.service_name || 'unknown', 'resource');
    }

    // Extract CPU usage percentages
    const cpuUsages = resourceAlerts
      .map(a => {
        // Convert CPU usage to percentage if needed
        if (a.process_cpu_usage && a.process_cpu_usage > 0) {
          // If it's a large number (microseconds), convert to percentage
          return a.process_cpu_usage > 100 ? (a.process_cpu_usage / 10000000) : a.process_cpu_usage;
        }
        return 0;
      })
      .filter(cpu => cpu > 0 && cpu <= 100);

    if (cpuUsages.length === 0) {
      return this.getDefaultThreshold(alerts[0]?.service_name || 'unknown', 'resource');
    }

    const mean = Statistics.mean(cpuUsages);
    const std = Statistics.stdDev(cpuUsages);
    const p75 = Statistics.percentile(cpuUsages, 75);
    const p90 = Statistics.percentile(cpuUsages, 90);

    // Use p90 for resource threshold
    const recommendedThreshold = Math.ceil(Math.min(95, Math.max(p90, mean + 1.5 * std)));
    const currentThreshold = ThresholdAdjuster.CURRENT_THRESHOLDS.CPU_USAGE_THRESHOLD;

    return {
      service_name: alerts[0]?.service_name || 'unknown',
      alert_type: 'resource',
      current_threshold: currentThreshold,
      recommended_threshold: recommendedThreshold,
      adjustment_percentage: ((recommendedThreshold - currentThreshold) / currentThreshold) * 100,
      confidence: resourceAlerts.length > 10 ? 'high' : resourceAlerts.length > 5 ? 'medium' : 'low',
      rationale: `Resource analysis: mean CPU=${mean.toFixed(1)}%, std=${std.toFixed(1)}%, p75=${p75.toFixed(1)}%, p90=${p90.toFixed(1)}%`,
      based_on_samples: resourceAlerts.length,
      threshold_label: 'Resource Usage Threshold',
      description: 'Maximum acceptable CPU/memory usage percentage before triggering a resource alert',
      unit: 'percentage',
      category: 'resource'
    };
  }

  /**
   * Get default threshold when insufficient data
   */
  private getDefaultThreshold(serviceName: string, alertType: string): AdaptiveThreshold {
    const thresholdConfig: Record<string, {
      current: number;
      label: string;
      description: string;
      unit: string;
      category: 'error' | 'performance' | 'availability' | 'resource' | 'traffic';
    }> = {
      error: {
        current: ThresholdAdjuster.CURRENT_THRESHOLDS.ERROR_BURST_THRESHOLD,
        label: 'Error Burst Threshold',
        description: 'Maximum number of errors allowed within the time window before triggering an alert',
        unit: 'errors',
        category: 'error'
      },
      availability: {
        current: ThresholdAdjuster.CURRENT_THRESHOLDS.AVAILABILITY_ERROR_RATE,
        label: 'Availability Error Rate Threshold',
        description: 'Maximum acceptable error rate (0.0 to 1.0) before triggering an availability alert',
        unit: 'rate',
        category: 'availability'
      },
      latency: {
        current: ThresholdAdjuster.CURRENT_THRESHOLDS.HIGH_LATENCY_THRESHOLD,
        label: 'High Latency Threshold',
        description: 'Maximum acceptable response time in milliseconds before triggering a latency alert',
        unit: 'milliseconds',
        category: 'performance'
      },
      traffic: {
        current: ThresholdAdjuster.CURRENT_THRESHOLDS.TRAFFIC_RATE_THRESHOLD,
        label: 'Traffic Rate Threshold',
        description: 'Maximum acceptable traffic rate (requests/sec) before triggering a traffic alert',
        unit: 'requests/sec',
        category: 'traffic'
      },
      resource: {
        current: ThresholdAdjuster.CURRENT_THRESHOLDS.CPU_USAGE_THRESHOLD,
        label: 'Resource Usage Threshold',
        description: 'Maximum acceptable CPU/memory usage percentage before triggering a resource alert',
        unit: 'percentage',
        category: 'resource'
      }
    };

    const config = thresholdConfig[alertType] || thresholdConfig.error;

    return {
      service_name: serviceName,
      alert_type: alertType,
      current_threshold: config.current,
      recommended_threshold: config.current,
      adjustment_percentage: 0,
      confidence: 'low',
      rationale: 'Insufficient data for adjustment (< 3 samples)',
      based_on_samples: 0,
      threshold_label: config.label,
      description: config.description,
      unit: config.unit,
      category: config.category
    };
  }

  /**
   * Export threshold configuration file
   */
  exportThresholdConfig(): ThresholdConfig {
    const services = [...new Set(this.alerts.map(a => a.service_name))];
    const thresholds: Record<string, ServiceThresholds> = {};

    for (const service of services) {
      const serviceAlerts = this.alerts.filter(a => a.service_name === service);
      const alertTypes = [...new Set(serviceAlerts.map(a => a.alert_type))];
      
      const serviceThresholds: ServiceThresholds = {
        error_burst_window: ThresholdAdjuster.CURRENT_THRESHOLDS.ERROR_BURST_WINDOW
      };

      for (const alertType of alertTypes) {
        const threshold = this.calculateThresholdForType(serviceAlerts, alertType);
        if (threshold) {
          switch (alertType) {
            case 'error':
              serviceThresholds.error_burst_threshold = threshold.recommended_threshold;
              break;
            case 'availability':
              serviceThresholds.availability_error_rate = threshold.recommended_threshold;
              break;
            case 'latency':
              serviceThresholds.high_latency_threshold = threshold.recommended_threshold;
              break;
            case 'traffic':
              serviceThresholds.traffic_rate_threshold = threshold.recommended_threshold;
              break;
            case 'resource':
              serviceThresholds.cpu_usage_threshold = threshold.recommended_threshold;
              break;
          }
        }
      }

      thresholds[service] = serviceThresholds;
    }

    return {
      generated_at: new Date().toISOString(),
      thresholds
    };
  }

  /**
   * Group thresholds by category
   */
  groupThresholdsByCategory(thresholds: AdaptiveThreshold[]): Record<string, AdaptiveThreshold[]> {
    const grouped: Record<string, AdaptiveThreshold[]> = {
      error: [],
      performance: [],
      availability: [],
      resource: [],
      traffic: []
    };

    thresholds.forEach(threshold => {
      if (grouped[threshold.category]) {
        grouped[threshold.category].push(threshold);
      }
    });

    return grouped;
  }

  /**
   * Calculate expected impact of threshold adjustments
   */
  calculateExpectedImpact(): {
    total_alerts: number;
    estimated_fp_reduction: number;
    alerts_saved: number;
    noise_reduction_percentage: number;
  } {
    const totalAlerts = this.alerts.length;
    const resolvedAlerts = this.alerts.filter(a => a.alert_state === 'resolved');
    const quickResolves = resolvedAlerts.filter(
      a => a.alert_duration && a.alert_duration < 30000
    );
    
    const currentFpRate = resolvedAlerts.length > 0 
      ? quickResolves.length / resolvedAlerts.length 
      : 0;
    
    // Target: 40% reduction in false positives
    const estimatedReduction = currentFpRate * 0.4;
    const alertsSaved = Math.floor(totalAlerts * estimatedReduction);

    return {
      total_alerts: totalAlerts,
      estimated_fp_reduction: 0.4, // 40% target
      alerts_saved: alertsSaved,
      noise_reduction_percentage: estimatedReduction * 100
    };
  }
}

