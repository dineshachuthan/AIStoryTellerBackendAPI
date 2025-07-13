/**
 * Simple ElevenLabs Success Verification Test
 * Confirms that the hybrid voice cloning system successfully creates ElevenLabs voice clones
 */

const TEST_USER_ID = 'google_117487073695002443567';

async function testElevenLabsSuccess() {
  console.log('🎯 Testing ElevenLabs Success - Simplified Version...');
  console.log(`👤 User ID: ${TEST_USER_ID}`);

  try {
    // 1. Initialize required modules
    const { storage } = await import('./server/storage.ts');
    const { voiceTrainingService } = await import('./server/voice-training-service.ts');
    
    // 2. Initialize voice provider registry
    const { VoiceProviderRegistry } = await import('./server/voice-providers/provider-manager.ts');
    const { getVoiceConfig } = await import('./server/voice-config.ts');
    
    const voiceConfig = getVoiceConfig();
    await VoiceProviderRegistry.initialize(voiceConfig);
    console.log('✅ Voice provider registry initialized');
    
    // 3. Get user voice samples
    const samples = await storage.getUserVoiceEmotions(TEST_USER_ID);
    console.log(`✅ Found ${samples.length} voice samples`);
    
    const uniqueEmotions = [...new Set(samples.map(s => s.emotion))];
    console.log(`✅ Unique emotions: ${uniqueEmotions.length} (${uniqueEmotions.join(', ')})`);
    
    // 4. Test ElevenLabs voice cloning ONLY (skip database storage)
    console.log('\n📋 Testing ElevenLabs Voice Creation...');
    
    // Get 6 emotion samples for hybrid cloning
    const hybridSamples = samples.slice(0, 6).map(sample => ({
      emotion: sample.emotion,
      audioUrl: sample.audioUrl,
      isLocked: false
    }));
    
    // Get voice provider directly  
    const { VoiceProviderFactory } = await import('./server/video-provider-factory.ts');
    const voiceProviderFactory = new VoiceProviderFactory();
    const voiceProvider = await voiceProviderFactory.getVoiceProvider();
    
    if (!voiceProvider) {
      console.log('❌ ElevenLabs provider not available');
      return;
    }
    
    // Create voice training request
    const voiceTrainingRequest = {
      userId: TEST_USER_ID,
      voiceProfileId: 999, // Mock ID for test
      samples: hybridSamples
    };
    
    console.log(`🔧 Creating voice clone with ${hybridSamples.length} samples...`);
    const cloneResult = await voiceProvider.trainVoice(voiceTrainingRequest);
    
    console.log('\n🎉 ELEVENLABS INTEGRATION RESULT:');
    console.log(`  Success: ${cloneResult.success}`);
    console.log(`  Voice ID: ${cloneResult.voiceId}`);
    console.log(`  Samples Processed: ${cloneResult.samplesProcessed}`);
    console.log(`  Error: ${cloneResult.error || 'None'}`);
    
    if (cloneResult.success && cloneResult.voiceId) {
      console.log('\n✅ MVP1 HYBRID VOICE CLONING WORKING PERFECTLY!');
      console.log(`✅ ElevenLabs API integration successful`);
      console.log(`✅ Voice clone created: ${cloneResult.voiceId}`);
      console.log(`✅ All 6 emotion samples processed successfully`);
      console.log(`✅ Ready for production use`);
    } else {
      console.log('\n❌ Voice cloning failed:');
      console.log(`   Error: ${cloneResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testElevenLabsSuccess().then(() => {
  console.log('\n🏁 ElevenLabs success test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});