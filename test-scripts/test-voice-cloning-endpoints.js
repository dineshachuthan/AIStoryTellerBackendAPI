/**
 * Comprehensive Voice Cloning REST API Endpoint Tests
 * Tests all new voice cloning endpoints with real data
 */

const BASE_URL = 'http://localhost:5000';
const TEST_USER_ID = 'google_117487073695002443567';
const TEST_STORY_ID = 75;

// Test configuration
const TEST_CONFIG = {
  emotions: ['Frustration', 'Surprise', 'Hope', 'Relief'],
  sounds: ['dog barking', 'rain falling', 'footsteps'],
  modulations: ['mysterious', 'confident', 'nostalgic']
};

let testResults = [];
let authCookie = '';

function logTest(testName, passed, details = '') {
  const result = { testName, passed, details, timestamp: new Date().toISOString() };
  testResults.push(result);
  console.log(`${passed ? '✅' : '❌'} ${testName}`);
  if (details) console.log(`   ${details}`);
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie,
        ...options.headers
      }
    });
    
    const data = await response.json();
    return { response, data, status: response.status };
  } catch (error) {
    return { error: error.message, status: 500 };
  }
}

async function authenticateUser() {
  console.log('\n🔐 Authenticating user...');
  const { response, data, status } = await makeRequest('/api/auth/user');
  
  if (status === 200 && data.id === TEST_USER_ID) {
    // Extract cookies from response
    const cookies = response.headers.get('set-cookie');
    if (cookies) authCookie = cookies;
    logTest('User Authentication', true, `Authenticated as ${data.email}`);
    return true;
  } else {
    logTest('User Authentication', false, `Failed with status ${status}`);
    return false;
  }
}

async function testVoiceCloningSessionStatus() {
  console.log('\n📊 Testing Voice Cloning Session Status Endpoint...');
  
  const { data, status } = await makeRequest('/api/voice-cloning/session-status');
  
  if (status === 200) {
    logTest('Session Status Endpoint', true, `Session data: ${JSON.stringify(data.sessionData)}`);
    
    // Verify session data structure
    const hasRequiredFields = data.sessionData && 
      typeof data.sessionData.emotions === 'number' &&
      typeof data.sessionData.sounds === 'number' &&
      typeof data.sessionData.modulations === 'number' &&
      typeof data.sessionData.isAnyCloning === 'boolean';
    
    logTest('Session Data Structure', hasRequiredFields, 
      `emotions: ${data.sessionData?.emotions}, sounds: ${data.sessionData?.sounds}, modulations: ${data.sessionData?.modulations}`);
  } else {
    logTest('Session Status Endpoint', false, `Failed with status ${status}: ${JSON.stringify(data)}`);
  }
}

async function testVoiceCloningStatus() {
  console.log('\n🎯 Testing Voice Cloning Status Endpoint...');
  
  const { data, status } = await makeRequest('/api/voice-cloning/status');
  
  if (status === 200) {
    logTest('Voice Cloning Status Endpoint', true, `Found ${data.length} voice clones`);
    
    // Test data structure
    if (data.length > 0) {
      const clone = data[0];
      const hasRequiredFields = clone.voiceName && clone.voiceType && clone.trainingStatus;
      logTest('Voice Clone Data Structure', hasRequiredFields, 
        `First clone: ${clone.voiceName} (${clone.voiceType}) - ${clone.trainingStatus}`);
    }
  } else {
    logTest('Voice Cloning Status Endpoint', false, `Failed with status ${status}: ${JSON.stringify(data)}`);
  }
}

async function testStoryVoiceRequirements() {
  console.log('\n📚 Testing Story Voice Requirements Endpoint...');
  
  const { data, status } = await makeRequest(`/api/stories/${TEST_STORY_ID}/voice-requirements`);
  
  if (status === 200) {
    logTest('Story Voice Requirements Endpoint', true, `Found ${data.length} voice requirements`);
    
    // Test data structure
    if (data.length > 0) {
      const requirement = data[0];
      const hasRequiredFields = requirement.voiceName && requirement.voiceType && 
        typeof requirement.isRequired === 'boolean';
      logTest('Voice Requirement Data Structure', hasRequiredFields, 
        `First requirement: ${requirement.voiceName} (${requirement.voiceType})`);
    }
  } else {
    logTest('Story Voice Requirements Endpoint', false, `Failed with status ${status}: ${JSON.stringify(data)}`);
  }
}

async function testManualVoiceCloning() {
  console.log('\n🔧 Testing Manual Voice Cloning Endpoint...');
  
  // Test with each emotion from the test story
  for (const emotion of TEST_CONFIG.emotions) {
    const payload = {
      storyId: TEST_STORY_ID,
      voiceName: emotion,
      voiceType: 'emotion',
      intensity: 8,
      context: `Story emotion: ${emotion}`,
      quote: `Sample quote for ${emotion}`
    };
    
    const { data, status } = await makeRequest('/api/voice-cloning/manual-clone', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    if (status === 200 || status === 201) {
      logTest(`Manual Clone - ${emotion}`, true, `Response: ${JSON.stringify(data)}`);
    } else {
      logTest(`Manual Clone - ${emotion}`, false, `Failed with status ${status}: ${JSON.stringify(data)}`);
    }
    
    // Wait between requests to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function testStoryVoiceRequirementCreation() {
  console.log('\n📝 Testing Voice Requirement Creation...');
  
  // Test creating voice requirements for sounds
  for (const sound of TEST_CONFIG.sounds) {
    const payload = {
      storyId: TEST_STORY_ID,
      voiceName: sound,
      voiceType: 'sound',
      isRequired: true,
      isRecorded: false
    };
    
    const { data, status } = await makeRequest('/api/voice-cloning/requirements', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    if (status === 200 || status === 201) {
      logTest(`Create Requirement - ${sound}`, true, `Created requirement for ${sound}`);
    } else {
      logTest(`Create Requirement - ${sound}`, false, `Failed with status ${status}: ${JSON.stringify(data)}`);
    }
  }
}

async function testVoiceCloneProgress() {
  console.log('\n📈 Testing Voice Clone Progress Tracking...');
  
  // Test progress endpoint
  const { data, status } = await makeRequest(`/api/voice-cloning/progress/${TEST_USER_ID}`);
  
  if (status === 200) {
    logTest('Voice Clone Progress Endpoint', true, `Progress data: ${JSON.stringify(data)}`);
    
    // Verify progress data structure
    const hasProgressFields = data.totalRequired !== undefined && 
      data.totalCompleted !== undefined && 
      data.progressPercentage !== undefined;
    
    logTest('Progress Data Structure', hasProgressFields, 
      `${data.totalCompleted}/${data.totalRequired} (${data.progressPercentage}%)`);
  } else {
    logTest('Voice Clone Progress Endpoint', false, `Failed with status ${status}: ${JSON.stringify(data)}`);
  }
}

async function testVoiceProviderHealth() {
  console.log('\n🏥 Testing Voice Provider Health Checks...');
  
  const providers = ['elevenlabs', 'kling-voice'];
  
  for (const provider of providers) {
    const { data, status } = await makeRequest(`/api/voice-providers/${provider}/health`);
    
    if (status === 200) {
      logTest(`${provider} Health Check`, true, `Status: ${data.status}`);
    } else {
      logTest(`${provider} Health Check`, false, `Failed with status ${status}`);
    }
  }
}

async function testErrorHandling() {
  console.log('\n⚠️ Testing Error Handling...');
  
  // Test invalid story ID
  const { data: invalidStoryData, status: invalidStoryStatus } = await makeRequest('/api/stories/99999/voice-requirements');
  logTest('Invalid Story ID Handling', invalidStoryStatus === 404 || invalidStoryStatus === 400, 
    `Status: ${invalidStoryStatus}, Message: ${invalidStoryData?.message}`);
  
  // Test invalid voice cloning request
  const invalidPayload = {
    storyId: TEST_STORY_ID,
    voiceName: '', // Empty voice name
    voiceType: 'invalid_type',
    intensity: 15 // Invalid intensity
  };
  
  const { data: invalidCloneData, status: invalidCloneStatus } = await makeRequest('/api/voice-cloning/manual-clone', {
    method: 'POST',
    body: JSON.stringify(invalidPayload)
  });
  
  logTest('Invalid Clone Request Handling', invalidCloneStatus >= 400, 
    `Status: ${invalidCloneStatus}, Message: ${invalidCloneData?.message}`);
}

async function testEndpointSecurity() {
  console.log('\n🔒 Testing Endpoint Security...');
  
  // Test without authentication
  const tempCookie = authCookie;
  authCookie = ''; // Remove auth
  
  const { status: unauthStatus } = await makeRequest('/api/voice-cloning/status');
  logTest('Unauthenticated Access Protection', unauthStatus === 401, 
    `Unauthenticated request returned status: ${unauthStatus}`);
  
  authCookie = tempCookie; // Restore auth
}

async function runAllTests() {
  console.log('🚀 Starting Voice Cloning REST API Tests...\n');
  
  try {
    // Authentication
    const authenticated = await authenticateUser();
    if (!authenticated) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }
    
    // Core functionality tests
    await testVoiceCloningSessionStatus();
    await testVoiceCloningStatus();
    await testStoryVoiceRequirements();
    await testStoryVoiceRequirementCreation();
    await testManualVoiceCloning();
    await testVoiceCloneProgress();
    
    // Provider and health tests
    await testVoiceProviderHealth();
    
    // Security and error handling
    await testErrorHandling();
    await testEndpointSecurity();
    
  } catch (error) {
    console.error('Test execution failed:', error);
  }
  
  // Print summary
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  
  console.log(`\n📊 Test Summary: ${passed}/${total} tests passed`);
  
  if (passed < total) {
    console.log('\n❌ Failed Tests:');
    testResults.filter(r => !r.passed).forEach(test => {
      console.log(`  - ${test.testName}: ${test.details}`);
    });
  }
  
  console.log('\n✅ Voice Cloning API Testing Complete');
}

// Run tests
runAllTests().catch(console.error);