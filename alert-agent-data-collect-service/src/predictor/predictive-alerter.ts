import { NormalizedAlertEvent } from '../types';
import { Statistics } from '../analyzer/statistics';

export interface Prediction {
  prediction_id: string;
  service_name: string;
  alert_type: string;
  predicted_time: string;
  confidence: number;
  time_to_breach_minutes: number;
  current_value: number;
  threshold_value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  recommendation: string;
}

export interface TrendAnalysis {
  service_name: string;
  alert_type: string;
  metric_name: string;
  current_value: number;
  trend_direction: 'up' | 'down' | 'stable';
  rate_of_change: number;
  time_series: TimeSeriesPoint[];
  forecast: TimeSeriesPoint[];
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface PredictiveMetrics {
  total_predictions: number;
  high_confidence_predictions: number;
  average_lead_time_minutes: number;
  predicted_incidents_prevented: number;
}

export class PredictiveAlerter {
  private forecastWindow: number = 900000; // 15 minutes ahead
  private minDataPoints: number = 10;
  private trendThreshold: number = 0.1; // 10% change to consider trending

  constructor(
    private alerts: NormalizedAlertEvent[],
    private thresholds: Record<string, Record<string, number>>
  ) {}

  /**
   * Analyze trends for all services and alert types
   */
  analyzeTrends(): TrendAnalysis[] {
    const analyses: TrendAnalysis[] = [];
    const services = [...new Set(this.alerts.map(a => a.service_name))];

    for (const service of services) {
      const serviceAlerts = this.alerts.filter(a => a.service_name === service);
      const alertTypes = [...new Set(serviceAlerts.map(a => a.alert_type))];

      for (const alertType of alertTypes) {
        const typeAlerts = serviceAlerts.filter(a => a.alert_type === alertType);
        
        if (typeAlerts.length < this.minDataPoints) {
          continue;
        }

        const trend = this.analyzeTrendForType(service, alertType, typeAlerts);
        if (trend) {
          analyses.push(trend);
        }
      }
    }

    return analyses;
  }

  /**
   * Analyze trend for specific alert type
   */
  private analyzeTrendForType(
    serviceName: string,
    alertType: string,
    alerts: NormalizedAlertEvent[]
  ): TrendAnalysis | null {
    // Extract time series data based on alert type
    const timeSeries = this.extractTimeSeries(alertType, alerts);
    
    if (timeSeries.length < this.minDataPoints) {
      return null;
    }

    // Sort by timestamp
    timeSeries.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate trend
    const { direction, rate } = this.calculateTrend(timeSeries);
    const currentValue = timeSeries[timeSeries.length - 1].value;

    // Generate forecast
    const forecast = this.generateForecast(timeSeries, rate);

    return {
      service_name: serviceName,
      alert_type: alertType,
      metric_name: this.getMetricName(alertType),
      current_value: currentValue,
      trend_direction: direction,
      rate_of_change: rate,
      time_series: timeSeries.slice(-20), // Last 20 points
      forecast: forecast
    };
  }

  /**
   * Extract time series from alerts
   */
  private extractTimeSeries(alertType: string, alerts: NormalizedAlertEvent[]): TimeSeriesPoint[] {
    const timeSeries: TimeSeriesPoint[] = [];

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
          // Normalize if needed
          if (value > 100) {
            value = value / 10000000; // Convert microseconds to percentage
          }
          break;
      }

      if (value > 0) {
        timeSeries.push({
          timestamp: alert.normalized_timestamp,
          value: value
        });
      }
    }

    return timeSeries;
  }

  /**
   * Calculate trend direction and rate of change
   */
  private calculateTrend(timeSeries: TimeSeriesPoint[]): { direction: 'up' | 'down' | 'stable', rate: number } {
    if (timeSeries.length < 2) {
      return { direction: 'stable', rate: 0 };
    }

    // Use linear regression to find trend
    const n = timeSeries.length;
    const sumX = timeSeries.reduce((sum, point, i) => sum + i, 0);
    const sumY = timeSeries.reduce((sum, point) => sum + point.value, 0);
    const sumXY = timeSeries.reduce((sum, point, i) => sum + i * point.value, 0);
    const sumX2 = timeSeries.reduce((sum, point, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgValue = sumY / n;

    // Calculate rate as percentage change per time unit
    const rate = avgValue !== 0 ? (slope / avgValue) : 0;

    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(rate) > this.trendThreshold) {
      direction = rate > 0 ? 'up' : 'down';
    }

    return { direction, rate };
  }

  /**
   * Generate forecast points
   */
  private generateForecast(timeSeries: TimeSeriesPoint[], rate: number): TimeSeriesPoint[] {
    const forecast: TimeSeriesPoint[] = [];
    const lastPoint = timeSeries[timeSeries.length - 1];
    const avgValue = Statistics.mean(timeSeries.map(p => p.value));
    
    // Generate 5 forecast points (3 minutes apart)
    const forecastInterval = 180000; // 3 minutes
    
    for (let i = 1; i <= 5; i++) {
      const timestamp = lastPoint.timestamp + forecastInterval * i;
      // Simple linear forecast: value = current + (rate * avgValue * steps)
      const value = lastPoint.value + (rate * avgValue * i);
      
      forecast.push({
        timestamp: timestamp,
        value: Math.max(0, value)
      });
    }

    return forecast;
  }

  /**
   * Generate predictions for threshold breaches
   */
  generatePredictions(trends: TrendAnalysis[]): Prediction[] {
    const predictions: Prediction[] = [];

    for (const trend of trends) {
      if (trend.trend_direction === 'stable' || trend.trend_direction === 'down') {
        continue; // No risk of breach
      }

      const threshold = this.getThreshold(trend.service_name, trend.alert_type);
      if (threshold === 0) {
        continue;
      }

      // Check if any forecast point breaches threshold
      for (const forecastPoint of trend.forecast) {
        if (forecastPoint.value >= threshold) {
          const timeToBreachMs = forecastPoint.timestamp - trend.time_series[trend.time_series.length - 1].timestamp;
          const timeToBreachMin = Math.round(timeToBreachMs / 60000);

          const prediction = this.createPrediction(
            trend,
            forecastPoint,
            threshold,
            timeToBreachMin
          );

          predictions.push(prediction);
          break; // Only predict first breach
        }
      }
    }

    return predictions;
  }

  /**
   * Create prediction object
   */
  private createPrediction(
    trend: TrendAnalysis,
    breachPoint: TimeSeriesPoint,
    threshold: number,
    timeToBreachMin: number
  ): Prediction {
    // Calculate confidence based on trend consistency
    const recentValues = trend.time_series.slice(-5).map(p => p.value);
    const variance = Statistics.stdDev(recentValues) / Statistics.mean(recentValues);
    const confidence = Math.max(0.5, Math.min(0.95, 1 - variance));

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      trend.alert_type,
      timeToBreachMin,
      trend.current_value,
      threshold
    );

    return {
      prediction_id: `pred_${Date.now()}_${trend.service_name}_${trend.alert_type}`,
      service_name: trend.service_name,
      alert_type: trend.alert_type,
      predicted_time: new Date(breachPoint.timestamp).toISOString(),
      confidence: confidence,
      time_to_breach_minutes: timeToBreachMin,
      current_value: trend.current_value,
      threshold_value: threshold,
      trend: 'increasing',
      recommendation: recommendation
    };
  }

  /**
   * Get threshold for service and alert type
   */
  private getThreshold(serviceName: string, alertType: string): number {
    const serviceThresholds = this.thresholds[serviceName];
    if (!serviceThresholds) {
      return 0;
    }

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
   * Generate recommendation based on prediction
   */
  private generateRecommendation(
    alertType: string,
    timeToBreachMin: number,
    currentValue: number,
    threshold: number
  ): string {
    const urgency = timeToBreachMin <= 5 ? 'URGENT' : timeToBreachMin <= 10 ? 'High' : 'Medium';
    const percentToThreshold = ((threshold - currentValue) / threshold * 100).toFixed(0);

    const recommendations: Record<string, string> = {
      'error': `${urgency}: Error rate trending up. ${percentToThreshold}% to threshold. Consider scaling up or investigating error source.`,
      'latency': `${urgency}: Response time increasing. Consider scaling resources or optimizing slow queries.`,
      'availability': `${urgency}: Service availability declining. Check for connection issues or resource constraints.`,
      'traffic': `${urgency}: Traffic spike detected. Scale horizontally or enable rate limiting.`,
      'resource': `${urgency}: Resource usage climbing. Scale up resources or optimize resource-intensive operations.`
    };

    return recommendations[alertType] || `${urgency}: Threshold breach predicted in ${timeToBreachMin} minutes.`;
  }

  /**
   * Get metric name for alert type
   */
  private getMetricName(alertType: string): string {
    const metricNames: Record<string, string> = {
      'error': 'Error Count',
      'latency': 'Response Time (ms)',
      'availability': 'Error Rate',
      'traffic': 'Request Rate',
      'resource': 'CPU Usage (%)'
    };

    return metricNames[alertType] || alertType;
  }

  /**
   * Get predictive metrics summary
   */
  getPredictiveMetrics(predictions: Prediction[]): PredictiveMetrics {
    const highConfidence = predictions.filter(p => p.confidence > 0.75).length;
    const avgLeadTime = predictions.length > 0
      ? predictions.reduce((sum, p) => sum + p.time_to_breach_minutes, 0) / predictions.length
      : 0;

    // Estimate incidents prevented (assuming 80% accuracy)
    const prevented = Math.floor(highConfidence * 0.8);

    return {
      total_predictions: predictions.length,
      high_confidence_predictions: highConfidence,
      average_lead_time_minutes: avgLeadTime,
      predicted_incidents_prevented: prevented
    };
  }
}

