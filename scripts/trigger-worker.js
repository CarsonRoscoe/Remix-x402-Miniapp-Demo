#!/usr/bin/env node

/**
 * Simple script to trigger the worker locally
 * Run with: node scripts/trigger-worker.js
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/worker',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('🚀 Triggering worker at http://localhost:3000/api/worker...');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('✅ Worker Response:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log(`📊 Summary: Processed ${result.processed}, Errors: ${result.errors}, Total: ${result.total}`);
      } else {
        console.log('❌ Worker failed:', result.error);
      }
    } catch (error) {
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Failed to call worker:', error.message);
  console.log('💡 Make sure your dev server is running: npm run dev');
});

req.end(); 