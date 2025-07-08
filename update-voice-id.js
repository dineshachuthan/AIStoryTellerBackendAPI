/**
 * Update Voice ID Script
 * Updates the database to use the new ElevenLabs voice ID
 */

import fetch from 'node-fetch';
import fs from 'fs';

const API_URL = 'http://localhost:5000';
const NEW_VOICE_ID = 'DxImkEWVLjduPUXscsyj'; // The new voice ID we just created

// Read cookie from cookies.txt file
let SESSION_COOKIE = '';

try {
  const cookieContent = fs.readFileSync('cookies.txt', 'utf8');
  // Extract connect.sid value
  const match = cookieContent.match(/connect\.sid=([^;]+)/);
  if (match) {
    SESSION_COOKIE = match[1];
    console.log('✅ Found session cookie from cookies.txt');
  }
} catch (error) {
  console.log('⚠️  Could not read cookies.txt:', error.message);
}

async function updateVoiceId() {
  console.log('🔧 Updating voice ID to new ElevenLabs voice...');
  console.log(`New Voice ID: ${NEW_VOICE_ID}`);
  
  try {
    const response = await fetch(`${API_URL}/api/voice-cloning/recovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `connect.sid=${SESSION_COOKIE}`
      },
      body: JSON.stringify({
        voiceId: NEW_VOICE_ID,
        category: 1 // 1 = emotions (since this was a category voice for emotions)
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    console.log('✅ Update successful!');
    console.log(`Updated ${result.updatedEsm} ESM items`);
    console.log(`Updated ${result.updatedRecordings} recordings`);
    console.log('\n📋 Database now uses the new voice ID for narration');
    console.log('You can now generate story narrations with your new ElevenLabs voice!');
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    console.log('\n⚠️  If authentication failed:');
    console.log('1. Make sure you are logged in to the app');
    console.log('2. Update cookies.txt with fresh session cookie');
  }
}

// Run the update
updateVoiceId();