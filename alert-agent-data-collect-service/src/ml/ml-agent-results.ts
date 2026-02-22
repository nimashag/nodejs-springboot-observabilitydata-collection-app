/**
 * ML Agent Results Aggregator
 * Aggregates alert intelligence data from processed alerts
 * Works with both ML-predicted and non-ML alerts by deriving priority from severity
 */

import { NormalizedAlertEvent, MLPrediction, MLAgentResults } from "../types";

// Map severity to priority level when ML predictions aren't available
const SEVERITY_TO_PRIORITY: Record<string, string> = {
  critical: "P0",
  high: "P1",
  medium: "P2",
  low: "P3",
  warning: "P2",
  info: "P3",
};

export class MLAgentResultsAggregator {
  /**
   * Get priority level for an alert (from ML or derived from severity)
   */
  private static getPriorityLevel(alert: NormalizedAlertEvent): string {
    const mlPredictions = (alert as any).ml_predictions as
      | MLPrediction
      | undefined;
    if (mlPredictions?.priority?.priority_level) {
      return mlPredictions.priority.priority_level;
    }
    // Derive from severity
    const severity = (alert.severity || "medium").toLowerCase();
    return SEVERITY_TO_PRIORITY[severity] || "P2";
  }

  /**
   * Get priority score for an alert (from ML or derived from severity)
   */
  private static getPriorityScore(alert: NormalizedAlertEvent): number {
    const mlPredictions = (alert as any).ml_predictions as
      | MLPrediction
      | undefined;
    if (mlPredictions?.priority?.priority_score) {
      return mlPredictions.priority.priority_score;
    }
    // Derive score from severity
    const severity = (alert.severity || "medium").toLowerCase();
    const scoreMap: Record<string, number> = {
      critical: 90,
      high: 70,
      medium: 50,
      low: 30,
      warning: 45,
      info: 20,
    };
    return scoreMap[severity] || 50;
  }

  /**
   * Get estimated TTR category based on alert characteristics
   */
  private static getTTRCategory(alert: NormalizedAlertEvent): string {
    const mlPredictions = (alert as any).ml_predictions as
      | MLPrediction
      | undefined;
    if (mlPredictions?.ttr?.ttr_category) {
      return mlPredictions.ttr.ttr_category;
    }
    // Estimate TTR based on severity and alert type
    const severity = (alert.severity || "medium").toLowerCase();
    const alertType = (alert.alert_type || "").toLowerCase();

    if (severity === "critical" || alertType.includes("outage")) {
      return "urgent";
    } else if (severity === "high" || alertType.includes("error")) {
      return "short";
    } else if (severity === "medium") {
      return "medium";
    }
    return "long";
  }

  /**
   * Get estimated TTR minutes based on alert characteristics
   */
  private static getTTRMinutes(alert: NormalizedAlertEvent): number {
    const mlPredictions = (alert as any).ml_predictions as
      | MLPrediction
      | undefined;
    if (mlPredictions?.ttr?.ttr_minutes) {
      return mlPredictions.ttr.ttr_minutes;
    }
    // Estimate TTR in minutes based on category
    const category = this.getTTRCategory(alert);
    const ttrMap: Record<string, number> = {
      urgent: 15,
      short: 30,
      medium: 60,
      long: 120,
    };
    return ttrMap[category] || 60;
  }

  /**
   * Get SLA breach risk based on alert characteristics
   */
  private static getSLARisk(alert: NormalizedAlertEvent): string {
    const mlPredictions = (alert as any).ml_predictions as
      | MLPrediction
      | undefined;
    if (mlPredictions?.ttr?.sla_breach_risk) {
      return mlPredictions.ttr.sla_breach_risk;
    }
    // Estimate SLA risk from priority
    const priority = this.getPriorityLevel(alert);
    const riskMap: Record<string, string> = {
      P0: "critical",
      P1: "high",
      P2: "medium",
      P3: "low",
    };
    return riskMap[priority] || "medium";
  }

  /**
   * Generate comprehensive ML agent results from processed alerts
   */
  static generateResults(alerts: NormalizedAlertEvent[]): MLAgentResults {
    // Work with ALL alerts, not just ML-processed ones
    const allAlerts = alerts;
    const mlProcessedAlerts = alerts.filter((a) => (a as any).ml_predictions);

    const summary = this.generateSummary(allAlerts, mlProcessedAlerts.length);
    const classifiedAlerts = this.aggregateClassifications(allAlerts);
    const predictions = this.aggregatePredictions(allAlerts);
    const falsePositives = this.detectFalsePositives(allAlerts);

    // Get recent alerts (last 50)
    const recentAlerts = allAlerts
      .sort((a, b) => b.normalized_timestamp - a.normalized_timestamp)
      .slice(0, 50);

    return {
      summary,
      classified_alerts: classifiedAlerts,
      predictions,
      false_positives: falsePositives,
      recent_ml_alerts: recentAlerts,
    };
  }

  /**
   * Generate summary statistics
   */
  private static generateSummary(
    alerts: NormalizedAlertEvent[],
    mlProcessedCount: number,
  ): MLAgentResults["summary"] {
    const totalProcessed = alerts.length;

    let totalConfidence = 0;
    let confidenceCount = 0;
    let highPriorityCount = 0;
    let suppressedCount = 0;
    let falsePositivesDetected = 0;

    alerts.forEach((alert) => {
      const mlPredictions = (alert as any).ml_predictions as
        | MLPrediction
        | undefined;
      const priorityLevel = this.getPriorityLevel(alert);

      // Count confidence from ML predictions or use default
      if (mlPredictions?.priority?.confidence) {
        totalConfidence += mlPredictions.priority.confidence;
        confidenceCount++;
      } else {
        // Default confidence based on severity classification
        totalConfidence += 0.85;
        confidenceCount++;
      }

      if (["P0", "P1"].includes(priorityLevel)) {
        highPriorityCount++;
      }

      if (mlPredictions?.suppressed) {
        suppressedCount++;
      }

      if (mlPredictions?.is_false_positive) {
        falsePositivesDetected++;
      }
    });

    const avgConfidence =
      confidenceCount > 0 ? totalConfidence / confidenceCount : 0.85;

    return {
      total_processed: totalProcessed,
      total_classified: totalProcessed, // All alerts are classified (via ML or severity)
      total_predicted: mlProcessedCount > 0 ? mlProcessedCount : totalProcessed,
      false_positives_detected: falsePositivesDetected,
      suppressed_count: suppressedCount,
      high_priority_count: highPriorityCount,
      avg_confidence: Math.round(avgConfidence * 100) / 100,
      processing_rate: totalProcessed > 0 ? "100%" : "0%",
    };
  }

  /**
   * Aggregate alert classifications
   */
  private static aggregateClassifications(
    alerts: NormalizedAlertEvent[],
  ): MLAgentResults["classified_alerts"] {
    const byPriority: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    const byType: Record<string, number> = {};
    const byService: Record<string, { count: number; totalScore: number }> = {};

    alerts.forEach((alert) => {
      // Use our helper to get priority (from ML or derived from severity)
      const priorityLevel = this.getPriorityLevel(alert);
      const priorityScore = this.getPriorityScore(alert);

      byPriority[priorityLevel] = (byPriority[priorityLevel] || 0) + 1;

      // Classify by alert type
      const alertType = alert.alert_type || "unknown";
      byType[alertType] = (byType[alertType] || 0) + 1;

      // Aggregate by service
      const serviceName = alert.service_name || "unknown";
      if (!byService[serviceName]) {
        byService[serviceName] = { count: 0, totalScore: 0 };
      }
      byService[serviceName].count++;
      byService[serviceName].totalScore += priorityScore;
    });

    // Calculate average priority scores
    const byServiceWithAvg: Record<
      string,
      { count: number; avg_priority_score: number }
    > = {};
    Object.entries(byService).forEach(([service, data]) => {
      byServiceWithAvg[service] = {
        count: data.count,
        avg_priority_score:
          data.count > 0
            ? Math.round((data.totalScore / data.count) * 10) / 10
            : 0,
      };
    });

    return {
      by_priority: byPriority,
      by_type: byType,
      by_service: byServiceWithAvg,
    };
  }

  /**
   * Aggregate prediction results
   */
  private static aggregatePredictions(
    alerts: NormalizedAlertEvent[],
  ): MLAgentResults["predictions"] {
    const priorityCounts: Record<string, number> = {};
    const ttrData: Record<string, { count: number; totalMinutes: number }> = {};
    const slaRiskCounts: Record<string, number> = {};

    alerts.forEach((alert) => {
      // Use helper methods that work with both ML and non-ML alerts
      const priorityLevel = this.getPriorityLevel(alert);
      const ttrCategory = this.getTTRCategory(alert);
      const ttrMinutes = this.getTTRMinutes(alert);
      const slaRisk = this.getSLARisk(alert);

      // Priority distribution
      priorityCounts[priorityLevel] = (priorityCounts[priorityLevel] || 0) + 1;

      // TTR distribution
      if (!ttrData[ttrCategory]) {
        ttrData[ttrCategory] = { count: 0, totalMinutes: 0 };
      }
      ttrData[ttrCategory].count++;
      ttrData[ttrCategory].totalMinutes += ttrMinutes;

      // SLA risk counts
      slaRiskCounts[slaRisk] = (slaRiskCounts[slaRisk] || 0) + 1;
    });

    const totalAlerts = alerts.length || 1;

    // Priority distribution
    const priorityDistribution = Object.entries(priorityCounts)
      .map(([level, count]) => ({
        level,
        count,
        percentage: Math.round((count / totalAlerts) * 100 * 10) / 10,
      }))
      .sort((a, b) => {
        const order = ["P0", "P1", "P2", "P3"];
        return order.indexOf(a.level) - order.indexOf(b.level);
      });

    // TTR distribution
    const ttrDistribution = Object.entries(ttrData)
      .map(([category, data]) => ({
        category,
        count: data.count,
        avg_minutes: Math.round((data.totalMinutes / data.count) * 10) / 10,
      }))
      .sort((a, b) => a.avg_minutes - b.avg_minutes);

    // SLA breach risks
    const slaBreachRisks = Object.entries(slaRiskCounts)
      .map(([risk, count]) => ({ risk, count }))
      .sort((a, b) => {
        const order = ["low", "medium", "high", "critical"];
        return (
          order.indexOf(a.risk.toLowerCase()) -
          order.indexOf(b.risk.toLowerCase())
        );
      });

    return {
      priority_distribution: priorityDistribution,
      ttr_distribution: ttrDistribution,
      sla_breach_risks: slaBreachRisks,
    };
  }

  /**
   * Detect and aggregate false positives
   * Uses heuristics to identify likely false positive alerts
   */
  private static detectFalsePositives(
    alerts: NormalizedAlertEvent[],
  ): MLAgentResults["false_positives"] {
    const falsePositives: MLAgentResults["false_positives"] = [];

    // Group alerts by name and service for pattern detection
    const alertGroups: Record<string, NormalizedAlertEvent[]> = {};

    alerts.forEach((alert) => {
      const key = `${alert.service_name}:${alert.alert_name}`;
      if (!alertGroups[key]) {
        alertGroups[key] = [];
      }
      alertGroups[key].push(alert);
    });

    // Detect false positives based on patterns
    Object.entries(alertGroups).forEach(([key, groupAlerts]) => {
      // Check for quick resolution patterns (fired -> resolved within 1 minute)
      const quickResolves = this.findQuickResolves(groupAlerts);

      // Check for repetitive patterns (same alert firing multiple times)
      const isRepetitive = groupAlerts.length > 5;

      // Check for low severity with high frequency
      const lowSeverityHighFreq =
        groupAlerts.length > 10 &&
        groupAlerts.every((a) => a.severity === "low");

      if (quickResolves.length > 0 || isRepetitive || lowSeverityHighFreq) {
        const [serviceName, alertName] = key.split(":");
        let reason = "";
        let confidence = 0;

        if (quickResolves.length > 0) {
          reason = `Quick resolution pattern: ${quickResolves.length} alerts resolved within 1 minute`;
          confidence = Math.min(0.9, 0.5 + quickResolves.length * 0.1);
        } else if (lowSeverityHighFreq) {
          reason = `Low severity with high frequency: ${groupAlerts.length} occurrences`;
          confidence = 0.75;
        } else if (isRepetitive) {
          reason = `Repetitive firing pattern: ${groupAlerts.length} occurrences`;
          confidence = Math.min(0.85, 0.4 + groupAlerts.length * 0.05);
        }

        // Mark alerts as false positives
        groupAlerts.forEach((alert) => {
          const mlPredictions = (alert as any).ml_predictions as
            | MLPrediction
            | undefined;
          if (mlPredictions) {
            mlPredictions.is_false_positive = true;
            mlPredictions.false_positive_confidence = confidence;
          }
        });

        falsePositives.push({
          alert_id: `${serviceName}-${alertName}-fp`,
          alert_name: alertName,
          service_name: serviceName,
          confidence: Math.round(confidence * 100) / 100,
          reason,
          detected_at: new Date().toISOString(),
        });
      }
    });

    return falsePositives.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find alerts that resolved very quickly (likely false positives)
   */
  private static findQuickResolves(
    alerts: NormalizedAlertEvent[],
  ): NormalizedAlertEvent[] {
    const quickResolves: NormalizedAlertEvent[] = [];
    const ONE_MINUTE_MS = 60000;

    // Sort by timestamp
    const sorted = [...alerts].sort(
      (a, b) => a.normalized_timestamp - b.normalized_timestamp,
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (current.alert_state === "fired" && next.alert_state === "resolved") {
        const duration =
          next.normalized_timestamp - current.normalized_timestamp;
        if (duration < ONE_MINUTE_MS) {
          quickResolves.push(current);
        }
      }
    }

    return quickResolves;
  }

  /**
   * Get alerts filtered by ML criteria
   */
  static getMLFilteredAlerts(
    alerts: NormalizedAlertEvent[],
    filter: {
      priorityLevel?: string;
      isFalsePositive?: boolean;
      minConfidence?: number;
      service?: string;
    },
  ): NormalizedAlertEvent[] {
    return alerts.filter((alert) => {
      const mlPredictions = (alert as any).ml_predictions as
        | MLPrediction
        | undefined;

      if (!mlPredictions) return false;

      if (
        filter.priorityLevel &&
        mlPredictions.priority?.priority_level !== filter.priorityLevel
      ) {
        return false;
      }

      if (
        filter.isFalsePositive !== undefined &&
        mlPredictions.is_false_positive !== filter.isFalsePositive
      ) {
        return false;
      }

      if (
        filter.minConfidence &&
        mlPredictions.priority?.confidence < filter.minConfidence
      ) {
        return false;
      }

      if (filter.service && alert.service_name !== filter.service) {
        return false;
      }

      return true;
    });
  }
}
