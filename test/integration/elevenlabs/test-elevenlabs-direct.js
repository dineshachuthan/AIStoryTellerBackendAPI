/**
 * Direct ElevenLabs Voice Cloning Test
 * Tests the complete voice cloning workflow with real user data
 */

import { voiceTrainingService } from './server/voice-training-service.ts';
import { storage } from './server/storage.ts';

async function testDirectVoiceCloning() {
    console.log('🚀 Starting direct ElevenLabs voice cloning test...\n');
    
    try {
        // Initialize voice provider directly
        console.log('🔧 Setting up ElevenLabs integration...');
        process.env.NODE_ENV = 'development';
        console.log('✅ Environment configured for testing\n');
        
        // Real user with voice samples
        const userId = 'google_117487073695002443567';
        const category = 'emotions';
        
        console.log(`👤 Testing with user: ${userId}`);
        console.log(`📂 Category: ${category}\n`);
        
        // Get voice samples for this user
        const samples = await storage.getUserVoiceSamples(userId);
        console.log(`🎵 Found ${samples.length} voice samples for user`);
        
        // Filter for emotions category
        const emotionSamples = samples.filter(s => s.label.startsWith('emotions-'));
        console.log(`😊 Found ${emotionSamples.length} emotion samples:`);
        emotionSamples.forEach(sample => {
            console.log(`   - ${sample.label} (${sample.audio_url})`);
        });
        
        if (emotionSamples.length === 0) {
            console.log('❌ No emotion samples found. Cannot proceed with voice cloning.');
            return;
        }
        
        console.log('\n🔄 Starting voice training...');
        
        // Trigger voice training
        const result = await voiceTrainingService.triggerHybridEmotionCloning(userId);
        
        console.log('\n✅ Voice training completed successfully!');
        console.log('📊 Result:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('\n❌ Voice cloning failed:', error.message);
        console.error('🔍 Full error:', error);
    }
}

// Run the test
testDirectVoiceCloning().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});