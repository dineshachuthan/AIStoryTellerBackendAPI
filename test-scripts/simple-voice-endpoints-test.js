/**
 * Simple Voice Cloning REST API Endpoint Tests
 * Tests endpoints using curl for better authentication handling
 * Uses shared test data from test-data/voice-cloning-test-data.json
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load shared test data
const testDataPath = path.join(__dirname, '..', 'test-data', 'voice-cloning-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const BASE_URL = 'http://localhost:5000';
const TEST_STORY_ID = testData.testStory.id;
const TEST_USER_ID = testData.testUser.id;

function runCurlTest(endpoint, method = 'GET', data = null) {
  try {
    let curlCommand = `curl -s -X ${method} ${BASE_URL}${endpoint}`;
    
    if (data) {
      curlCommand += ` -H "Content-Type: application/json" -d '${JSON.stringify(data)}'`;
    }
    
    console.log(`Testing: ${method} ${endpoint}`);
    const response = execSync(curlCommand, { encoding: 'utf8' });
    
    try {
      const parsed = JSON.parse(response);
      console.log(`✅ Success: ${JSON.stringify(parsed).substring(0, 100)}...`);
      return { success: true, data: parsed };
    } catch (e) {
      console.log(`✅ Response: ${response.substring(0, 100)}...`);
      return { success: true, data: response };
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function testEndpoints() {
  console.log('🚀 Testing Voice Cloning API Endpoints...\n');
  
  // Test 1: Voice cloning session status (should work without auth if implemented)
  console.log('📊 Testing Session Status Endpoint:');
  runCurlTest('/api/voice-cloning/session-status');
  console.log('');
  
  // Test 2: Voice cloning status
  console.log('🎯 Testing Voice Cloning Status:');
  runCurlTest('/api/voice-cloning/status');
  console.log('');
  
  // Test 3: Story voice requirements
  console.log('📚 Testing Story Voice Requirements:');
  runCurlTest(`/api/stories/${TEST_STORY_ID}/voice-requirements`);
  console.log('');
  
  // Test 4: Voice provider health checks
  console.log('🏥 Testing Voice Provider Health:');
  runCurlTest('/api/voice-providers/elevenlabs/health');
  runCurlTest('/api/voice-providers/kling-voice/health');
  console.log('');
  
  // Test 5: Manual voice cloning (POST test) - using test data
  console.log('🔧 Testing Manual Voice Cloning:');
  testData.voiceCloneTestCases.emotions.forEach((emotion, index) => {
    if (index === 0) { // Test only first emotion to avoid overwhelming
      const cloneData = {
        storyId: TEST_STORY_ID,
        ...emotion
      };
      runCurlTest('/api/voice-cloning/manual-clone', 'POST', cloneData);
    }
  });
  console.log('');
  
  // Test 6: Voice requirement creation (POST test) - using test data
  console.log('📝 Testing Voice Requirement Creation:');
  testData.voiceCloneTestCases.sounds.forEach((sound, index) => {
    if (index === 0) { // Test only first sound
      const requirementData = {
        storyId: TEST_STORY_ID,
        voiceName: sound.voiceName,
        voiceType: sound.voiceType,
        isRequired: true,
        isRecorded: false
      };
      runCurlTest('/api/voice-cloning/requirements', 'POST', requirementData);
    }
  });
  console.log('');
  
  // Test 7: Voice clone progress
  console.log('📈 Testing Voice Clone Progress:');
  runCurlTest(`/api/voice-cloning/progress/${TEST_USER_ID}`);
  console.log('');
  
  // Test 8: Error handling - using test data error cases
  console.log('⚠️ Testing Error Handling:');
  runCurlTest(`/api/stories/${testData.errorTestCases.invalidStoryId}/voice-requirements`);
  
  // Test invalid voice cloning data
  const invalidCloneData = {
    storyId: TEST_STORY_ID,
    ...testData.errorTestCases.invalidVoiceData
  };
  runCurlTest('/api/voice-cloning/manual-clone', 'POST', invalidCloneData);
  console.log('');
  
  console.log('✅ Voice Cloning API Testing Complete');
}

// Run tests
testEndpoints();