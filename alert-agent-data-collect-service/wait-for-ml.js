/**
 * Wait for ML service to be ready before starting AATA
 */
const http = require('http');

const ML_HOST = '127.0.0.1'; // Use IPv4 to avoid IPv6 connection issues
const ML_PORT = 5001;
const MAX_RETRIES = 10;
const RETRY_DELAY = 1000; // 1 second

let retries = 0;

function checkMLService() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: ML_HOST,
        port: ML_PORT,
        path: '/health',
        method: 'GET',
        family: 4, // Force IPv4 to avoid IPv6 connection issues
        timeout: 2000
      },
      (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`ML service returned status ${res.statusCode}`));
        }
      }
    );

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function waitForML() {
  console.log('[Wait] Waiting for ML service to be ready...');
  
  while (retries < MAX_RETRIES) {
    try {
      await checkMLService();
      console.log('[Wait] ✓ ML service is ready!');
      return true;
    } catch (error) {
      retries++;
      if (retries < MAX_RETRIES) {
        console.log(`[Wait] ML service not ready yet (attempt ${retries}/${MAX_RETRIES}), retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  console.warn('[Wait] ⚠ ML service did not become ready after', MAX_RETRIES, 'attempts');
  console.warn('[Wait] Starting AATA anyway (ML predictions will be disabled)');
  return false;
}

// Run the wait function
waitForML().then(() => {
  console.log('[Wait] Starting AATA service...');
  // Start the main application
  require('./dist/index.js');
}).catch((error) => {
  console.error('[Wait] Error:', error.message);
  process.exit(1);
});

