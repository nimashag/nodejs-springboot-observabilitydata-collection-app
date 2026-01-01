import * as fs from 'fs';
import { AnalysisReport } from '../analyzer/historical-analyzer';
import { AdaptiveThreshold } from '../tuner/threshold-adjuster';

export class ReportGenerator {
  /**
   * Generate comprehensive Markdown report
   */
  static generateMarkdownReport(
    analysisReport: AnalysisReport,
    thresholdRecommendations: AdaptiveThreshold[],
    outputPath: string
  ): void {
    let markdown = `# 🤖 Adaptive Alert Tuning Agent (AATA) Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += `---\n\n`;

    // Executive Summary
    markdown += `## 📊 Executive Summary\n\n`;
    markdown += `- **Total Alerts Analyzed:** ${analysisReport.total_alerts_analyzed}\n`;
    markdown += `- **Time Range:** ${analysisReport.time_range.start} to ${analysisReport.time_range.end}\n`;
    markdown += `- **Services Analyzed:** ${Object.keys(analysisReport.service_baselines).length}\n`;
    markdown += `- **Overall False Positive Rate:** ${(analysisReport.false_positive_analysis.estimated_fp_rate * 100).toFixed(1)}%\n`;
    markdown += `- **Quick Resolves (< 30s):** ${analysisReport.false_positive_analysis.quick_resolves.length}\n`;
    markdown += `- **Repetitive Alert Patterns:** ${analysisReport.false_positive_analysis.repetitive_count}\n\n`;

    // Service Baselines
    markdown += `## 🎯 Service Baselines\n\n`;
    markdown += `| Service | Total Alerts | Avg Error Count | Avg Response Time | FP Rate | Alert Rate/Hour |\n`;
    markdown += `|---------|--------------|-----------------|-------------------|---------|------------------|\n`;
    
    for (const [service, baseline] of Object.entries(analysisReport.service_baselines)) {
      markdown += `| ${service} | ${baseline.total_alerts} | ${baseline.avg_error_count.toFixed(1)} | ${baseline.avg_response_time.toFixed(0)}ms | ${(baseline.false_positive_rate * 100).toFixed(1)}% | ${baseline.alert_rate_per_hour.toFixed(2)} |\n`;
    }
    markdown += `\n`;

    // Threshold Recommendations
    markdown += `## ⚙️ Adaptive Threshold Recommendations\n\n`;
    markdown += `| Service | Alert Type | Current | Recommended | Change | Confidence | Samples |\n`;
    markdown += `|---------|------------|---------|-------------|--------|------------|----------|\n`;
    
    for (const rec of thresholdRecommendations) {
      const arrow = rec.adjustment_percentage > 0 ? '↑' : rec.adjustment_percentage < 0 ? '↓' : '→';
      const changeStr = rec.adjustment_percentage !== 0 
        ? `${arrow} ${Math.abs(rec.adjustment_percentage).toFixed(1)}%` 
        : '→ 0%';
      markdown += `| ${rec.service_name} | ${rec.alert_type} | ${rec.current_threshold} | ${rec.recommended_threshold} | ${changeStr} | ${rec.confidence} | ${rec.based_on_samples} |\n`;
    }
    markdown += `\n`;

    // Detailed Recommendations
    markdown += `### 📝 Detailed Rationale\n\n`;
    for (const rec of thresholdRecommendations) {
      markdown += `**${rec.service_name} - ${rec.alert_type}:**\n`;
      markdown += `- ${rec.rationale}\n`;
      markdown += `- Based on ${rec.based_on_samples} samples\n`;
      markdown += `- Confidence: ${rec.confidence}\n\n`;
    }

    // Temporal Patterns
    markdown += `## 📅 Temporal Patterns\n\n`;
    
    if (analysisReport.temporal_patterns.peak_hours.length > 0) {
      markdown += `**Peak Hours (UTC):** ${analysisReport.temporal_patterns.peak_hours.join(', ')}\n\n`;
    } else {
      markdown += `**Peak Hours:** No significant peaks detected\n\n`;
    }
    
    if (analysisReport.temporal_patterns.peak_days.length > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const peakDayNames = analysisReport.temporal_patterns.peak_days.map(d => dayNames[d]);
      markdown += `**Peak Days:** ${peakDayNames.join(', ')}\n\n`;
    } else {
      markdown += `**Peak Days:** No significant peaks detected\n\n`;
    }

    // Hourly Distribution Chart (ASCII)
    markdown += `### Hourly Alert Distribution\n\n`;
    markdown += `\`\`\`\n`;
    const maxHourlyCount = Math.max(...Object.values(analysisReport.temporal_patterns.hourly_distribution));
    for (let hour = 0; hour < 24; hour++) {
      const count = analysisReport.temporal_patterns.hourly_distribution[hour] || 0;
      const barLength = Math.floor((count / maxHourlyCount) * 50);
      const bar = '█'.repeat(barLength);
      markdown += `${hour.toString().padStart(2, '0')}:00 | ${bar} ${count}\n`;
    }
    markdown += `\`\`\`\n\n`;

    // Recommendations
    markdown += `## 💡 Actionable Recommendations\n\n`;
    for (const recommendation of analysisReport.recommendations) {
      markdown += `- ${recommendation}\n`;
    }
    markdown += `\n`;

    // Impact Estimation
    markdown += `## 📈 Expected Impact\n\n`;
    const avgFpRate = analysisReport.false_positive_analysis.estimated_fp_rate;
    const totalAlerts = analysisReport.total_alerts_analyzed;
    const estimatedReduction = avgFpRate * 0.4; // 40% reduction target
    const alertsSaved = Math.floor(totalAlerts * estimatedReduction);
    
    markdown += `By applying these adaptive thresholds:\n\n`;
    markdown += `- **Target False Positive Reduction:** 40%\n`;
    markdown += `- **Current FP Rate:** ${(avgFpRate * 100).toFixed(1)}%\n`;
    markdown += `- **Expected FP Rate:** ${((avgFpRate * 0.6) * 100).toFixed(1)}%\n`;
    markdown += `- **Estimated Alerts Saved:** ~${alertsSaved} alerts\n`;
    markdown += `- **Noise Reduction:** ${(estimatedReduction * 100).toFixed(1)}%\n`;
    markdown += `- **Operator Efficiency:** Improved by reducing alert fatigue\n\n`;

    // Implementation Guide
    markdown += `## 🚀 Implementation Guide\n\n`;
    markdown += `### Step 1: Review Recommendations\n`;
    markdown += `Review the threshold recommendations above and validate they align with your operational requirements.\n\n`;
    
    markdown += `### Step 2: Apply Thresholds\n`;
    markdown += `Update the alert detector configuration in each service:\n\n`;
    markdown += `\`\`\`typescript\n`;
    markdown += `// Example for orders-service\n`;
    markdown += `private readonly ERROR_BURST_THRESHOLD = ${thresholdRecommendations.find(r => r.alert_type === 'error')?.recommended_threshold || 5};\n`;
    markdown += `private readonly AVAILABILITY_ERROR_RATE = ${thresholdRecommendations.find(r => r.alert_type === 'availability')?.recommended_threshold || 0.5};\n`;
    markdown += `\`\`\`\n\n`;
    
    markdown += `### Step 3: Monitor Impact\n`;
    markdown += `After applying changes:\n`;
    markdown += `1. Monitor alert volumes for 24-48 hours\n`;
    markdown += `2. Track false positive rates\n`;
    markdown += `3. Gather operator feedback\n`;
    markdown += `4. Re-run AATA analysis to validate improvements\n\n`;

    // Footer
    markdown += `---\n\n`;
    markdown += `## 📊 Data Sources\n\n`;
    markdown += `- **Alert Data Files:** Combined from all microservices\n`;
    markdown += `- **Analysis Period:** ${analysisReport.time_range.start} to ${analysisReport.time_range.end}\n`;
    markdown += `- **Services Monitored:** ${Object.keys(analysisReport.service_baselines).join(', ')}\n\n`;
    
    markdown += `## 🔬 Methodology\n\n`;
    markdown += `**Historical Analysis:**\n`;
    markdown += `- Statistical analysis (mean, standard deviation, percentiles)\n`;
    markdown += `- False positive detection (quick resolves < 30s)\n`;
    markdown += `- Temporal pattern analysis\n\n`;
    
    markdown += `**Threshold Adjustment:**\n`;
    markdown += `- Adaptive thresholds using mean + k*std formula\n`;
    markdown += `- Sensitivity factor (k) adjusted based on FP rate\n`;
    markdown += `- Percentile-based thresholds (75th, 90th percentiles)\n`;
    markdown += `- Confidence scoring based on sample size\n\n`;

    markdown += `---\n\n`;
    markdown += `*This report was automatically generated by the Adaptive Alert Tuning Agent (AATA)*\n`;
    markdown += `*For questions or issues, review the analysis-report.json and threshold-recommendations.json files*\n`;

    fs.writeFileSync(outputPath, markdown);
  }
}

