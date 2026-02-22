import { NormalizedAlertEvent } from '../types';
import { AlertRoutingDecision } from './alert-router';

export interface AlertGroup {
  group_id: string;
  group_type: 'duplicate' | 'similar' | 'burst' | 'cascade';
  alerts: NormalizedAlertEvent[];
  representative_alert: NormalizedAlertEvent;
  time_window_ms: number;
  first_seen: string;
  last_seen: string;
  count: number;
  services_affected: string[];
  should_send_digest: boolean;
  digest_message: string;
}

export interface DeduplicationResult {
  original_count: number;
  deduplicated_count: number;
  reduction_percentage: number;
  groups: AlertGroup[];
  unique_alerts: NormalizedAlertEvent[];
}

export interface GroupingSummary {
  total_alerts: number;
  total_groups: number;
  average_group_size: number;
  largest_group_size: number;
  notification_reduction: number;
  by_group_type: {
    duplicate: number;
    similar: number;
    burst: number;
    cascade: number;
  };
}

export class SmartAlertGrouper {
  private groupingWindow: number = 300000; // 5 minutes
  private similarityThreshold: number = 0.7;
  private burstThreshold: number = 5; // 5 alerts in window = burst

  constructor() {}

  /**
   * Deduplicate and group alerts
   */
  deduplicateAndGroup(alerts: NormalizedAlertEvent[]): DeduplicationResult {
    const sortedAlerts = [...alerts].sort(
      (a, b) => a.normalized_timestamp - b.normalized_timestamp
    );

    const groups: AlertGroup[] = [];
    const processed = new Set<string>();
    const uniqueAlerts: NormalizedAlertEvent[] = [];

    for (let i = 0; i < sortedAlerts.length; i++) {
      const alert = sortedAlerts[i];
      const alertKey = this.getAlertKey(alert);

      if (processed.has(alertKey)) {
        continue;
      }

      // Find similar alerts in time window
      const similarAlerts = this.findSimilarAlerts(
        alert,
        sortedAlerts.slice(i + 1),
        this.groupingWindow
      );

      if (similarAlerts.length > 0) {
        const group = this.createAlertGroup(alert, similarAlerts);
        groups.push(group);

        // Mark as processed
        processed.add(alertKey);
        similarAlerts.forEach(a => processed.add(this.getAlertKey(a)));
      } else {
        // Unique alert
        uniqueAlerts.push(alert);
        processed.add(alertKey);
      }
    }

    const reductionPercent = alerts.length > 0
      ? ((alerts.length - uniqueAlerts.length - groups.length) / alerts.length) * 100
      : 0;

    return {
      original_count: alerts.length,
      deduplicated_count: uniqueAlerts.length + groups.length,
      reduction_percentage: reductionPercent,
      groups: groups,
      unique_alerts: uniqueAlerts
    };
  }

  /**
   * Get unique key for alert
   */
  private getAlertKey(alert: NormalizedAlertEvent): string {
    return `${alert.service_name}:${alert.alert_type}:${alert.timestamp}`;
  }

  /**
   * Find similar alerts within time window
   */
  private findSimilarAlerts(
    baseAlert: NormalizedAlertEvent,
    candidates: NormalizedAlertEvent[],
    timeWindow: number
  ): NormalizedAlertEvent[] {
    const similar: NormalizedAlertEvent[] = [];

    for (const candidate of candidates) {
      const timeDiff = candidate.normalized_timestamp - baseAlert.normalized_timestamp;
      
      if (timeDiff > timeWindow) {
        break; // Beyond time window
      }

      const similarity = this.calculateSimilarity(baseAlert, candidate);
      if (similarity >= this.similarityThreshold) {
        similar.push(candidate);
      }
    }

    return similar;
  }

  /**
   * Calculate similarity between two alerts
   */
  private calculateSimilarity(alert1: NormalizedAlertEvent, alert2: NormalizedAlertEvent): number {
    let score = 0;

    // Same service (0.4 points)
    if (alert1.service_name === alert2.service_name) {
      score += 0.4;
    }

    // Same alert type (0.3 points)
    if (alert1.alert_type === alert2.alert_type) {
      score += 0.3;
    }

    // Same alert name (0.2 points)
    if (alert1.alert_name === alert2.alert_name) {
      score += 0.2;
    }

    // Same severity (0.1 points)
    if (alert1.severity === alert2.severity) {
      score += 0.1;
    }

    return score;
  }

  /**
   * Create alert group
   */
  private createAlertGroup(
    baseAlert: NormalizedAlertEvent,
    similarAlerts: NormalizedAlertEvent[]
  ): AlertGroup {
    const allAlerts = [baseAlert, ...similarAlerts];
    
    // Determine group type
    const groupType = this.determineGroupType(baseAlert, similarAlerts);
    
    // Find time range
    const timestamps = allAlerts.map(a => a.normalized_timestamp);
    const firstSeen = Math.min(...timestamps);
    const lastSeen = Math.max(...timestamps);
    
    // Get affected services
    const servicesAffected = [...new Set(allAlerts.map(a => a.service_name))];
    
    // Determine if digest should be sent
    const shouldSendDigest = this.shouldSendDigest(groupType, allAlerts.length);
    
    // Create digest message
    const digestMessage = this.createDigestMessage(groupType, baseAlert, allAlerts.length, servicesAffected);

    return {
      group_id: `group_${firstSeen}_${Date.now()}`,
      group_type: groupType,
      alerts: allAlerts,
      representative_alert: baseAlert,
      time_window_ms: lastSeen - firstSeen,
      first_seen: new Date(firstSeen).toISOString(),
      last_seen: new Date(lastSeen).toISOString(),
      count: allAlerts.length,
      services_affected: servicesAffected,
      should_send_digest: shouldSendDigest,
      digest_message: digestMessage
    };
  }

  /**
   * Determine group type based on alert patterns
   */
  private determineGroupType(
    baseAlert: NormalizedAlertEvent,
    similarAlerts: NormalizedAlertEvent[]
  ): 'duplicate' | 'similar' | 'burst' | 'cascade' {
    const allAlerts = [baseAlert, ...similarAlerts];
    
    // Check if all alerts are identical (duplicate)
    const allIdentical = similarAlerts.every(alert =>
      alert.service_name === baseAlert.service_name &&
      alert.alert_name === baseAlert.alert_name &&
      alert.alert_type === baseAlert.alert_type
    );

    if (allIdentical) {
      if (allAlerts.length >= this.burstThreshold) {
        return 'burst';
      }
      return 'duplicate';
    }

    // Check if multiple services (cascade)
    const uniqueServices = new Set(allAlerts.map(a => a.service_name));
    if (uniqueServices.size > 1) {
      return 'cascade';
    }

    return 'similar';
  }

  /**
   * Determine if digest should be sent
   */
  private shouldSendDigest(groupType: string, count: number): boolean {
    // Always send digest for cascades and large bursts
    if (groupType === 'cascade') {
      return true;
    }
    
    if (groupType === 'burst' && count >= 10) {
      return true;
    }

    // Send digest for large duplicate groups
    if (groupType === 'duplicate' && count >= 5) {
      return true;
    }

    return false;
  }

  /**
   * Create digest message
   */
  private createDigestMessage(
    groupType: string,
    representativeAlert: NormalizedAlertEvent,
    count: number,
    services: string[]
  ): string {
    const messages: Record<string, string> = {
      'duplicate': `${count} identical "${representativeAlert.alert_name}" alerts from ${representativeAlert.service_name}`,
      'similar': `${count} similar ${representativeAlert.alert_type} alerts from ${representativeAlert.service_name}`,
      'burst': `Alert burst: ${count} "${representativeAlert.alert_name}" alerts from ${representativeAlert.service_name} in short time`,
      'cascade': `Cascading failure: ${count} alerts across ${services.length} services (${services.join(', ')})`
    };

    return messages[groupType] || `${count} grouped alerts`;
  }

  /**
   * Generate batched notifications
   */
  generateBatchedNotifications(groups: AlertGroup[]): {
    immediate: AlertGroup[];
    batched: AlertGroup[];
    suppressed: AlertGroup[];
  } {
    const immediate: AlertGroup[] = [];
    const batched: AlertGroup[] = [];
    const suppressed: AlertGroup[] = [];

    for (const group of groups) {
      if (group.group_type === 'cascade') {
        immediate.push(group); // Cascades need immediate attention
      } else if (group.should_send_digest) {
        batched.push(group); // Send as digest
      } else if (group.group_type === 'duplicate' && group.count >= 3) {
        suppressed.push(group); // Too many duplicates, suppress
      } else {
        batched.push(group);
      }
    }

    return { immediate, batched, suppressed };
  }

  /**
   * Create notification digest for batched alerts
   */
  createNotificationDigest(batchedGroups: AlertGroup[]): {
    subject: string;
    summary: string;
    groups: AlertGroup[];
    total_alerts: number;
  } {
    const totalAlerts = batchedGroups.reduce((sum, group) => sum + group.count, 0);
    const affectedServices = [
      ...new Set(batchedGroups.flatMap(g => g.services_affected))
    ];

    const subject = `Alert Digest: ${batchedGroups.length} groups (${totalAlerts} alerts) - ${affectedServices.length} services affected`;
    
    const summary = [
      `Alert Summary:`,
      `- Total Alerts: ${totalAlerts}`,
      `- Alert Groups: ${batchedGroups.length}`,
      `- Services Affected: ${affectedServices.join(', ')}`,
      ``,
      `Groups:`,
      ...batchedGroups.map(g => `  - ${g.digest_message}`)
    ].join('\n');

    return {
      subject,
      summary,
      groups: batchedGroups,
      total_alerts: totalAlerts
    };
  }

  /**
   * Generate grouping summary
   */
  generateSummary(result: DeduplicationResult): GroupingSummary {
    const groupCounts = {
      duplicate: 0,
      similar: 0,
      burst: 0,
      cascade: 0
    };

    result.groups.forEach(group => {
      groupCounts[group.group_type]++;
    });

    const groupSizes = result.groups.map(g => g.count);
    const avgGroupSize = groupSizes.length > 0
      ? groupSizes.reduce((sum, size) => sum + size, 0) / groupSizes.length
      : 0;
    const largestGroupSize = groupSizes.length > 0 ? Math.max(...groupSizes) : 0;

    // Calculate notification reduction
    // Original: send all alerts
    // New: send unique alerts + 1 notification per group
    const originalNotifications = result.original_count;
    const newNotifications = result.unique_alerts.length + result.groups.length;
    const notificationReduction = originalNotifications > 0
      ? ((originalNotifications - newNotifications) / originalNotifications) * 100
      : 0;

    return {
      total_alerts: result.original_count,
      total_groups: result.groups.length,
      average_group_size: avgGroupSize,
      largest_group_size: largestGroupSize,
      notification_reduction: notificationReduction,
      by_group_type: groupCounts
    };
  }
}

