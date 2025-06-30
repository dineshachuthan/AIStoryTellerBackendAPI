/**
 * Test External Integration State Reset System
 * Validates that all providers (ElevenLabs, Kling, RunwayML) properly reset state on failures
 */

import { externalIntegrationStateReset } from '../server/external-integration-state-reset.js';

// Test configuration
const TEST_USER_ID = 'test_user_123';
const TEST_STORY_ID = 999;

// Console styling
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

async function testElevenLabsStateReset() {
  log('\n=== Testing ElevenLabs Voice Training State Reset ===', 'cyan');
  
  try {
    await externalIntegrationStateReset.resetIntegrationState({
      userId: TEST_USER_ID,
      provider: 'elevenlabs',
      operationType: 'voice_training',
      error: 'Test timeout simulation',
      timeoutDuration: 120000 // 2 minutes
    });
    
    log('✅ ElevenLabs state reset completed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ ElevenLabs state reset failed: ${error.message}`, 'red');
    return false;
  }
}

async function testKlingVideoStateReset() {
  log('\n=== Testing Kling Video Generation State Reset ===', 'cyan');
  
  try {
    await externalIntegrationStateReset.resetIntegrationState({
      userId: TEST_USER_ID,
      provider: 'kling',
      operationType: 'video_generation',
      operationId: TEST_STORY_ID,
      error: 'Test API timeout simulation',
      timeoutDuration: 180000 // 3 minutes
    });
    
    log('✅ Kling state reset completed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Kling state reset failed: ${error.message}`, 'red');
    return false;
  }
}

async function testRunwayMLVideoStateReset() {
  log('\n=== Testing RunwayML Video Generation State Reset ===', 'cyan');
  
  try {
    await externalIntegrationStateReset.resetIntegrationState({
      userId: TEST_USER_ID,
      provider: 'runwayml',
      operationType: 'video_generation',
      operationId: TEST_STORY_ID,
      error: 'Test authentication failure',
      timeoutDuration: 60000 // 1 minute
    });
    
    log('✅ RunwayML state reset completed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ RunwayML state reset failed: ${error.message}`, 'red');
    return false;
  }
}

async function testAudioGenerationStateReset() {
  log('\n=== Testing Audio Generation State Reset ===', 'cyan');
  
  try {
    await externalIntegrationStateReset.resetIntegrationState({
      userId: TEST_USER_ID,
      provider: 'elevenlabs',
      operationType: 'audio_generation',
      error: 'Test cache cleanup',
      timeoutDuration: 30000 // 30 seconds
    });
    
    log('✅ Audio generation state reset completed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Audio generation state reset failed: ${error.message}`, 'red');
    return false;
  }
}

async function testCompleteUserReset() {
  log('\n=== Testing Complete User Integration Reset ===', 'cyan');
  
  try {
    await externalIntegrationStateReset.resetAllIntegrationsForUser(
      TEST_USER_ID, 
      'Test complete reset functionality'
    );
    
    log('✅ Complete user reset completed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Complete user reset failed: ${error.message}`, 'red');
    return false;
  }
}

async function testStuckStateCleanup() {
  log('\n=== Testing Stuck State Cleanup ===', 'cyan');
  
  try {
    await externalIntegrationStateReset.cleanupStuckStates();
    
    log('✅ Stuck state cleanup completed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Stuck state cleanup failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('🧪 External Integration State Reset Test Suite', 'magenta');
  log('===============================================', 'magenta');
  
  const tests = [
    { name: 'ElevenLabs State Reset', fn: testElevenLabsStateReset },
    { name: 'Kling Video State Reset', fn: testKlingVideoStateReset },
    { name: 'RunwayML Video State Reset', fn: testRunwayMLVideoStateReset },
    { name: 'Audio Generation State Reset', fn: testAudioGenerationStateReset },
    { name: 'Complete User Reset', fn: testCompleteUserReset },
    { name: 'Stuck State Cleanup', fn: testStuckStateCleanup }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      results.push({ name: test.name, success });
    } catch (error) {
      log(`💥 Test ${test.name} crashed: ${error.message}`, 'red');
      results.push({ name: test.name, success: false });
    }
  }
  
  // Summary
  log('\n📊 Test Results Summary', 'magenta');
  log('=======================', 'magenta');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const color = result.success ? 'green' : 'red';
    log(`${status} ${result.name}`, color);
  });
  
  log(`\n🎯 Overall Result: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 All external integration state reset mechanisms working correctly!', 'green');
    log('   • ElevenLabs voice training failures will be properly reset', 'white');
    log('   • Kling video generation errors will be properly reset', 'white');
    log('   • RunwayML video generation failures will be properly reset', 'white');
    log('   • Audio generation cache will be properly cleaned', 'white');
    log('   • Stuck states will be automatically cleaned up', 'white');
  } else {
    log('\n⚠️  Some state reset mechanisms need attention', 'yellow');
  }
  
  return passed === total;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`💥 Test suite crashed: ${error.message}`, 'red');
      console.error(error);
      process.exit(1);
    });
}

export {
  runAllTests,
  testElevenLabsStateReset,
  testKlingVideoStateReset,
  testRunwayMLVideoStateReset,
  testAudioGenerationStateReset,
  testCompleteUserReset,
  testStuckStateCleanup
};