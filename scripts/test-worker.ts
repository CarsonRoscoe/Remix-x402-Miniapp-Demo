#!/usr/bin/env tsx

/**
 * Test script to manually trigger the worker
 * Run with: npx tsx scripts/test-worker.ts
 */

async function testWorker() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  console.log('🧪 Testing worker at:', `${baseUrl}/api/worker`);
  
  try {
    const response = await fetch(`${baseUrl}/api/worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    console.log('✅ Worker response:', result);
    
    if (result.success) {
      console.log(`📊 Processed: ${result.processed}, Errors: ${result.errors}, Total: ${result.total}`);
    } else {
      console.error('❌ Worker failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Failed to call worker:', error);
  }
}

testWorker(); 