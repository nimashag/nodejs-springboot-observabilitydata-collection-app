// load-test.js - k6 load testing script for realistic alert data collection
// Run with: k6 run load-test.js

import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 10 },   // Ramp up to 10 users over 5 minutes
    { duration: '30m', target: 50 },   // Stay at 50 users for 30 minutes
    { duration: '10m', target: 100 },  // Spike to 100 users for 10 minutes
    { duration: '20m', target: 50 },   // Scale down to 50 users for 20 minutes
    { duration: '10m', target: 20 },   // Scale down to 20 users
    { duration: '5m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests should be below 5s
    http_req_failed: ['rate<0.5'],     // Error rate should be less than 50%
  },
};

const services = [
  { name: 'orders', port: 3002, endpoints: ['/api/orders', '/api/orders/invalid'] },
  { name: 'restaurants', port: 3001, endpoints: ['/api/restaurants', '/api/restaurants/invalid'] },
  { name: 'delivery', port: 3004, endpoints: ['/api/delivery', '/api/delivery/invalid'] },
  { name: 'users', port: 3003, endpoints: ['/api/auth/login', '/api/auth/invalid'] },
];

export default function () {
  // Random service selection
  const service = services[Math.floor(Math.random() * services.length)];
  
  // 70% success, 30% error (realistic error rate)
  const useError = Math.random() < 0.3;
  const endpoint = useError ? service.endpoints[1] : service.endpoints[0];
  
  const url = `http://localhost:${service.port}${endpoint}`;
  
  // 10% chance of slow request (simulate slow processing)
  if (Math.random() < 0.1) {
    sleep(Math.random() * 5); // 0-5 seconds delay
  }
  
  const response = http.get(url, {
    tags: { name: `${service.name}-${useError ? 'error' : 'success'}` },
  });
  
  check(response, {
    'status is 200 or 400': (r) => r.status === 200 || r.status === 400 || r.status === 404,
    'response time < 5000ms': (r) => r.timings.duration < 5000,
  });
  
  // Random sleep between 0.5-2 seconds (realistic user behavior)
  sleep(Math.random() * 1.5 + 0.5);
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;
  const failedRequests = data.metrics.http_req_failed ? 
    (data.metrics.http_req_failed.values.rate * totalRequests) : 0;
  const successRate = data.metrics.http_req_failed ? 
    ((1 - data.metrics.http_req_failed.values.rate) * 100) : 100;
  const avgResponseTime = data.metrics.http_req_duration ? 
    data.metrics.http_req_duration.values.avg : 0;
  const duration = data.state ? (data.state.testRunDurationMs / 1000) : 0;
  
  const summary = `
========================================
  K6 LOAD TEST SUMMARY
========================================
Duration: ${duration}s
Total Requests: ${totalRequests}
Failed Requests: ${Math.round(failedRequests)}
Success Rate: ${successRate.toFixed(2)}%
Avg Response Time: ${avgResponseTime.toFixed(2)}ms
========================================
`;
  
  console.log(summary);
  
  return {
    'stdout': summary,
  };
}

