#!/usr/bin/env node

/**
 * Hybrid Voice Cloning Test - MVP1 Implementation
 * Tests the complete hybrid workflow with your existing voice samples
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_USER_ID = 'google_117487073695002443567'; // Your actual user ID

async function testHybridCloning() {
  console.log('🎯 Testing MVP1 Hybrid Voice Cloning...');
  console.log(`👤 User ID: ${TEST_USER_ID}`);
  
  try {
    // 1. Check existing voice samples
    console.log('\n📋 Step 1: Checking existing voice samples...');
    const { storage } = await import('./server/storage.ts');
    const { VoiceModulationService } = await import('./server/voice-modulation-service.ts');
    
    const voiceModService = new VoiceModulationService();
    const voiceSamples = await voiceModService.getUserVoiceModulations(TEST_USER_ID);
    console.log(`✅ Found ${voiceSamples.length} voice samples`);
    
    // Count unique emotions
    const uniqueEmotions = new Set(voiceSamples.map(sample => sample.modulationKey));
    console.log(`✅ Unique emotions: ${uniqueEmotions.size} (${Array.from(uniqueEmotions).join(', ')})`);
    
    if (uniqueEmotions.size < 6) {
      console.log('❌ Not enough unique emotions for hybrid cloning (need 6, have ' + uniqueEmotions.size + ')');
      return;
    }
    
    // 2. Test hybrid threshold detection
    console.log('\n📋 Step 2: Testing hybrid threshold detection...');
    const { VoiceTrainingService } = await import('./server/voice-training-service.ts');
    
    const voiceTrainingService = new VoiceTrainingService();
    const shouldTrigger = await voiceTrainingService.shouldTriggerTraining(TEST_USER_ID);
    console.log(`✅ Should trigger training: ${shouldTrigger}`);
    
    if (!shouldTrigger) {
      console.log('❌ Training threshold not met according to service');
      return;
    }
    
    // 3. Test session manager
    console.log('\n📋 Step 3: Testing session manager...');
    const { VoiceCloningSessionManager } = await import('./server/voice-cloning-session-manager.ts');
    
    // Check hybrid emotion cloning trigger  
    const shouldTriggerHybrid = await VoiceCloningSessionManager.shouldTriggerHybridEmotionCloning(TEST_USER_ID);
    console.log(`✅ Should trigger hybrid emotion cloning: ${shouldTriggerHybrid}`);
    
    // Session manager verified - moving to actual cloning test
    
    // 4. Test database state reset
    console.log('\n📋 Step 4: Resetting voice profile state...');
    
    // Reset voice profile to ensure clean test
    const existingProfile = await storage.getUserVoiceProfile(TEST_USER_ID);
    if (existingProfile) {
      await storage.updateUserVoiceProfile(existingProfile.id, {
        trainingStatus: 'idle',
        elevenlabsVoiceId: null,
        elevenLabsVoiceId: null,
        trainingStartedAt: null,
        trainingCompletedAt: null,
        lastTrainingError: null
      });
      console.log('✅ Voice profile state reset');
    } else {
      console.log('⚠️  No existing voice profile found - will be created during cloning');
    }
    
    // 5. Test actual hybrid cloning trigger
    console.log('\n📋 Step 5: Triggering hybrid voice cloning...');
    
    try {
      const hybridResult = await voiceTrainingService.triggerHybridEmotionCloning(TEST_USER_ID);
      console.log('✅ Hybrid cloning completed:');
      console.log('  Success:', hybridResult.success);
      console.log('  Voice ID:', hybridResult.voiceId);
      console.log('  Message:', hybridResult.message);
      
      if (hybridResult.success) {
        console.log('\n🎉 HYBRID VOICE CLONING SUCCESSFUL!');
        console.log('  Emotions processed:', hybridResult.emotionsProcessed);
        console.log('  ElevenLabs Voice ID:', hybridResult.voiceId);
        
        // 6. Verify database updates
        console.log('\n📋 Step 6: Verifying database updates...');
        const profile = await storage.getUserVoiceProfile(TEST_USER_ID);
        console.log('  Profile status:', profile?.trainingStatus);
        console.log('  ElevenLabs ID:', profile?.elevenlabsVoiceId || profile?.elevenLabsVoiceId);
        
      } else {
        console.log('\n❌ HYBRID CLONING FAILED:');
        console.log('  Error:', hybridResult.error);
      }
      
    } catch (error) {
      console.log('\n💥 HYBRID CLONING ERROR:');
      console.log('  Message:', error.message);
      console.log('  Stack:', error.stack);
    }
    
  } catch (error) {
    console.log('\n💥 TEST SETUP ERROR:');
    console.log('  Message:', error.message);
    console.log('  Stack:', error.stack);
  }
}

// Run the test
testHybridCloning().then(() => {
  console.log('\n🏁 Hybrid cloning test completed');
}).catch(error => {
  console.error('\n💥 Test failed:', error);
  process.exit(1);
});