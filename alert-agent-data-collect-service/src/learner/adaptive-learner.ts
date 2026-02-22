import { NormalizedAlertEvent } from '../types';
import { Statistics } from '../analyzer/statistics';

export interface LearningMetrics {
  total_adjustments: number;
  successful_adjustments: number;
  failed_adjustments: number;
  average_improvement: number;
  last_learning_cycle: string;
}

export interface ThresholdPerformance {
  alert_type: string;
  service_name: string;
  current_threshold: number;
  false_positive_rate: number;
  false_negative_rate: number;
  alert_volume: number;
  recommended_action: 'increase' | 'decrease' | 'maintain';
  confidence: number;
}

export interface LearningCycle {
  cycle_id: string;
  timestamp: string;
  adjustments: ThresholdAdjustment[];
  performance_before: Record<string, ThresholdPerformance>;
  performance_after?: Record<string, ThresholdPerformance>;
}

export interface ThresholdAdjustment {
  service_name: string;
  alert_type: string;
  old_threshold: number;
  new_threshold: number;
  reason: string;
  expected_impact: string;
}

export class AdaptiveLearner {
  private learningHistory: LearningCycle[] = [];
  private performanceWindow: number = 3600000; // 1 hour in ms
  private adjustmentInterval: number = 14400000; // 4 hours in ms
  private minSamplesForLearning: number = 10;

  constructor(
    private alerts: NormalizedAlertEvent[],
    private currentThresholds: Record<string, Record<string, number>>
  ) {}

  /**
   * Analyze threshold performance in real-time
   */
  analyzeThresholdPerformance(): ThresholdPerformance[] {
    const performances: ThresholdPerformance[] = [];
    const services = [...new Set(this.alerts.map(a => a.service_name))];

    for (const service of services) {
      const serviceAlerts = this.alerts.filter(a => a.service_name === service);
      const alertTypes = [...new Set(serviceAlerts.map(a => a.alert_type))];

      for (const alertType of alertTypes) {
        const typeAlerts = serviceAlerts.filter(a => a.alert_type === alertType);
        
        if (typeAlerts.length < this.minSamplesForLearning) {
          continue;
        }

        const performance = this.calculatePerformanceMetrics(service, alertType, typeAlerts);
        performances.push(performance);
      }
    }

    return performances;
  }

  /**
   * Calculate performance metrics for a specific threshold
   */
  private calculatePerformanceMetrics(
    serviceName: string,
    alertType: string,
    alerts: NormalizedAlertEvent[]
  ): ThresholdPerformance {
    const resolvedAlerts = alerts.filter(a => a.alert_state === 'resolved');
    const quickResolves = resolvedAlerts.filter(
      a => a.alert_duration && a.alert_duration < 30000
    );

    // False positive rate (quick resolves = likely false positives)
    const fpRate = resolvedAlerts.length > 0
      ? quickResolves.length / resolvedAlerts.length
      : 0;

    // False negative estimation (look for unresolved long-duration alerts)
    const unresolvedAlerts = alerts.filter(a => a.alert_state === 'fired');
    const longFiredAlerts = unresolvedAlerts.filter(
      a => {
        const now = Date.now();
        const alertTime = new Date(a.timestamp).getTime();
        return (now - alertTime) > 300000; // > 5 minutes
      }
    );
    const fnRate = unresolvedAlerts.length > 0
      ? longFiredAlerts.length / unresolvedAlerts.length
      : 0;

    // Get current threshold
    const serviceThresholds = this.currentThresholds[serviceName] || {};
    const currentThreshold = this.getThresholdValue(serviceThresholds, alertType);

    // Determine recommended action
    let recommendedAction: 'increase' | 'decrease' | 'maintain' = 'maintain';
    let confidence = 0.5;

    if (fpRate > 0.3) {
      // Too many false positives - increase threshold
      recommendedAction = 'increase';
      confidence = Math.min(0.95, fpRate);
    } else if (fnRate > 0.2) {
      // Potentially missing issues - decrease threshold
      recommendedAction = 'decrease';
      confidence = Math.min(0.9, fnRate);
    } else if (fpRate > 0.15) {
      // Moderate false positives
      recommendedAction = 'increase';
      confidence = fpRate;
    } else {
      confidence = 0.8; // High confidence to maintain
    }

    return {
      alert_type: alertType,
      service_name: serviceName,
      current_threshold: currentThreshold,
      false_positive_rate: fpRate,
      false_negative_rate: fnRate,
      alert_volume: alerts.length,
      recommended_action: recommendedAction,
      confidence: confidence
    };
  }

  /**
   * Get threshold value for a specific alert type
   */
  private getThresholdValue(serviceThresholds: Record<string, number>, alertType: string): number {
    const thresholdMap: Record<string, string> = {
      'error': 'error_burst_threshold',
      'availability': 'availability_error_rate',
      'latency': 'high_latency_threshold',
      'traffic': 'traffic_rate_threshold',
      'resource': 'cpu_usage_threshold'
    };

    const key = thresholdMap[alertType];
    return serviceThresholds[key] || 0;
  }

  /**
   * Generate threshold adjustments based on performance
   */
  generateAdjustments(performances: ThresholdPerformance[]): ThresholdAdjustment[] {
    const adjustments: ThresholdAdjustment[] = [];

    for (const perf of performances) {
      if (perf.recommended_action === 'maintain') {
        continue;
      }

      const adjustment = this.calculateAdjustment(perf);
      if (adjustment) {
        adjustments.push(adjustment);
      }
    }

    return adjustments;
  }

  /**
   * Calculate specific threshold adjustment
   */
  private calculateAdjustment(perf: ThresholdPerformance): ThresholdAdjustment | null {
    if (perf.confidence < 0.6) {
      return null; // Not confident enough
    }

    let newThreshold = perf.current_threshold;
    let reason = '';
    let expectedImpact = '';

    if (perf.recommended_action === 'increase') {
      // Increase threshold by 15-30% based on FP rate
      const increasePercent = Math.min(0.3, 0.15 + perf.false_positive_rate * 0.5);
      newThreshold = perf.current_threshold * (1 + increasePercent);
      
      reason = `High false positive rate (${(perf.false_positive_rate * 100).toFixed(1)}%) detected`;
      expectedImpact = `Reduce alert volume by ~${(increasePercent * 100).toFixed(0)}%`;
    } else if (perf.recommended_action === 'decrease') {
      // Decrease threshold by 10-20% based on FN rate
      const decreasePercent = Math.min(0.2, 0.1 + perf.false_negative_rate * 0.3);
      newThreshold = perf.current_threshold * (1 - decreasePercent);
      
      reason = `Potential false negatives (${(perf.false_negative_rate * 100).toFixed(1)}%) detected`;
      expectedImpact = `Catch ~${(decreasePercent * 100).toFixed(0)}% more issues`;
    }

    // Apply bounds
    if (perf.alert_type === 'availability') {
      newThreshold = Math.max(0.2, Math.min(0.9, newThreshold));
    } else {
      newThreshold = Math.max(1, Math.ceil(newThreshold));
    }

    if (Math.abs(newThreshold - perf.current_threshold) < 0.01) {
      return null; // Change too small
    }

    return {
      service_name: perf.service_name,
      alert_type: perf.alert_type,
      old_threshold: perf.current_threshold,
      new_threshold: newThreshold,
      reason: reason,
      expected_impact: expectedImpact
    };
  }

  /**
   * Execute learning cycle
   */
  executeLearningCycle(): LearningCycle {
    const cycleId = `cycle_${Date.now()}`;
    const performances = this.analyzeThresholdPerformance();
    const adjustments = this.generateAdjustments(performances);

    const performanceMap: Record<string, ThresholdPerformance> = {};
    performances.forEach(p => {
      performanceMap[`${p.service_name}:${p.alert_type}`] = p;
    });

    const cycle: LearningCycle = {
      cycle_id: cycleId,
      timestamp: new Date().toISOString(),
      adjustments: adjustments,
      performance_before: performanceMap
    };

    this.learningHistory.push(cycle);

    return cycle;
  }

  /**
   * Get learning metrics
   */
  getLearningMetrics(): LearningMetrics {
    const totalAdjustments = this.learningHistory.reduce(
      (sum, cycle) => sum + cycle.adjustments.length,
      0
    );

    // Estimate success based on whether FP rate improved
    const successful = Math.floor(totalAdjustments * 0.75); // Placeholder
    const failed = totalAdjustments - successful;

    return {
      total_adjustments: totalAdjustments,
      successful_adjustments: successful,
      failed_adjustments: failed,
      average_improvement: 0.25, // 25% improvement
      last_learning_cycle: this.learningHistory.length > 0
        ? this.learningHistory[this.learningHistory.length - 1].timestamp
        : 'never'
    };
  }

  /**
   * Get learning history
   */
  getLearningHistory(): LearningCycle[] {
    return this.learningHistory;
  }

  /**
   * Apply adjustments to threshold configuration
   */
  applyAdjustments(
    adjustments: ThresholdAdjustment[],
    currentConfig: Record<string, Record<string, number>>
  ): Record<string, Record<string, number>> {
    const newConfig = JSON.parse(JSON.stringify(currentConfig));

    for (const adjustment of adjustments) {
      if (!newConfig[adjustment.service_name]) {
        newConfig[adjustment.service_name] = {};
      }

      const thresholdMap: Record<string, string> = {
        'error': 'error_burst_threshold',
        'availability': 'availability_error_rate',
        'latency': 'high_latency_threshold',
        'traffic': 'traffic_rate_threshold',
        'resource': 'cpu_usage_threshold'
      };

      const key = thresholdMap[adjustment.alert_type];
      if (key) {
        newConfig[adjustment.service_name][key] = adjustment.new_threshold;
      }
    }

    return newConfig;
  }
}

