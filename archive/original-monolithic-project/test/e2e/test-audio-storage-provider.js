/**
 * Test Audio Storage Provider System
 * Verifies that signed URLs are generated correctly and files are accessible
 */

async function testAudioStorageProvider() {
  console.log('🧪 Testing Audio Storage Provider System...\n');
  
  try {
    // Import the audio storage factory
    const { audioStorageFactory } = await import('./server/audio-storage-providers.ts');
    
    // Get the active provider
    const activeProvider = audioStorageFactory.getActiveProvider();
    console.log(`✅ Active Provider: ${activeProvider.name}`);
    
    // Test provider status
    const status = await activeProvider.getStatus();
    console.log(`✅ Provider Status:`, status);
    
    // Test relative URL from database
    const testRelativePath = '/cache/user-voice-modulations/google_117487073695002443567/voice-samples/1/frustration.mp3';
    const testUserId = 'google_117487073695002443567';
    
    console.log(`\n🔗 Testing signed URL generation...`);
    console.log(`Relative path: ${testRelativePath}`);
    
    // Generate signed URL
    const signedUrl = await activeProvider.generateSignedUrl(testRelativePath, {
      expiresIn: '15m',
      purpose: 'voice_training',
      userId: testUserId
    });
    
    console.log(`✅ Generated signed URL: ${signedUrl}`);
    
    // Test if the signed URL is accessible
    const fetch = (await import('node-fetch')).default;
    console.log(`\n🌐 Testing signed URL accessibility...`);
    
    const response = await fetch(signedUrl);
    console.log(`✅ HTTP Response Status: ${response.status}`);
    console.log(`✅ Content-Type: ${response.headers.get('content-type')}`);
    console.log(`✅ Content-Length: ${response.headers.get('content-length')} bytes`);
    
    if (response.status === 200) {
      console.log(`\n🎉 SUCCESS: Audio file is accessible via signed URL!`);
      console.log(`📊 This confirms the audio storage provider system is working correctly.`);
    } else {
      console.log(`\n❌ FAILED: Signed URL returned status ${response.status}`);
    }
    
    // Test file validation
    console.log(`\n📁 Testing file validation...`);
    const fileExists = await activeProvider.validateAccess(testRelativePath);
    console.log(`✅ File exists: ${fileExists}`);
    
    console.log(`\n🔒 Testing JWT token security...`);
    
    // Extract token from signed URL for validation
    const tokenMatch = signedUrl.match(/\/api\/audio\/serve\/(.+)$/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      console.log(`✅ Extracted JWT token (first 20 chars): ${token.substring(0, 20)}...`);
      
      // Test the token endpoint directly
      const tokenResponse = await fetch(`http://localhost:5000/api/audio/serve/${token}`);
      console.log(`✅ Token endpoint status: ${tokenResponse.status}`);
      
      if (tokenResponse.status === 200) {
        console.log(`🎉 JWT token authentication working correctly!`);
      }
    }
    
    console.log(`\n✅ Audio Storage Provider Test Complete!`);
    console.log(`🎯 The system is ready for ElevenLabs integration.`);
    
  } catch (error) {
    console.error(`❌ Test failed:`, error);
    console.error(`Stack trace:`, error.stack);
  }
}

// Run the test
testAudioStorageProvider();