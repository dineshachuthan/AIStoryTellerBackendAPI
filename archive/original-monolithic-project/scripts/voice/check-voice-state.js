/**
 * Check and reset voice profile state after ElevenLabs failure
 */

async function checkVoiceState() {
  const { storage } = await import('./server/storage.ts');
  const userId = 'google_117487073695002443567';

  try {
    console.log('Checking voice profile state...');
    const profile = await storage.getUserVoiceProfile(userId);
    console.log('Current profile:', JSON.stringify(profile, null, 2));

    if (profile && profile.elevenLabsStatus === 'training') {
      console.log('🔧 Resetting stuck training state...');
      await storage.updateUserVoiceProfile(userId, {
        elevenLabsStatus: 'failed',
        elevenLabsError: 'Audio file format issue - corrupted audio detected by ElevenLabs',
        lastTrainingAt: new Date()
      });
      console.log('✅ Voice profile state reset to failed');
    } else {
      console.log('ℹ️ Voice profile state is already correct');
    }

    // Also check if External Integration State Reset was called
    const { ExternalIntegrationStateReset } = await import('./server/external-integration-state-reset.ts');
    console.log('🔄 Triggering external integration state reset...');
    await ExternalIntegrationStateReset.resetVoiceProfile(userId, 'ElevenLabs API invalid content error');
    console.log('✅ External integration state reset completed');

  } catch (error) {
    console.error('❌ Error checking voice state:', error.message);
  }
}

checkVoiceState().then(() => {
  console.log('✅ Voice state check completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Voice state check failed:', error);
  process.exit(1);
});