import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { LogTemplateMiner } from '../services/templateMiner';
import { TemplateModel } from '../models/templateModel';
import { StructuredLog } from '../types/log.types';

dotenv.config();

/**
 * Test script for template mining
 * This script mines templates from actual service logs
 */
async function testTemplateMining() {
  console.log('=== Template Mining Test ===\n');

  const templateMiner = new LogTemplateMiner();
  const templateModel = new TemplateModel();

  // Get project root (parent of log-aggregation-service)
  const projectRoot = path.resolve(__dirname, '..', '..', '..');

  // Define service log files
  const serviceLogs = [
    {
      name: 'restaurants-service',
      path: path.join(projectRoot, 'restaurants-service', 'logs', 'restaurants-service.log'),
    },
    {
      name: 'orders-service',
      path: path.join(projectRoot, 'orders-service', 'logs', 'orders-service.log'),
    },
    {
      name: 'users-service',
      path: path.join(projectRoot, 'users-service', 'logs', 'users-service.log'),
    },
  ];

  // Test 1: Mine templates from individual services
  console.log('Test 1: Mining templates from individual services\n');
  
  for (const service of serviceLogs) {
    if (!fs.existsSync(service.path)) {
      console.log(`⚠ Skipping ${service.name}: Log file not found at ${service.path}\n`);
      continue;
    }

    console.log(`📊 Processing ${service.name}...`);
    const content = fs.readFileSync(service.path, 'utf-8');
    const logs = content.split('\n').filter(line => line.trim()).slice(0, 500); // Limit to 500 logs for testing

    if (logs.length === 0) {
      console.log(`  No logs found in ${service.name}\n`);
      continue;
    }

    console.log(`  Found ${logs.length} log lines`);
    console.log(`  Mining templates...`);

    const startTime = Date.now();
    const result = await templateMiner.mineTemplates(
      logs,
      service.name,
      3, // minClusterSize
      30 // maxClusters
    );
    const duration = Date.now() - startTime;

    console.log(`  ✓ Mining completed in ${duration}ms`);
    console.log(`  ✓ Found ${result.templates.length} templates`);
    console.log(`  ✓ Coverage: ${result.coverage.toFixed(2)}%`);
    console.log(`  ✓ Most common template: ${result.statistics.mostCommonTemplate?.template.substring(0, 80)}...`);
    console.log(`  ✓ Average frequency: ${result.statistics.avgTemplateFrequency.toFixed(2)} logs per template\n`);

    // Save templates
    await templateModel.saveTemplates(result.templates);
    result.templates.forEach(t => templateMiner.addTemplate(t));

    // Show top 5 templates
    if (result.templates.length > 0) {
      console.log(`  Top 5 templates for ${service.name}:`);
      result.templates
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5)
        .forEach((template, idx) => {
          console.log(`    ${idx + 1}. [Frequency: ${template.frequency}] ${template.template.substring(0, 100)}...`);
        });
      console.log('');
    }
  }

  // Test 2: Mine from aggregated logs (if they exist)
  console.log('\nTest 2: Mining templates from aggregated logs\n');
  
  const aggregatedLogsPath = path.join(__dirname, '..', '..', 'aggregated-logs');
  if (fs.existsSync(aggregatedLogsPath)) {
    const files = fs.readdirSync(aggregatedLogsPath)
      .filter(file => file.endsWith('.jsonl'))
      .sort()
      .reverse()
      .slice(0, 1); // Use most recent file

    if (files.length > 0) {
      const allLogs: string[] = [];
      
      for (const file of files) {
        const filePath = path.join(aggregatedLogsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines.slice(0, 1000)) { // Limit to 1000 logs
          try {
            const log: StructuredLog = JSON.parse(line);
            if (log.raw) {
              allLogs.push(log.raw);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      if (allLogs.length > 0) {
        console.log(`📊 Processing aggregated logs (${allLogs.length} logs)...`);
        const startTime = Date.now();
        const result = await templateMiner.mineTemplates(
          allLogs,
          undefined, // no specific service
          5, // minClusterSize
          50 // maxClusters
        );
        const duration = Date.now() - startTime;

        console.log(`  ✓ Mining completed in ${duration}ms`);
        console.log(`  ✓ Found ${result.templates.length} templates`);
        console.log(`  ✓ Coverage: ${result.coverage.toFixed(2)}%`);
        console.log(`  ✓ Total logs processed: ${result.totalLogs}\n`);

        // Save templates
        await templateModel.saveTemplates(result.templates);
      }
    } else {
      console.log('  No aggregated log files found\n');
    }
  } else {
    console.log(`  Aggregated logs directory not found at ${aggregatedLogsPath}\n`);
  }

  // Test 3: Test template matching
  console.log('\nTest 3: Testing template matching\n');
  
  const testLogs = [
    'svc=restaurants-service | level=INFO | ts=2025-12-29T16:54:02.639+05:30 | event=http.request.received | data={"method":"GET","path":"/api/restaurants","ip":"::1","requestId":"4fa0c7de-f1da-4ae6-9684-fa1b6d4e178a"}',
    '{"lvl":"info","time":"2025-12-29T11:28:25.495Z","svc":"orders-service","meta":{"method":"POST","path":"/api/orders"},"msg":"http.request.received"}',
    '2025-12-29 16:53:47.619 INFO  [users-service] [main] c.a.u.UsersServiceApplication - Starting UsersServiceApplication',
  ];

  console.log('Testing template matching on sample logs:');
  testLogs.forEach((log, idx) => {
    const matched = templateMiner.matchTemplate(log);
    if (matched) {
      console.log(`  ✓ Log ${idx + 1}: Matched template "${matched.template.substring(0, 80)}..."`);
      console.log(`    Template ID: ${matched.id}`);
      console.log(`    Frequency: ${matched.frequency}`);
    } else {
      console.log(`  ✗ Log ${idx + 1}: No template matched`);
    }
  });

  // Summary
  console.log('\n=== Summary ===');
  const allTemplates = templateModel.getAllTemplates();
  console.log(`Total templates mined: ${allTemplates.length}`);
  console.log(`Templates by service:`);
  const byService = new Map<string, number>();
  allTemplates.forEach(t => {
    const service = t.service || 'unknown';
    byService.set(service, (byService.get(service) || 0) + 1);
  });
  byService.forEach((count, service) => {
    console.log(`  ${service}: ${count} templates`);
  });

  console.log('\n✓ Template mining test completed!');
  console.log(`Templates saved to: ${path.join(__dirname, '..', '..', 'templates', 'templates.json')}`);
}

// Run the test
testTemplateMining().catch(error => {
  console.error('Error during template mining test:', error);
  process.exit(1);
});

