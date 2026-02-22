import { PIIDetector } from '../services/piiDetector';
import { StructuredLog } from '../types/log.types';

/**
 * Test script for PII Detection and Redaction
 * 
 * This script demonstrates the PII detection capabilities with various
 * sample logs containing sensitive information.
 */

// Sample logs with PII
const sampleLogs: string[] = [
  // Log with IP address
  '{"lvl":"info","time":"2025-12-31T04:07:17.739Z","svc":"orders-service","meta":{"method":"GET","path":"/api/orders","ip":"192.168.1.100","userAgent":"Mozilla/5.0"},"msg":"http.request.received"}',
  
  // Log with email address
  '{"lvl":"info","time":"2025-12-31T04:07:17.739Z","svc":"users-service","meta":{"userId":"123","email":"user@example.com","action":"login"},"msg":"user.login.success"}',
  
  // Log with username
  'svc=users-service | level=INFO | event=user.login | username=john_doe | status=success',
  
  // Log with credential
  'svc=auth-service | level=INFO | event=auth.attempt | username=admin | password=secret123 | status=failed',
  
  // Log with multiple PII types
  '{"lvl":"info","time":"2025-12-31T04:07:17.739Z","svc":"orders-service","meta":{"method":"POST","path":"/api/orders","ip":"203.0.113.45","userId":"user123","email":"customer@example.com","email":"billing@example.com"},"msg":"order.created"}',
  
  // Log with phone number
  '{"lvl":"info","time":"2025-12-31T04:07:17.739Z","svc":"users-service","meta":{"userId":"123","phone":"+1-555-123-4567","action":"profile.update"},"msg":"user.profile.updated"}',
  
  // Log with credit card (if enabled)
  '{"lvl":"info","time":"2025-12-31T04:07:17.739Z","svc":"payment-service","meta":{"orderId":"123","cardNumber":"4532-1234-5678-9010","action":"payment.processed"},"msg":"payment.success"}',
];

// Sample structured logs
const sampleStructuredLogs: StructuredLog[] = [
  {
    timestamp: '2025-12-31T04:07:17.739Z',
    service: 'orders-service',
    level: 'info',
    event: 'http.request.received',
    metadata: {
      method: 'GET',
      path: '/api/orders',
      ip: '203.0.113.45',
      userAgent: 'Mozilla/5.0',
      userId: 'user123',
      email: 'customer@example.com',
    },
    raw: '{"lvl":"info","time":"2025-12-31T04:07:17.739Z","svc":"orders-service","meta":{"method":"GET","path":"/api/orders","ip":"203.0.113.45","userAgent":"Mozilla/5.0","userId":"user123","email":"customer@example.com"},"msg":"http.request.received"}',
  },
  {
    timestamp: '2025-12-31T04:07:17.739Z',
    service: 'users-service',
    level: 'info',
    event: 'user.login',
    metadata: {
      username: 'john_doe',
      password: 'secret123',
      ip: '192.168.1.100',
    },
    raw: 'svc=users-service | level=INFO | event=user.login | username=john_doe | password=secret123 | ip=192.168.1.100',
  },
];

function testPIIDetection() {
  console.log('=== PII Detection Test\n');
  console.log('='.repeat(80));

  // Test with default configuration (mask strategy)
  console.log('\n📋 Test 1: Default Configuration (Mask Strategy)');
  console.log('-'.repeat(80));
  const detector1 = new PIIDetector();
  
  for (let i = 0; i < sampleLogs.length; i++) {
    const log = sampleLogs[i];
    const matches = detector1.detectPII(log);
    const redacted = detector1.redactPII(log, matches);
    
    console.log(`\nSample ${i + 1}:`);
    console.log(`Original: ${log.substring(0, 100)}${log.length > 100 ? '...' : ''}`);
    if (matches.length > 0) {
      console.log(`Detected PII: ${matches.map(m => `${m.type}(${m.value})`).join(', ')}`);
      console.log(`Redacted: ${redacted.substring(0, 100)}${redacted.length > 100 ? '...' : ''}`);
    } else {
      console.log('No PII detected');
    }
  }

  // Test with hash strategy
  console.log('\n\n📋 Test 2: Hash Strategy');
  console.log('-'.repeat(80));
  const detector2 = new PIIDetector({ strategy: 'hash' });
  
  const testLog = sampleLogs[3]; // Log with credential
  const matches2 = detector2.detectPII(testLog);
  const redacted2 = detector2.redactPII(testLog, matches2);
  
  console.log(`Original: ${testLog}`);
  console.log(`Detected PII: ${matches2.map(m => `${m.type}(${m.value})`).join(', ')}`);
  console.log(`Redacted: ${redacted2}`);

  // Test with partial mask strategy
  console.log('\n\n📋 Test 3: Partial Mask Strategy');
  console.log('-'.repeat(80));
  const detector3 = new PIIDetector({ strategy: 'partial' });
  
  const testLog3 = sampleLogs[1]; // Log with email
  const matches3 = detector3.detectPII(testLog3);
  const redacted3 = detector3.redactPII(testLog3, matches3);
  
  console.log(`Original: ${testLog3.substring(0, 150)}...`);
  console.log(`Detected PII: ${matches3.map(m => `${m.type}(${m.value})`).join(', ')}`);
  console.log(`Redacted: ${redacted3.substring(0, 150)}...`);

  // Test with structured logs
  console.log('\n\n📋 Test 4: Structured Log Redaction');
  console.log('-'.repeat(80));
  const detector4 = new PIIDetector();
  
  for (let i = 0; i < sampleStructuredLogs.length; i++) {
    const log = sampleStructuredLogs[i];
    const redactedLog = detector4.redactStructuredLog(log);
    
    console.log(`\nStructured Log ${i + 1}:`);
    console.log(`Service: ${log.service}`);
    console.log(`Event: ${log.event}`);
    console.log(`PII Detected: ${redactedLog.piiDetected?.join(', ') || 'None'}`);
    console.log(`PII Redacted: ${redactedLog.piiRedacted ? 'Yes' : 'No'}`);
    console.log(`Original Metadata:`, JSON.stringify(log.metadata, null, 2));
    console.log(`Redacted Metadata:`, JSON.stringify(redactedLog.metadata, null, 2));
  }

  // Test metadata redaction
  console.log('\n\n📋 Test 5: Metadata Redaction (Nested Objects)');
  console.log('-'.repeat(80));
  const detector5 = new PIIDetector();
  
  const complexMetadata = {
    user: {
      id: 'user123',
      email: 'user@example.com',
      profile: {
        phone: '+1-555-123-4567',
        address: '123 Main St',
      },
    },
    request: {
      ip: '203.0.113.45',
      headers: {
        'user-agent': 'Mozilla/5.0',
        'authorization': 'Bearer secret-token-12345',
      },
    },
    items: ['item1', 'item2'],
  };
  
  const redactedMetadata = detector5.redactMetadata(complexMetadata);
  console.log('Original Metadata:');
  console.log(JSON.stringify(complexMetadata, null, 2));
  console.log('\nRedacted Metadata:');
  console.log(JSON.stringify(redactedMetadata, null, 2));

  // Test detection statistics
  console.log('\n\n📋 Test 6: Detection Statistics');
  console.log('-'.repeat(80));
  const detector6 = new PIIDetector();
  const allMatches: any[] = [];
  
  for (const log of sampleLogs) {
    allMatches.push(...detector6.detectPII(log));
  }
  
  const stats = detector6.getDetectionStats(allMatches);
  console.log('PII Detection Statistics:');
  for (const [type, count] of Object.entries(stats)) {
    console.log(`  ${type}: ${count}`);
  }

  // Test configuration
  console.log('\n\n📋 Test 7: Configuration');
  console.log('-'.repeat(80));
  const detector7 = new PIIDetector({
    detectIPs: false,
    detectEmails: true,
    strategy: 'hash',
  });
  
  const config = detector7.getConfig();
  console.log('Current Configuration:');
  console.log(JSON.stringify(config, null, 2));
  
  const testLog7 = sampleLogs[0]; // Has IP and potentially email
  const matches7 = detector7.detectPII(testLog7);
  console.log(`\nTest Log: ${testLog7.substring(0, 100)}...`);
  console.log(`Detected PII (IPs disabled): ${matches7.map(m => `${m.type}(${m.value})`).join(', ')}`);

  console.log('\n\n✅ PII Detection Test Complete!');
  console.log('='.repeat(80));
}

// Run tests
if (require.main === module) {
  try {
    testPIIDetection();
  } catch (error) {
    console.error('Error running PII detection tests:', error);
    process.exit(1);
  }
}

export { testPIIDetection };

