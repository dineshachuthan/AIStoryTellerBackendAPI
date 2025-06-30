/**
 * Voice Cloning Stuck State Diagnostic Script
 * Helps diagnose why voice cloning appears stuck "in progress"
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

function log(message, color = 'white') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch {
      parsedData = data;
    }
    
    return {
      status: response.status,
      data: parsedData
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message
    };
  }
}

async function diagnoseVoiceCloningState() {
  log('\n🔍 Diagnosing Voice Cloning Stuck State', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  // Check public endpoints that don't require auth
  const publicEndpoints = [
    '/api/voice-training/trigger',
    '/api/health',
    '/api/voice/test-cloning'
  ];
  
  log('\n📊 Checking Public Voice Endpoints...', 'yellow');
  for (const endpoint of publicEndpoints) {
    const result = await makeRequest('GET', endpoint);
    log(`${endpoint}: Status ${result.status}`, result.status < 400 ? 'green' : 'red');
    if (result.data && typeof result.data === 'object') {
      log(`  Response: ${JSON.stringify(result.data).slice(0, 100)}...`, 'blue');
    }
  }
  
  // Check voice training trigger specifically
  log('\n🎯 Testing Voice Training Trigger...', 'yellow');
  const triggerResult = await makeRequest('POST', '/api/voice-training/trigger', {
    userId: 'test-user',
    category: 'emotions'
  });
  log(`Trigger Status: ${triggerResult.status}`, triggerResult.status < 400 ? 'green' : 'red');
  if (triggerResult.data) {
    log(`Trigger Response: ${JSON.stringify(triggerResult.data, null, 2)}`, 'blue');
  }
  
  // Check voice cloning progress endpoints
  log('\n📈 Testing Voice Cloning Progress...', 'yellow');
  const progressEndpoints = [
    '/api/voice-cloning/trigger/emotions',
    '/api/voice-cloning/trigger/sounds',
    '/api/voice-cloning/trigger/modulations'
  ];
  
  for (const endpoint of progressEndpoints) {
    const result = await makeRequest('POST', endpoint);
    log(`${endpoint}: Status ${result.status}`, result.status === 401 ? 'green' : 'yellow');
    if (result.data && result.data.message) {
      log(`  Message: ${result.data.message}`, 'blue');
    }
  }
  
  // Test voice provider factory
  log('\n🏭 Testing Voice Provider Factory...', 'yellow');
  const factoryTest = await makeRequest('POST', '/api/voice/test-cloning', {
    provider: 'elevenlabs',
    test: true
  });
  log(`Factory Test Status: ${factoryTest.status}`, factoryTest.status === 401 ? 'green' : 'yellow');
  
  // Check if there are any timeout services running
  log('\n⏱️ Checking for Active Timeout Services...', 'yellow');
  
  // Look for common stuck states
  log('\n🚨 Common Stuck State Indicators:', 'magenta');
  log('1. Session data persisting "cloning in progress" state', 'white');
  log('2. Voice cloning timeout service not properly cleaning up', 'white');
  log('3. ElevenLabs API calls hanging without timeout', 'white');
  log('4. Session memory not being reset after completion/failure', 'white');
  
  log('\n💡 Potential Solutions:', 'green');
  log('1. Check server logs for hanging requests or timeouts', 'white');
  log('2. Clear session data for stuck voice cloning states', 'white');
  log('3. Verify ElevenLabs API timeout mechanisms are working', 'white');
  log('4. Test manual voice cloning trigger with proper authentication', 'white');
  
  log('\n🔧 Next Steps for Testing:', 'cyan');
  log('1. Login to the application and check session state', 'white');
  log('2. Try manually clearing voice cloning session data', 'white');
  log('3. Test voice sample recording with proper timeout handling', 'white');
  log('4. Monitor server logs during voice cloning attempts', 'white');
}

// Run the diagnostic
diagnoseVoiceCloningState().catch(console.error);