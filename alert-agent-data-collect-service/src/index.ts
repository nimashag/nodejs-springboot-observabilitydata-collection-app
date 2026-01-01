import * as fs from 'fs';
import * as path from 'path';
import { AlertDataCollector } from './collector';
import { HistoricalAnalyzer } from './analyzer/historical-analyzer';
import { ThresholdAdjuster } from './tuner/threshold-adjuster';
import { ReportGenerator } from './reporter/report-generator';
import { AlertRouter } from './router/alert-router';
import { AlertSuppressor } from './suppressor/alert-suppressor';

function main() {
  console.log('='.repeat(70));
  console.log('🤖 ADAPTIVE ALERT TUNING AGENT (AATA)');
  console.log('='.repeat(70));
  console.log('');
  console.log('Smart Observability Middleware for Adaptive Microservice Monitoring');
  console.log('');
  console.log('='.repeat(70));
  console.log('');

  // Step 1: Collect alert data
  console.log('📊 STEP 1: Collecting Alert Data');
  console.log('-'.repeat(70));
  const collector = new AlertDataCollector();
  const allAlerts = collector.collectAllAlerts();
  
  if (allAlerts.length === 0) {
    console.log('');
    console.log('❌ No alert data found!');
    console.log('');
    console.log('Please ensure:');
    console.log('  1. Services are running');
    console.log('  2. Traffic has been generated');
    console.log('  3. Alerts have been triggered');
    console.log('');
    return;
  }

  const summary = collector.generateSummary(allAlerts);

  // Create output directory
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write collected data
  collector.writeCombinedAlertHistory(allAlerts, path.join(outputDir, 'combined-alert-history.json'));
  collector.writeSummary(summary, path.join(outputDir, 'alert-summary.json'));

  console.log(`✅ Collected ${allAlerts.length} alerts from ${Object.keys(summary.alerts_by_service).length} services`);
  console.log('');

  // Step 2: Historical Analysis
  console.log('🔍 STEP 2: Analyzing Historical Alert Patterns');
  console.log('-'.repeat(70));
  const analyzer = new HistoricalAnalyzer(allAlerts);
  const analysisReport = analyzer.analyze();

  fs.writeFileSync(
    path.join(outputDir, 'analysis-report.json'),
    JSON.stringify(analysisReport, null, 2)
  );

  console.log(`✅ Analysis complete`);
  console.log(`   Time range: ${analysisReport.time_range.start}`);
  console.log(`              to ${analysisReport.time_range.end}`);
  console.log(`   Services: ${Object.keys(analysisReport.service_baselines).length}`);
  console.log(`   False positive rate: ${(analysisReport.false_positive_analysis.estimated_fp_rate * 100).toFixed(1)}%`);
  console.log('');

  // Step 3: Threshold Adjustment
  console.log('⚙️  STEP 3: Calculating Adaptive Thresholds');
  console.log('-'.repeat(70));
  const adjuster = new ThresholdAdjuster(allAlerts, analysisReport.service_baselines);
  const thresholdRecommendations = adjuster.calculateAdaptiveThresholds();
  const thresholdConfig = adjuster.exportThresholdConfig();
  const impact = adjuster.calculateExpectedImpact();

  fs.writeFileSync(
    path.join(outputDir, 'threshold-recommendations.json'),
    JSON.stringify(thresholdRecommendations, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, 'adaptive-threshold-config.json'),
    JSON.stringify(thresholdConfig, null, 2)
  );

  console.log(`✅ Threshold recommendations generated`);
  console.log(`   Recommendations: ${thresholdRecommendations.length}`);
  console.log(`   Expected alerts saved: ~${impact.alerts_saved}`);
  console.log('');

  // Step 4: Alert Routing & Suppression
  console.log('🚦 STEP 4: Intelligent Alert Routing');
  console.log('-'.repeat(70));
  const router = new AlertRouter();
  const { decisions: routingDecisions, summary: routingSummary } = router.routeAlerts(allAlerts);
  const routingEfficiency = router.calculateEfficiency(routingSummary);
  const routingRecommendations = router.generateRoutingRecommendations(routingSummary);

  fs.writeFileSync(
    path.join(outputDir, 'alert-routing-decisions.json'),
    JSON.stringify(routingDecisions, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, 'routing-summary.json'),
    JSON.stringify({ summary: routingSummary, efficiency: routingEfficiency, recommendations: routingRecommendations }, null, 2)
  );

  console.log(`✅ Alert routing complete`);
  console.log(`   Admin notifications: ${routingSummary.admin_notifications} (${(routingSummary.admin_notifications/routingSummary.total_alerts*100).toFixed(1)}%)`);
  console.log(`   Noise reduction: ${routingEfficiency.noise_reduction_percentage.toFixed(1)}%`);
  console.log('');

  // Step 5: Alert Suppression
  console.log('🔇 STEP 5: Alert Suppression Analysis');
  console.log('-'.repeat(70));
  const suppressor = new AlertSuppressor();
  const { suppressed, allowed, summary: suppressionSummary } = suppressor.suppressAlerts(allAlerts);

  fs.writeFileSync(
    path.join(outputDir, 'suppression-analysis.json'),
    JSON.stringify({ suppressed, allowed, summary: suppressionSummary }, null, 2)
  );

  console.log(`✅ Suppression analysis complete`);
  console.log(`   Suppression rate: ${suppressionSummary.suppression_rate.toFixed(1)}%`);
  console.log('');

  // Step 6: Generate Report
  console.log('📄 STEP 6: Generating Comprehensive Report');
  console.log('-'.repeat(70));
  ReportGenerator.generateMarkdownReport(
    analysisReport,
    thresholdRecommendations,
    path.join(outputDir, 'AATA-REPORT.md')
  );
  console.log('✅ Report generated');
  console.log('');

  // Step 5: Display Summary
  console.log('='.repeat(70));
  console.log('📋 SUMMARY REPORT');
  console.log('='.repeat(70));
  console.log('');

  console.log('📊 Alert Statistics:');
  console.log('');
  for (const [service, baseline] of Object.entries(analysisReport.service_baselines)) {
    console.log(`   ${service}:`);
    console.log(`      Total alerts: ${baseline.total_alerts}`);
    console.log(`      False positive rate: ${(baseline.false_positive_rate * 100).toFixed(1)}%`);
    console.log(`      Avg alert duration: ${(baseline.avg_alert_duration / 1000).toFixed(1)}s`);
    console.log(`      Alert rate: ${baseline.alert_rate_per_hour.toFixed(2)}/hour`);
    console.log('');
  }

  console.log('🎯 Threshold Recommendations:');
  console.log('');
  for (const rec of thresholdRecommendations) {
    const arrow = rec.adjustment_percentage > 0 ? '↑' : rec.adjustment_percentage < 0 ? '↓' : '→';
    console.log(`   ${rec.service_name} (${rec.alert_type}):`);
    console.log(`      Current: ${rec.current_threshold} ${arrow} Recommended: ${rec.recommended_threshold}`);
    console.log(`      Adjustment: ${rec.adjustment_percentage.toFixed(1)}% (${rec.confidence} confidence)`);
    console.log('');
  }

  console.log('💡 Key Recommendations:');
  console.log('');
  for (const recommendation of analysisReport.recommendations.slice(0, 5)) {
    console.log(`   ${recommendation}`);
  }
  console.log('');

  console.log('📈 Expected Impact:');
  console.log('');
  console.log(`   Target FP Reduction: 40%`);
  console.log(`   Estimated Alerts Saved: ~${impact.alerts_saved} alerts`);
  console.log(`   Noise Reduction: ${impact.noise_reduction_percentage.toFixed(1)}%`);
  console.log('');

  console.log('🚦 Alert Routing Impact:');
  console.log('');
  console.log(`   Total Alerts: ${routingSummary.total_alerts}`);
  console.log(`   Admin Notifications: ${routingSummary.admin_notifications} (${(routingSummary.admin_notifications/routingSummary.total_alerts*100).toFixed(1)}%)`);
  console.log(`   Suppressed: ${routingSummary.suppressed} (${(routingSummary.suppressed/routingSummary.total_alerts*100).toFixed(1)}%)`);
  console.log(`   Logged Only: ${routingSummary.logged} (${(routingSummary.logged/routingSummary.total_alerts*100).toFixed(1)}%)`);
  console.log(`   Escalated: ${routingSummary.escalated}`);
  console.log('');
  console.log('   By Urgency:');
  console.log(`      Critical: ${routingSummary.by_urgency.critical}`);
  console.log(`      High: ${routingSummary.by_urgency.high}`);
  console.log(`      Medium: ${routingSummary.by_urgency.medium}`);
  console.log(`      Low: ${routingSummary.by_urgency.low}`);
  console.log('');

  console.log('💡 Routing Recommendations:');
  console.log('');
  for (const rec of routingRecommendations) {
    console.log(`   ${rec}`);
  }
  console.log('');

  console.log('='.repeat(70));
  console.log('✅ AATA ANALYSIS COMPLETE!');
  console.log('='.repeat(70));
  console.log('');
  console.log('📁 Output files generated in ./output/:');
  console.log('   ✓ combined-alert-history.json     - Raw alert data');
  console.log('   ✓ alert-summary.json               - Alert statistics');
  console.log('   ✓ analysis-report.json             - Detailed analysis');
  console.log('   ✓ threshold-recommendations.json   - Threshold adjustments');
  console.log('   ✓ adaptive-threshold-config.json   - Ready-to-use config');
  console.log('   ✓ alert-routing-decisions.json     - Routing decisions');
  console.log('   ✓ routing-summary.json             - Routing analysis');
  console.log('   ✓ suppression-analysis.json        - Suppression analysis');
  console.log('   ✓ AATA-REPORT.md                   - Human-readable report');
  console.log('');
  console.log('🎯 Key Achievement:');
  console.log('');
  console.log(`   ✅ Only ${routingSummary.admin_notifications} of ${routingSummary.total_alerts} alerts (${(routingSummary.admin_notifications/routingSummary.total_alerts*100).toFixed(1)}%) require admin attention`);
  console.log(`   ✅ ${routingEfficiency.admin_alert_reduction_percentage.toFixed(1)}% reduction in admin notifications`);
  console.log(`   ✅ Intelligent routing ensures only urgent situations reach admins`);
  console.log('');
  console.log('📖 Next Steps:');
  console.log('   1. Review AATA-REPORT.md for detailed insights');
  console.log('   2. Review alert-routing-decisions.json for routing policies');
  console.log('   3. Validate threshold recommendations');
  console.log('   4. Apply adaptive thresholds to services');
  console.log('   5. Configure notification channels (email, SMS, Slack)');
  console.log('   6. Monitor impact for 24-48 hours');
  console.log('   7. Re-run AATA to validate improvements');
  console.log('');
  console.log('='.repeat(70));
}

// Run the AATA
try {
  main();
} catch (error) {
  console.error('');
  console.error('❌ AATA encountered an error:');
  console.error('');
  console.error(error);
  console.error('');
  process.exit(1);
}
