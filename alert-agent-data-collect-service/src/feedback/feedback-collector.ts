import { NormalizedAlertEvent } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface AlertFeedback {
  feedback_id: string;
  alert_id: string;
  service_name: string;
  alert_type: string;
  timestamp: string;
  feedback_type: 'useful' | 'noise' | 'false_positive' | 'false_negative' | 'severity_wrong';
  rating: number; // 1-5
  comment?: string;
  resolution_time_minutes?: number;
  action_taken?: string;
  submitted_by: string;
  submitted_at: string;
}

export interface FeedbackAnalysis {
  total_feedback: number;
  by_type: {
    useful: number;
    noise: number;
    false_positive: number;
    false_negative: number;
    severity_wrong: number;
  };
  by_service: Record<string, {
    useful: number;
    noise: number;
    avg_rating: number;
  }>;
  by_alert_type: Record<string, {
    useful: number;
    noise: number;
    avg_rating: number;
  }>;
  overall_satisfaction: number; // 0-1
  noise_rate: number;
  false_positive_rate: number;
}

export interface ThresholdLearning {
  service_name: string;
  alert_type: string;
  current_threshold: number;
  feedback_based_adjustment: number;
  adjustment_confidence: number;
  reasoning: string;
  sample_size: number;
}

export interface FeedbackMetrics {
  collection_period_days: number;
  total_feedback_submissions: number;
  feedback_rate: number; // feedback / total alerts
  avg_resolution_time_minutes: number;
  satisfaction_score: number;
  threshold_improvements: number;
}

export class FeedbackCollector {
  private feedbackStorage: AlertFeedback[] = [];
  private feedbackFile: string;

  constructor(feedbackFilePath?: string) {
    this.feedbackFile = feedbackFilePath || path.join(__dirname, '../../output/alert-feedback.json');
    this.loadFeedback();
  }

  /**
   * Load feedback from file
   */
  private loadFeedback(): void {
    try {
      if (fs.existsSync(this.feedbackFile)) {
        const data = fs.readFileSync(this.feedbackFile, 'utf-8');
        this.feedbackStorage = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load feedback file:', error);
      this.feedbackStorage = [];
    }
  }

  /**
   * Save feedback to file
   */
  private saveFeedback(): void {
    try {
      const dir = path.dirname(this.feedbackFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.feedbackFile, JSON.stringify(this.feedbackStorage, null, 2));
    } catch (error) {
      console.error('Could not save feedback file:', error);
    }
  }

  /**
   * Submit feedback for an alert
   */
  submitFeedback(
    alert: NormalizedAlertEvent,
    feedbackType: AlertFeedback['feedback_type'],
    rating: number,
    submittedBy: string,
    options?: {
      comment?: string;
      resolutionTimeMinutes?: number;
      actionTaken?: string;
    }
  ): AlertFeedback {
    const feedback: AlertFeedback = {
      feedback_id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alert_id: `${alert.service_name}-${alert.timestamp}`,
      service_name: alert.service_name,
      alert_type: alert.alert_type,
      timestamp: alert.timestamp,
      feedback_type: feedbackType,
      rating: Math.max(1, Math.min(5, rating)),
      comment: options?.comment,
      resolution_time_minutes: options?.resolutionTimeMinutes,
      action_taken: options?.actionTaken,
      submitted_by: submittedBy,
      submitted_at: new Date().toISOString()
    };

    this.feedbackStorage.push(feedback);
    this.saveFeedback();

    return feedback;
  }

  /**
   * Get all feedback
   */
  getAllFeedback(): AlertFeedback[] {
    return this.feedbackStorage;
  }

  /**
   * Get feedback for specific service
   */
  getFeedbackForService(serviceName: string): AlertFeedback[] {
    return this.feedbackStorage.filter(fb => fb.service_name === serviceName);
  }

  /**
   * Get feedback for specific alert type
   */
  getFeedbackForAlertType(alertType: string): AlertFeedback[] {
    return this.feedbackStorage.filter(fb => fb.alert_type === alertType);
  }

  /**
   * Analyze feedback
   */
  analyzeFeedback(): FeedbackAnalysis {
    const analysis: FeedbackAnalysis = {
      total_feedback: this.feedbackStorage.length,
      by_type: {
        useful: 0,
        noise: 0,
        false_positive: 0,
        false_negative: 0,
        severity_wrong: 0
      },
      by_service: {},
      by_alert_type: {},
      overall_satisfaction: 0,
      noise_rate: 0,
      false_positive_rate: 0
    };

    if (this.feedbackStorage.length === 0) {
      return analysis;
    }

    // Count by type
    this.feedbackStorage.forEach(fb => {
      analysis.by_type[fb.feedback_type]++;

      // By service
      if (!analysis.by_service[fb.service_name]) {
        analysis.by_service[fb.service_name] = { useful: 0, noise: 0, avg_rating: 0 };
      }
      if (fb.feedback_type === 'useful') {
        analysis.by_service[fb.service_name].useful++;
      } else if (fb.feedback_type === 'noise' || fb.feedback_type === 'false_positive') {
        analysis.by_service[fb.service_name].noise++;
      }

      // By alert type
      if (!analysis.by_alert_type[fb.alert_type]) {
        analysis.by_alert_type[fb.alert_type] = { useful: 0, noise: 0, avg_rating: 0 };
      }
      if (fb.feedback_type === 'useful') {
        analysis.by_alert_type[fb.alert_type].useful++;
      } else if (fb.feedback_type === 'noise' || fb.feedback_type === 'false_positive') {
        analysis.by_alert_type[fb.alert_type].noise++;
      }
    });

    // Calculate average ratings
    Object.keys(analysis.by_service).forEach(service => {
      const serviceFeedback = this.feedbackStorage.filter(fb => fb.service_name === service);
      const avgRating = serviceFeedback.reduce((sum, fb) => sum + fb.rating, 0) / serviceFeedback.length;
      analysis.by_service[service].avg_rating = avgRating;
    });

    Object.keys(analysis.by_alert_type).forEach(alertType => {
      const typeFeedback = this.feedbackStorage.filter(fb => fb.alert_type === alertType);
      const avgRating = typeFeedback.reduce((sum, fb) => sum + fb.rating, 0) / typeFeedback.length;
      analysis.by_alert_type[alertType].avg_rating = avgRating;
    });

    // Overall satisfaction (based on ratings)
    const avgRating = this.feedbackStorage.reduce((sum, fb) => sum + fb.rating, 0) / this.feedbackStorage.length;
    analysis.overall_satisfaction = avgRating / 5; // Normalize to 0-1

    // Noise and false positive rates
    analysis.noise_rate = analysis.by_type.noise / this.feedbackStorage.length;
    analysis.false_positive_rate = analysis.by_type.false_positive / this.feedbackStorage.length;

    return analysis;
  }

  /**
   * Learn threshold adjustments from feedback
   */
  learnFromFeedback(
    currentThresholds: Record<string, Record<string, number>>
  ): ThresholdLearning[] {
    const learnings: ThresholdLearning[] = [];

    // Group feedback by service and alert type
    const feedbackMap = new Map<string, AlertFeedback[]>();
    
    this.feedbackStorage.forEach(fb => {
      const key = `${fb.service_name}:${fb.alert_type}`;
      if (!feedbackMap.has(key)) {
        feedbackMap.set(key, []);
      }
      feedbackMap.get(key)!.push(fb);
    });

    // Analyze each group
    feedbackMap.forEach((feedbacks, key) => {
      const [serviceName, alertType] = key.split(':');
      
      if (feedbacks.length < 5) {
        return; // Need at least 5 feedback items
      }

      const noiseCount = feedbacks.filter(
        fb => fb.feedback_type === 'noise' || fb.feedback_type === 'false_positive'
      ).length;
      
      const usefulCount = feedbacks.filter(fb => fb.feedback_type === 'useful').length;
      const fnCount = feedbacks.filter(fb => fb.feedback_type === 'false_negative').length;

      const noiseRate = noiseCount / feedbacks.length;
      const fnRate = fnCount / feedbacks.length;

      // Get current threshold
      const serviceThresholds = currentThresholds[serviceName] || {};
      const thresholdKey = this.getThresholdKey(alertType);
      const currentThreshold = serviceThresholds[thresholdKey] || 0;

      if (currentThreshold === 0) {
        return;
      }

      let adjustment = 0;
      let reasoning = '';
      let confidence = feedbacks.length / 20; // More feedback = higher confidence

      if (noiseRate > 0.3) {
        // High noise - increase threshold
        adjustment = currentThreshold * (0.2 + noiseRate * 0.3);
        reasoning = `${(noiseRate * 100).toFixed(0)}% of feedback marked as noise/FP - increasing threshold`;
        confidence = Math.min(0.9, confidence + noiseRate * 0.2);
      } else if (fnRate > 0.2) {
        // Missing issues - decrease threshold
        adjustment = -currentThreshold * (0.1 + fnRate * 0.2);
        reasoning = `${(fnRate * 100).toFixed(0)}% of feedback marked as false negatives - decreasing threshold`;
        confidence = Math.min(0.85, confidence + fnRate * 0.15);
      } else if (usefulCount > feedbacks.length * 0.7) {
        // Mostly useful - maintain
        adjustment = 0;
        reasoning = `${(usefulCount / feedbacks.length * 100).toFixed(0)}% useful feedback - threshold is well-tuned`;
        confidence = Math.min(0.95, confidence + 0.3);
      }

      if (Math.abs(adjustment) > 0.01) {
        learnings.push({
          service_name: serviceName,
          alert_type: alertType,
          current_threshold: currentThreshold,
          feedback_based_adjustment: adjustment,
          adjustment_confidence: Math.min(0.95, confidence),
          reasoning: reasoning,
          sample_size: feedbacks.length
        });
      }
    });

    return learnings.sort((a, b) => b.adjustment_confidence - a.adjustment_confidence);
  }

  /**
   * Get threshold key for alert type
   */
  private getThresholdKey(alertType: string): string {
    const keyMap: Record<string, string> = {
      'error': 'error_burst_threshold',
      'availability': 'availability_error_rate',
      'latency': 'high_latency_threshold',
      'traffic': 'traffic_rate_threshold',
      'resource': 'cpu_usage_threshold'
    };
    return keyMap[alertType] || '';
  }

  /**
   * Apply feedback-based adjustments to thresholds
   */
  applyFeedbackAdjustments(
    currentThresholds: Record<string, Record<string, number>>,
    learnings: ThresholdLearning[],
    minConfidence: number = 0.7
  ): Record<string, Record<string, number>> {
    const newThresholds = JSON.parse(JSON.stringify(currentThresholds));

    for (const learning of learnings) {
      if (learning.adjustment_confidence < minConfidence) {
        continue;
      }

      if (!newThresholds[learning.service_name]) {
        newThresholds[learning.service_name] = {};
      }

      const thresholdKey = this.getThresholdKey(learning.alert_type);
      const newValue = learning.current_threshold + learning.feedback_based_adjustment;

      // Apply bounds
      if (learning.alert_type === 'availability') {
        newThresholds[learning.service_name][thresholdKey] = Math.max(0.2, Math.min(0.9, newValue));
      } else {
        newThresholds[learning.service_name][thresholdKey] = Math.max(1, Math.ceil(newValue));
      }
    }

    return newThresholds;
  }

  /**
   * Get feedback metrics
   */
  getFeedbackMetrics(totalAlerts: number): FeedbackMetrics {
    if (this.feedbackStorage.length === 0) {
      return {
        collection_period_days: 0,
        total_feedback_submissions: 0,
        feedback_rate: 0,
        avg_resolution_time_minutes: 0,
        satisfaction_score: 0,
        threshold_improvements: 0
      };
    }

    // Calculate collection period
    const timestamps = this.feedbackStorage.map(fb => new Date(fb.submitted_at).getTime());
    const firstFeedback = Math.min(...timestamps);
    const lastFeedback = Math.max(...timestamps);
    const periodDays = (lastFeedback - firstFeedback) / (1000 * 60 * 60 * 24);

    // Average resolution time
    const resolutionTimes = this.feedbackStorage
      .filter(fb => fb.resolution_time_minutes !== undefined)
      .map(fb => fb.resolution_time_minutes!);
    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0;

    // Satisfaction score (based on ratings)
    const avgRating = this.feedbackStorage.reduce((sum, fb) => sum + fb.rating, 0) / this.feedbackStorage.length;
    const satisfactionScore = avgRating / 5;

    // Estimate threshold improvements (learnings with high confidence)
    const learnings = this.learnFromFeedback({});
    const improvements = learnings.filter(l => l.adjustment_confidence > 0.7).length;

    return {
      collection_period_days: periodDays,
      total_feedback_submissions: this.feedbackStorage.length,
      feedback_rate: totalAlerts > 0 ? this.feedbackStorage.length / totalAlerts : 0,
      avg_resolution_time_minutes: avgResolutionTime,
      satisfaction_score: satisfactionScore,
      threshold_improvements: improvements
    };
  }

  /**
   * Export feedback to CSV
   */
  exportToCSV(outputPath: string): void {
    if (this.feedbackStorage.length === 0) {
      return;
    }

    const headers = [
      'feedback_id',
      'alert_id',
      'service_name',
      'alert_type',
      'timestamp',
      'feedback_type',
      'rating',
      'comment',
      'resolution_time_minutes',
      'action_taken',
      'submitted_by',
      'submitted_at'
    ];

    const rows = this.feedbackStorage.map(fb => [
      fb.feedback_id,
      fb.alert_id,
      fb.service_name,
      fb.alert_type,
      fb.timestamp,
      fb.feedback_type,
      fb.rating.toString(),
      fb.comment || '',
      fb.resolution_time_minutes?.toString() || '',
      fb.action_taken || '',
      fb.submitted_by,
      fb.submitted_at
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    try {
      fs.writeFileSync(outputPath, csv, 'utf-8');
    } catch (error) {
      console.error('Could not export feedback to CSV:', error);
    }
  }
}

