import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { MLBasedLogParser } from '../services/logParser';
import { StructuredLog } from '../types/log.types';

dotenv.config();

/**
 * Training script for the ML model
 * This script can be used to train the model on sample logs
 */
async function trainModel() {
  console.log('Starting ML model training...');

  const parser = new MLBasedLogParser();

  // Check if we have sample logs file
  const sampleLogsPath = path.join(__dirname, '..', '..', 'sample-logs.json');
  
  let sampleLogs: Array<{ raw: string; structured: StructuredLog }> = [];

  if (fs.existsSync(sampleLogsPath)) {
    console.log(`Loading sample logs from ${sampleLogsPath}...`);
    const content = fs.readFileSync(sampleLogsPath, 'utf-8');
    sampleLogs = JSON.parse(content);
  } else {
    // Try to use aggregated logs
    const aggregatedLogPath = path.join(__dirname, '..', '..', 'aggregated-logs');
    
    if (fs.existsSync(aggregatedLogPath)) {
      console.log(`Loading logs from aggregated logs directory...`);
      const files = fs.readdirSync(aggregatedLogPath)
        .filter(file => file.endsWith('.jsonl'))
        .sort()
        .reverse()
        .slice(0, 3); // Use last 3 files

      for (const file of files) {
        const filePath = path.join(aggregatedLogPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines.slice(0, 200)) { // Limit per file
          try {
            const structured = JSON.parse(line) as StructuredLog;
            if (structured.raw) {
              sampleLogs.push({
                raw: structured.raw,
                structured,
              });
            }
          } catch (e) {
            // Skip invalid lines
          }
        }
      }
    }
  }

  if (sampleLogs.length === 0) {
    console.error('No sample logs found. Please provide sample logs in one of these ways:');
    console.error('1. Create a sample-logs.json file with format:');
    console.error('   [{ "raw": "log line", "structured": { ... } }]');
    console.error('2. Run the log collector first to generate aggregated logs');
    process.exit(1);
  }

  console.log(`Training on ${sampleLogs.length} sample logs...`);
  
  try {
    await parser.trainModel(sampleLogs);
    console.log('✅ Model training completed successfully!');
    console.log(`Model is trained: ${parser.isModelTrained()}`);
  } catch (error) {
    console.error('❌ Model training failed:', error);
    process.exit(1);
  }
}

trainModel();

