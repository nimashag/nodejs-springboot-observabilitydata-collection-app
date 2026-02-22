import { LogTemplateMiner } from '../services/templateMiner';
import { TemplateModel } from '../models/templateModel';
import { MLBasedLogParser } from '../services/logParser';
import fs from 'fs';
import path from 'path';

/**
 * Test script to verify template matching is working
 */
async function testTemplateMatching() {
  console.log('=== Template Matching Test ===\n');

  // Initialize template miner and model
  const templateMiner = new LogTemplateMiner();
  const templateModel = new TemplateModel();
  
  // Load existing templates
  const existingTemplates = templateModel.getAllTemplates();
  existingTemplates.forEach(template => {
    templateMiner.addTemplate(template);
  });
  
  console.log(`Loaded ${existingTemplates.length} templates\n`);

  // Initialize parser with template miner
  const logParser = new MLBasedLogParser(templateMiner);

  // Test with actual logs from aggregated files
  const aggregatedLogsPath = path.join(__dirname, '..', '..', 'aggregated-logs');
  
  if (!fs.existsSync(aggregatedLogsPath)) {
    console.log('No aggregated logs found. Please run log collection first.');
    return;
  }

  const files = fs.readdirSync(aggregatedLogsPath)
    .filter(file => file.endsWith('.jsonl'))
    .sort()
    .reverse()
    .slice(0, 1); // Test with most recent file

  if (files.length === 0) {
    console.log('No aggregated log files found.');
    return;
  }

  console.log(`Testing with file: ${files[0]}\n`);
  
  const filePath = path.join(aggregatedLogsPath, files[0]);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim()).slice(0, 5000); // Test first 10 logs

  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      const rawLog = parsed.raw;
      const serviceName = parsed.service;

      // Test template matching
      const matchedTemplate = templateMiner.matchTemplate(rawLog);
      
      // Test parsing with template miner
      const structured = await logParser.parseLog(rawLog, serviceName);

      if (matchedTemplate) {
        matchedCount++;
        console.log(`✓ Matched: ${matchedTemplate.id}`);
        console.log(`  Template: ${matchedTemplate.template.substring(0, 80)}...`);
        console.log(`  Event Type: ${matchedTemplate.eventType}`);
        console.log(`  Log: ${rawLog.substring(0, 80)}...`);
        console.log(`  Structured metadata has matchedTemplateId: ${!!structured.metadata.matchedTemplateId}`);
        console.log('');
      } else {
        unmatchedCount++;
        console.log(`✗ No match`);
        console.log(`  Log: ${rawLog.substring(0, 80)}...`);
        console.log('');
      }
    } catch (error) {
      console.error(`Error processing log: ${error}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total logs tested: ${lines.length}`);
  console.log(`Matched: ${matchedCount} (${((matchedCount / lines.length) * 100).toFixed(2)}%)`);
  console.log(`Unmatched: ${unmatchedCount} (${((unmatchedCount / lines.length) * 100).toFixed(2)}%)`);
}

// Run test
testTemplateMatching().catch(console.error);

