import { NormalizedAlertEvent } from '../types';
import { Statistics } from './statistics';

export interface ServiceBaseline {
  service_name: string;
  total_alerts: number;
  avg_error_count: number;
  avg_response_time: number;
  avg_alert_duration: number;
  false_positive_rate: number;
  alert_rate_per_hour: number;
  avg_cpu_usage: number;
  avg_memory_usage: number;
}

export interface FalsePositiveIndicators {
  quick_resolves: NormalizedAlertEvent[];
  repetitive_count: number;
  estimated_fp_rate: number;
}

export interface TemporalPattern {
  peak_hours: number[];
  peak_days: number[];
  hourly_distribution: Record<number, number>;
  daily_distribution: Record<number, number>;
}

export interface AnalysisReport {
  generated_at: string;
  total_alerts_analyzed: number;
  time_range: { start: string; end: string };
  service_baselines: Record<string, ServiceBaseline>;
  false_positive_analysis: FalsePositiveIndicators;
  temporal_patterns: TemporalPattern;
  recommendations: string[];
}

export class HistoricalAnalyzer {
  constructor(private alerts: NormalizedAlertEvent[]) {}

  /**
   * Main analysis method - runs all analyses
   */
  analyze(): AnalysisReport {
    console.log('[Historical Analyzer] Starting analysis...');
    
    const report: AnalysisReport = {
      generated_at: new Date().toISOString(),
      total_alerts_analyzed: this.alerts.length,
      time_range: this.getTimeRange(),
      service_baselines: this.calculateServiceBaselines(),
      false_positive_analysis: this.detectFalsePositives(),
      temporal_patterns: this.analyzeTemporalPatterns(),
      recommendations: []
    };

    // Generate recommendations based on analysis
    report.recommendations = this.generateRecommendations(report);

    console.log('[Historical Analyzer] Analysis complete');
    return report;
  }

  /**
   * Get time range of alert data
   */
  private getTimeRange(): { start: string; end: string } {
    if (this.alerts.length === 0) {
      return { start: '', end: '' };
    }
    const timestamps = this.alerts.map(a => a.normalized_timestamp);
    return {
      start: new Date(Math.min(...timestamps)).toISOString(),
      end: new Date(Math.max(...timestamps)).toISOString()
    };
  }

  /**
   * Calculate baseline metrics for each service
   */
  private calculateServiceBaselines(): Record<string, ServiceBaseline> {
    console.log('[Historical Analyzer] Calculating service baselines...');
    
    const baselines: Record<string, ServiceBaseline> = {};
    const services = [...new Set(this.alerts.map(a => a.service_name))];

    for (const service of services) {
      const serviceAlerts = this.alerts.filter(a => a.service_name === service);
      const resolvedAlerts = serviceAlerts.filter(a => a.alert_state === 'resolved');
      
      // Quick resolves (< 30 seconds) are likely false positives
      const quickResolves = resolvedAlerts.filter(
        a => a.alert_duration && a.alert_duration < 30000
      );

      baselines[service] = {
        service_name: service,
        total_alerts: serviceAlerts.length,
        avg_error_count: Statistics.mean(serviceAlerts.map(a => a.error_count)),
        avg_response_time: Statistics.mean(serviceAlerts.map(a => a.average_response_time)),
        avg_alert_duration: Statistics.mean(
          resolvedAlerts
            .filter(a => a.alert_duration)
            .map(a => a.alert_duration!)
        ),
        false_positive_rate: resolvedAlerts.length > 0 
          ? quickResolves.length / resolvedAlerts.length 
          : 0,
        alert_rate_per_hour: this.calculateAlertRate(serviceAlerts),
        avg_cpu_usage: Statistics.mean(
          serviceAlerts
            .filter(a => a.process_cpu_usage > 0)
            .map(a => a.process_cpu_usage)
        ),
        avg_memory_usage: Statistics.mean(serviceAlerts.map(a => a.process_memory_usage))
      };

      console.log(`[Historical Analyzer]   ${service}: ${serviceAlerts.length} alerts, FP rate: ${(baselines[service].false_positive_rate * 100).toFixed(1)}%`);
    }

    return baselines;
  }

  /**
   * Calculate alert rate per hour
   */
  private calculateAlertRate(alerts: NormalizedAlertEvent[]): number {
    if (alerts.length === 0) return 0;
    const timestamps = alerts.map(a => a.normalized_timestamp);
    const timeSpanHours = (Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60 * 60);
    return timeSpanHours > 0 ? alerts.length / timeSpanHours : 0;
  }

  /**
   * Detect false positive patterns
   */
  private detectFalsePositives(): FalsePositiveIndicators {
    console.log('[Historical Analyzer] Detecting false positive patterns...');
    
    const resolvedAlerts = this.alerts.filter(a => a.alert_state === 'resolved');
    const quickResolves = resolvedAlerts.filter(
      a => a.alert_duration && a.alert_duration < 30000
    );

    // Count repetitive alerts (same service + type within 5 minutes)
    let repetitiveCount = 0;
    const seen = new Set<string>();
    
    for (let i = 0; i < this.alerts.length - 1; i++) {
      for (let j = i + 1; j < this.alerts.length; j++) {
        const timeDiff = Math.abs(
          this.alerts[j].normalized_timestamp - this.alerts[i].normalized_timestamp
        );
        
        if (timeDiff > 300000) break; // More than 5 minutes apart
        
        if (
          this.alerts[i].service_name === this.alerts[j].service_name &&
          this.alerts[i].alert_type === this.alerts[j].alert_type &&
          this.alerts[i].alert_name === this.alerts[j].alert_name
        ) {
          const key = `${i}-${j}`;
          if (!seen.has(key)) {
            repetitiveCount++;
            seen.add(key);
          }
        }
      }
    }

    const fpRate = resolvedAlerts.length > 0 
      ? quickResolves.length / resolvedAlerts.length 
      : 0;

    console.log(`[Historical Analyzer]   Quick resolves: ${quickResolves.length}, Repetitive: ${repetitiveCount}, FP rate: ${(fpRate * 100).toFixed(1)}%`);

    return {
      quick_resolves: quickResolves,
      repetitive_count: repetitiveCount,
      estimated_fp_rate: fpRate
    };
  }

  /**
   * Analyze temporal patterns (hourly/daily)
   */
  private analyzeTemporalPatterns(): TemporalPattern {
    console.log('[Historical Analyzer] Analyzing temporal patterns...');
    
    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};

    for (const alert of this.alerts) {
      const date = new Date(alert.normalized_timestamp);
      const hour = date.getHours();
      const day = date.getDay();

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }

    // Find hours/days with above-average activity
    const avgHourly = Statistics.mean(Object.values(hourCounts));
    const avgDaily = Statistics.mean(Object.values(dayCounts));

    const peakHours = Object.entries(hourCounts)
      .filter(([_, count]) => count > avgHourly * 1.5)
      .map(([hour, _]) => parseInt(hour))
      .sort((a, b) => a - b);

    const peakDays = Object.entries(dayCounts)
      .filter(([_, count]) => count > avgDaily * 1.2)
      .map(([day, _]) => parseInt(day))
      .sort((a, b) => a - b);

    console.log(`[Historical Analyzer]   Peak hours: ${peakHours.join(', ') || 'None'}`);
    console.log(`[Historical Analyzer]   Peak days: ${peakDays.join(', ') || 'None'}`);

    return {
      peak_hours: peakHours,
      peak_days: peakDays,
      hourly_distribution: hourCounts,
      daily_distribution: dayCounts
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(report: AnalysisReport): string[] {
    console.log('[Historical Analyzer] Generating recommendations...');
    
    const recommendations: string[] = [];

    // High false positive rate
    if (report.false_positive_analysis.estimated_fp_rate > 0.3) {
      recommendations.push(
        `⚠️ High false positive rate detected (${(report.false_positive_analysis.estimated_fp_rate * 100).toFixed(1)}%). Consider increasing alert thresholds.`
      );
    }

    // Noisy services
    for (const [service, baseline] of Object.entries(report.service_baselines)) {
      if (baseline.false_positive_rate > 0.4) {
        recommendations.push(
          `🔧 ${service}: ${(baseline.false_positive_rate * 100).toFixed(1)}% false positive rate. Recommend threshold adjustment.`
        );
      }
      
      if (baseline.alert_rate_per_hour > 10) {
        recommendations.push(
          `📊 ${service}: High alert rate (${baseline.alert_rate_per_hour.toFixed(1)}/hour). Consider alert suppression or threshold tuning.`
        );
      }
    }

    // Repetitive alerts
    if (report.false_positive_analysis.repetitive_count > 50) {
      recommendations.push(
        `🔁 ${report.false_positive_analysis.repetitive_count} repetitive alert patterns detected. Consider alert suppression rules.`
      );
    }

    // Temporal patterns
    if (report.temporal_patterns.peak_hours.length > 0) {
      recommendations.push(
        `📅 Peak alert hours detected: ${report.temporal_patterns.peak_hours.join(', ')}. Consider time-based threshold adjustments.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Alert patterns appear normal. Continue monitoring.');
    }

    return recommendations;
  }
}

