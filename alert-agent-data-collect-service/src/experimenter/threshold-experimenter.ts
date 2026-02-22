import { NormalizedAlertEvent } from '../types';

export interface ThresholdExperiment {
  experiment_id: string;
  experiment_name: string;
  service_name: string;
  alert_type: string;
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  start_time: string;
  end_time?: string;
  duration_hours: number;
  control_threshold: number;
  treatment_threshold: number;
  allocation_percent: number; // % of alerts to test treatment
  metrics: ExperimentMetrics;
  conclusion?: string;
  winner?: 'control' | 'treatment' | 'inconclusive';
}

export interface ExperimentMetrics {
  control: VariantMetrics;
  treatment: VariantMetrics;
  statistical_significance: number;
  confidence_level: number;
}

export interface VariantMetrics {
  alert_count: number;
  false_positive_count: number;
  false_positive_rate: number;
  false_negative_estimate: number;
  avg_resolution_time_minutes: number;
  noise_reduction: number;
  user_satisfaction: number;
}

export interface ExperimentResult {
  experiment: ThresholdExperiment;
  recommendation: string;
  confidence: number;
  should_rollout: boolean;
  estimated_improvement: number;
}

export interface ShadowModeTest {
  test_id: string;
  service_name: string;
  alert_type: string;
  current_threshold: number;
  test_threshold: number;
  start_time: string;
  duration_hours: number;
  alerts_evaluated: number;
  would_trigger_current: number;
  would_trigger_test: number;
  difference: number;
  recommendation: string;
}

export class ThresholdExperimenter {
  private experiments: Map<string, ThresholdExperiment> = new Map();
  private shadowTests: Map<string, ShadowModeTest> = new Map();

  constructor() {}

  /**
   * Create a new A/B experiment
   */
  createExperiment(
    serviceName: string,
    alertType: string,
    currentThreshold: number,
    proposedThreshold: number,
    durationHours: number = 168 // 1 week default
  ): ThresholdExperiment {
    const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const experiment: ThresholdExperiment = {
      experiment_id: experimentId,
      experiment_name: `${serviceName}-${alertType} Threshold Test`,
      service_name: serviceName,
      alert_type: alertType,
      status: 'draft',
      start_time: new Date().toISOString(),
      duration_hours: durationHours,
      control_threshold: currentThreshold,
      treatment_threshold: proposedThreshold,
      allocation_percent: 50, // 50/50 split
      metrics: {
        control: this.createEmptyMetrics(),
        treatment: this.createEmptyMetrics(),
        statistical_significance: 0,
        confidence_level: 0
      }
    };

    this.experiments.set(experimentId, experiment);
    return experiment;
  }

  /**
   * Create empty metrics
   */
  private createEmptyMetrics(): VariantMetrics {
    return {
      alert_count: 0,
      false_positive_count: 0,
      false_positive_rate: 0,
      false_negative_estimate: 0,
      avg_resolution_time_minutes: 0,
      noise_reduction: 0,
      user_satisfaction: 0.5
    };
  }

  /**
   * Start an experiment
   */
  startExperiment(experimentId: string): ThresholdExperiment | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return null;
    }

    experiment.status = 'running';
    experiment.start_time = new Date().toISOString();
    
    return experiment;
  }

  /**
   * Record alert in experiment
   */
  recordAlert(
    experimentId: string,
    alert: NormalizedAlertEvent,
    variant: 'control' | 'treatment',
    isFalsePositive: boolean,
    resolutionTimeMinutes?: number
  ): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') {
      return;
    }

    const metrics = experiment.metrics[variant];
    metrics.alert_count++;

    if (isFalsePositive) {
      metrics.false_positive_count++;
    }

    if (resolutionTimeMinutes !== undefined) {
      // Update rolling average
      const totalTime = metrics.avg_resolution_time_minutes * (metrics.alert_count - 1);
      metrics.avg_resolution_time_minutes = (totalTime + resolutionTimeMinutes) / metrics.alert_count;
    }

    // Recalculate rates
    metrics.false_positive_rate = metrics.alert_count > 0
      ? metrics.false_positive_count / metrics.alert_count
      : 0;
  }

  /**
   * Complete an experiment
   */
  completeExperiment(experimentId: string): ExperimentResult | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return null;
    }

    experiment.status = 'completed';
    experiment.end_time = new Date().toISOString();

    // Calculate statistical significance
    experiment.metrics.statistical_significance = this.calculateStatisticalSignificance(
      experiment.metrics.control,
      experiment.metrics.treatment
    );

    experiment.metrics.confidence_level = this.calculateConfidence(
      experiment.metrics.control.alert_count,
      experiment.metrics.treatment.alert_count,
      experiment.metrics.statistical_significance
    );

    // Determine winner
    experiment.winner = this.determineWinner(experiment);

    // Generate conclusion
    experiment.conclusion = this.generateConclusion(experiment);

    // Create result
    return this.createExperimentResult(experiment);
  }

  /**
   * Calculate statistical significance using Z-test for proportions
   */
  private calculateStatisticalSignificance(control: VariantMetrics, treatment: VariantMetrics): number {
    if (control.alert_count < 30 || treatment.alert_count < 30) {
      return 0; // Need at least 30 samples for valid test
    }

    const p1 = control.false_positive_rate;
    const p2 = treatment.false_positive_rate;
    const n1 = control.alert_count;
    const n2 = treatment.alert_count;

    // Pooled proportion
    const pooled = (p1 * n1 + p2 * n2) / (n1 + n2);

    // Standard error
    const se = Math.sqrt(pooled * (1 - pooled) * (1/n1 + 1/n2));

    if (se === 0) {
      return 0;
    }

    // Z-score
    const z = Math.abs(p1 - p2) / se;

    // Convert to p-value (approximate)
    const pValue = Math.exp(-0.717 * z - 0.416 * z * z);

    return 1 - pValue; // Return significance level
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(
    controlCount: number,
    treatmentCount: number,
    significance: number
  ): number {
    const minSamples = Math.min(controlCount, treatmentCount);
    
    if (minSamples < 30) {
      return 0.5; // Low confidence
    } else if (minSamples < 100) {
      return 0.7 + significance * 0.1;
    } else {
      return 0.8 + significance * 0.15;
    }
  }

  /**
   * Determine experiment winner
   */
  private determineWinner(experiment: ThresholdExperiment): 'control' | 'treatment' | 'inconclusive' {
    const { control, treatment } = experiment.metrics;

    // Need statistical significance to declare winner
    if (experiment.metrics.statistical_significance < 0.95) {
      return 'inconclusive';
    }

    // Compare key metrics
    const fpImprovement = control.false_positive_rate - treatment.false_positive_rate;
    const resolutionImprovement = control.avg_resolution_time_minutes - treatment.avg_resolution_time_minutes;

    // Treatment wins if:
    // 1. Lower FP rate (primary metric)
    // 2. Similar or better resolution time
    if (fpImprovement > 0.05 && resolutionImprovement >= -5) {
      return 'treatment';
    }

    // Control wins if treatment is worse
    if (fpImprovement < -0.05 || resolutionImprovement < -10) {
      return 'control';
    }

    return 'inconclusive';
  }

  /**
   * Generate experiment conclusion
   */
  private generateConclusion(experiment: ThresholdExperiment): string {
    const { control, treatment, statistical_significance } = experiment.metrics;
    const winner = experiment.winner;

    if (winner === 'inconclusive') {
      return `Experiment inconclusive. Statistical significance: ${(statistical_significance * 100).toFixed(1)}%. Need more data or larger difference in thresholds.`;
    }

    const fpDiff = ((control.false_positive_rate - treatment.false_positive_rate) * 100).toFixed(1);
    const winnerMetrics = winner === 'treatment' ? treatment : control;
    const winnerThreshold = winner === 'treatment' ? experiment.treatment_threshold : experiment.control_threshold;

    if (winner === 'treatment') {
      return `Treatment threshold (${winnerThreshold}) wins with ${Math.abs(parseFloat(fpDiff))}% FP reduction. Recommend rollout to production.`;
    } else {
      return `Control threshold (${winnerThreshold}) performs better. Current threshold should be maintained.`;
    }
  }

  /**
   * Create experiment result
   */
  private createExperimentResult(experiment: ThresholdExperiment): ExperimentResult {
    const { control, treatment } = experiment.metrics;
    
    const improvement = experiment.winner === 'treatment'
      ? (control.false_positive_rate - treatment.false_positive_rate) / control.false_positive_rate
      : 0;

    return {
      experiment: experiment,
      recommendation: experiment.conclusion || '',
      confidence: experiment.metrics.confidence_level,
      should_rollout: experiment.winner === 'treatment' && experiment.metrics.confidence_level > 0.8,
      estimated_improvement: improvement
    };
  }

  /**
   * Run shadow mode test (evaluate without actually triggering)
   */
  runShadowTest(
    serviceName: string,
    alertType: string,
    currentThreshold: number,
    testThreshold: number,
    alerts: NormalizedAlertEvent[]
  ): ShadowModeTest {
    const testId = `shadow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let wouldTriggerCurrent = 0;
    let wouldTriggerTest = 0;

    const serviceAlerts = alerts.filter(
      a => a.service_name === serviceName && a.alert_type === alertType
    );

    for (const alert of serviceAlerts) {
      const value = this.getMetricValue(alert);

      if (value >= currentThreshold) {
        wouldTriggerCurrent++;
      }

      if (value >= testThreshold) {
        wouldTriggerTest++;
      }
    }

    const difference = wouldTriggerCurrent - wouldTriggerTest;
    const percentChange = wouldTriggerCurrent > 0
      ? (difference / wouldTriggerCurrent) * 100
      : 0;

    let recommendation = '';
    if (Math.abs(percentChange) < 5) {
      recommendation = `Minimal impact (${percentChange.toFixed(1)}%). Test threshold similar to current.`;
    } else if (difference > 0) {
      recommendation = `Test threshold would reduce alerts by ${difference} (${percentChange.toFixed(1)}%). Consider running A/B test.`;
    } else {
      recommendation = `Test threshold would increase alerts by ${Math.abs(difference)} (${Math.abs(percentChange).toFixed(1)}%). May catch more issues but increase noise.`;
    }

    const test: ShadowModeTest = {
      test_id: testId,
      service_name: serviceName,
      alert_type: alertType,
      current_threshold: currentThreshold,
      test_threshold: testThreshold,
      start_time: new Date().toISOString(),
      duration_hours: 0, // Instant evaluation
      alerts_evaluated: serviceAlerts.length,
      would_trigger_current: wouldTriggerCurrent,
      would_trigger_test: wouldTriggerTest,
      difference: difference,
      recommendation: recommendation
    };

    this.shadowTests.set(testId, test);
    return test;
  }

  /**
   * Get metric value from alert
   */
  private getMetricValue(alert: NormalizedAlertEvent): number {
    switch (alert.alert_type) {
      case 'error':
        return alert.error_count;
      case 'latency':
        return alert.average_response_time;
      case 'availability':
        return alert.request_count > 0 ? alert.error_count / alert.request_count : 0;
      case 'traffic':
        return alert.traffic_rate || alert.request_count;
      case 'resource':
        const cpu = alert.process_cpu_usage || 0;
        return cpu > 100 ? cpu / 10000000 : cpu;
      default:
        return 0;
    }
  }

  /**
   * Get all experiments
   */
  getAllExperiments(): ThresholdExperiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): ThresholdExperiment | null {
    return this.experiments.get(experimentId) || null;
  }

  /**
   * Get all shadow tests
   */
  getAllShadowTests(): ShadowModeTest[] {
    return Array.from(this.shadowTests.values());
  }

  /**
   * Cancel experiment
   */
  cancelExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return false;
    }

    experiment.status = 'cancelled';
    experiment.end_time = new Date().toISOString();
    return true;
  }
}

