#!/usr/bin/env node

/**
 * Development worker script - runs every 30 seconds locally
 * Run with: node scripts/worker-dev.js
 * 
 * This simulates the Vercel cron job for local development
 */

const http = require('http');

function triggerWorker() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/worker',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        const timestamp = new Date().toLocaleTimeString();
        
        if (result.success) {
          console.log(`[${timestamp}] 🔵 Worker: Processed ${result.processed}, Errors: ${result.errors}, Total: ${result.total}`);
        } else {
          console.log(`[${timestamp}] ❌ Worker failed:`, result.error);
        }
      } catch (error) {
        console.log(`[${new Date().toLocaleTimeString()}] 📄 Raw response:`, data);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Worker error:`, error.message);
  });

  req.end();
}

// Run immediately
console.log('🚀 Starting local worker (every 30 seconds)...');
console.log('💡 Press Ctrl+C to stop');
triggerWorker();

// Then run every 30 seconds
const interval = setInterval(triggerWorker, 30000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping worker...');
  clearInterval(interval);
  process.exit(0);
}); 