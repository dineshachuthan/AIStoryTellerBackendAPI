#!/usr/bin/env node

/**
 * Quick ElevenLabs SDK Structure Test
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

async function testSDKStructure() {
  try {
    console.log('🔍 Testing ElevenLabs SDK structure...');
    
    if (!process.env.ELEVENLABS_API_KEY) {
      console.log('❌ ELEVENLABS_API_KEY not found');
      return;
    }
    
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });
    
    console.log('✅ ElevenLabs client created');
    console.log('📋 Client methods:', Object.getOwnPropertyNames(client));
    console.log('📋 Voices object:', client.voices ? Object.getOwnPropertyNames(client.voices) : 'voices not found');
    
    // Test actual API call
    try {
      const voices = await client.voices.getAll();
      console.log('✅ API call successful - found', voices?.voices?.length || 0, 'voices');
      
      // Try to find voice cloning method
      if (client.voices) {
        console.log('📋 Voice methods:', Object.getOwnPropertyNames(client.voices));
        
        // Check for common voice cloning method names
        const possibleMethods = ['add', 'create', 'clone', 'createVoice', 'addVoice'];
        for (const method of possibleMethods) {
          if (typeof client.voices[method] === 'function') {
            console.log(`✅ Found voice method: ${method}`);
          }
        }
      }
      
    } catch (apiError) {
      console.log('❌ API call failed:', apiError.message);
    }
    
  } catch (error) {
    console.log('💥 SDK test failed:', error.message);
    console.log(error.stack);
  }
}

testSDKStructure();