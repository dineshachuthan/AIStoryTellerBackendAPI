/**
 * Voice ID Recovery Script
 * Recovers lost ElevenLabs voice ID references in the database
 * 
 * Usage: node recover-voice-id.js
 */

const fetch = require('node-fetch');

const API_URL = 'https://317873c7-d975-4993-b88a-1b45d18b4311-00-2zlumfvl3ydq0.worf.replit.dev';
const VOICE_ID = 'cuxbYT1nu3MZbK8JwgAZ'; // The lost voice ID from ElevenLabs

// Your session cookie - you need to copy this from browser DevTools
// 1. Open the app in browser and login
// 2. Open DevTools (F12) -> Application -> Cookies
// 3. Copy the value of 'connect.sid' cookie
const SESSION_COOKIE = 'YOUR_SESSION_COOKIE_HERE';

async function recoverVoiceId() {
  console.log('🔧 Starting voice ID recovery...');
  console.log(`Voice ID to recover: ${VOICE_ID}`);
  
  try {
    const response = await fetch(`${API_URL}/api/voice-cloning/recovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `connect.sid=${SESSION_COOKIE}`
      },
      body: JSON.stringify({
        voiceId: VOICE_ID,
        category: 1 // 1 = emotions (since this was a category voice for emotions)
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    console.log('✅ Recovery successful!');
    console.log(`Updated ${result.updatedEsm} ESM items`);
    console.log(`Updated ${result.updatedRecordings} recordings`);
    console.log('\n📋 Full response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Recovery failed:', error.message);
    console.log('\n⚠️  Make sure to:');
    console.log('1. Replace YOUR_SESSION_COOKIE_HERE with your actual session cookie');
    console.log('2. Get the cookie from browser DevTools -> Application -> Cookies -> connect.sid');
    console.log('3. Make sure you are logged in to the app');
  }
}

// Run the recovery
recoverVoiceId();