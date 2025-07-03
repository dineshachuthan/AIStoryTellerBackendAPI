import { ExternalIntegrationStateReset } from './server/external-integration-state-reset.ts';

async function resetElevenLabsState() {
  console.log('🔄 Resetting ElevenLabs voice training state...');
  
  try {
    await ExternalIntegrationStateReset.resetIntegrationState({
      userId: 'google_117487073695002443567',
      provider: 'elevenlabs',
      operationType: 'voice_training',
      error: 'Manual reset after CommonJS/ES module fixes'
    });
    console.log('✅ ElevenLabs state reset completed');
  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
}

resetElevenLabsState();