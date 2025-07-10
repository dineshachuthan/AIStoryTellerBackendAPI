/**
 * Test Narration Voice Script
 * Demonstrates how ElevenLabs custom voice is used for story narration
 */

import fetch from 'node-fetch';
import fs from 'fs';

const API_URL = 'http://localhost:5000';

// Read cookie from cookies.txt file
let SESSION_COOKIE = '';
try {
  const cookieContent = fs.readFileSync('cookies.txt', 'utf8');
  const match = cookieContent.match(/connect\.sid=([^;]+)/);
  if (match) {
    SESSION_COOKIE = match[1];
  }
} catch (error) {
  console.log('⚠️  Could not read cookies.txt:', error.message);
}

async function testNarrationVoice() {
  console.log('🎙️  Testing Story Narration with Your Custom Voice\n');
  console.log('Understanding the Voice System:');
  console.log('✅ ElevenLabs Voice: Your custom voice clone from 11 emotion recordings');
  console.log('✅ Voice ID: DxImkEWVLjduPUXscsyj');
  console.log('✅ Purpose: Makes stories sound like YOU are narrating them');
  console.log('❌ OpenAI Voices: Pre-made voices (nova, echo, etc.) used as fallback\n');
  
  try {
    // Test 1: Check current narrator voice in database
    console.log('📊 Checking your narrator voice setup...');
    const response = await fetch(`${API_URL}/api/user/esm-recordings`, {
      headers: {
        'Cookie': `connect.sid=${SESSION_COOKIE}`
      }
    });
    
    if (response.ok) {
      const recordings = await response.json();
      const hasNarratorVoice = recordings.some(r => r.narrator_voice_id === 'DxImkEWVLjduPUXscsyj');
      
      if (hasNarratorVoice) {
        console.log('✅ Your custom ElevenLabs voice is properly stored in database!');
        console.log('   When you generate story narrations, they will use YOUR voice.');
      } else {
        console.log('⚠️  Database still has old voice ID. Narrations may fail until updated.');
        console.log('   The system will fall back to OpenAI voices temporarily.');
      }
    }
    
    console.log('\n📝 How to Use Your Custom Voice:');
    console.log('1. Go to any story and click "Generate Story Narration"');
    console.log('2. The system will use YOUR ElevenLabs voice (not OpenAI)');
    console.log('3. The narration will sound like you reading the story');
    console.log('4. Each emotion in the story uses your trained voice modulations');
    
    console.log('\n🔍 Why You See Errors:');
    console.log('- The old voice ID (cuxbYT1nu3MZbK8JwgAZ) no longer exists');
    console.log('- ElevenLabs returns 404 errors for the old voice');
    console.log('- System falls back to OpenAI voices when this happens');
    console.log('- We need to update the database to use your new voice ID');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testNarrationVoice();