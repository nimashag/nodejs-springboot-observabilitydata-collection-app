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
}

export interface ThresholdConfig {
  generated_at: string;
  thresholds: Record<string, ServiceThresholds>;
}

export interface ServiceThresholds {
  error_burst_threshold: number;
  error_burst_window: number;
  high_latency_threshold: number;
  availability_error_rate: number;
}

export class ThresholdAdjuster {
  // Current static thresholds (from your services)
  private static readonly CURRENT_THRESHOLDS = {
    ERROR_BURST_THRESHOLD: 5,
    ERROR_BURST_WINDOW: 60000,
    HIGH_LATENCY_THRESHOLD: 3000,
    AVAILABILITY_ERROR_RATE: 0.5
  };

  constructor(
    private alerts: NormalizedAlertEvent[],
    private baselines: Record<string, ServiceBaseline>
  ) {}

  /**
   * Calculate adaptive thresholds for all services
   */
  calculateAdaptiveThresholds(): AdaptiveThreshold[] {
    console.log('[Threshold Adjuster] Calculating adaptive thresholds...');
    
    const recommendations: AdaptiveThreshold[] = [];
    const services = [...new Set(this.alerts.map(a => a.service_name))];

    for (const service of services) {
      const serviceAlerts = this.alerts.filter(a => a.service_name === service);
      
      // Error burst threshold
      const errorThreshold = this.calculateErrorBurstThreshold(serviceAlerts);
      recommendations.push(errorThreshold);

      // Availability threshold
      const availThreshold = this.calculateAvailabilityThreshold(serviceAlerts);
      recommendations.push(availThreshold);

      console.log(`[Threshold Adjuster]   ${service}:`);
      console.log(`[Threshold Adjuster]     Error: ${errorThreshold.current_threshold} → ${errorThreshold.recommended_threshold} (${errorThreshold.adjustment_percentage.toFixed(1)}%)`);
      console.log(`[Threshold Adjuster]     Availability: ${availThreshold.current_threshold} → ${availThreshold.recommended_threshold} (${availThreshold.adjustment_percentage.toFixed(1)}%)`);
    }

    return recommendations;
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
      based_on_samples: errorCounts.length
    };
  }

  /**
   * Calculate availability threshold
   */
  private calculateAvailabilityThreshold(alerts: NormalizedAlertEvent[]): AdaptiveThreshold {
    const availAlerts = alerts.filter(a => a.alert_type === 'availability');
    
    if (availAlerts.length < 5) {
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
      based_on_samples: availAlerts.length
    };
  }

  /**
   * Get default threshold when insufficient data
   */
  private getDefaultThreshold(serviceName: string, alertType: string): AdaptiveThreshold {
    const current = alertType === 'error' 
      ? ThresholdAdjuster.CURRENT_THRESHOLDS.ERROR_BURST_THRESHOLD
      : ThresholdAdjuster.CURRENT_THRESHOLDS.AVAILABILITY_ERROR_RATE;

    return {
      service_name: serviceName,
      alert_type: alertType,
      current_threshold: current,
      recommended_threshold: current,
      adjustment_percentage: 0,
      confidence: 'low',
      rationale: 'Insufficient data for adjustment (< 5 samples)',
      based_on_samples: 0
    };
  }

  /**
   * Export threshold configuration file
   */
  exportThresholdConfig(): ThresholdConfig {
    console.log('[Threshold Adjuster] Generating threshold configuration...');
    
    const services = [...new Set(this.alerts.map(a => a.service_name))];
    const thresholds: Record<string, ServiceThresholds> = {};

    for (const service of services) {
      const serviceAlerts = this.alerts.filter(a => a.service_name === service);
      const errorThreshold = this.calculateErrorBurstThreshold(serviceAlerts);
      const availThreshold = this.calculateAvailabilityThreshold(serviceAlerts);

      thresholds[service] = {
        error_burst_threshold: errorThreshold.recommended_threshold,
        error_burst_window: ThresholdAdjuster.CURRENT_THRESHOLDS.ERROR_BURST_WINDOW,
        high_latency_threshold: ThresholdAdjuster.CURRENT_THRESHOLDS.HIGH_LATENCY_THRESHOLD,
        availability_error_rate: availThreshold.recommended_threshold
      };
    }

    return {
      generated_at: new Date().toISOString(),
      thresholds
    };
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

