/**
 * ElevenLabs Voice Provider - Uses Abstract Base Class
 * Handles voice cloning and speech generation using ElevenLabs API
 */

// @ts-ignore
import pkg from 'elevenlabs';
// @ts-ignore
const { ElevenLabsClient } = pkg;
import { BaseVoiceProvider } from './base-voice-provider';
import { VoiceProviderConfig, VoiceTrainingRequest, VoiceTrainingResult } from './provider-manager';

export class ElevenLabsModule extends BaseVoiceProvider {
  private client: any;

  constructor(config: VoiceProviderConfig) {
    super(config, 'ElevenLabs');
    
    // Initialize ElevenLabs client with API key
    this.client = new ElevenLabsClient({
      apiKey: config.apiKey
    });
  }

  protected validateConfig(config: VoiceProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    
    if (!config.baseUrl) {
      throw new Error('ElevenLabs base URL is required');
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await super.performHealthCheck();
    
    try {
      // Test API connectivity by listing voices
      await this.client.voices.getAll();
      this.log('info', 'ElevenLabs API connectivity confirmed');
    } catch (error) {
      throw new Error(`ElevenLabs API health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async trainVoice(request: VoiceTrainingRequest): Promise<VoiceTrainingResult> {
    return await this.withTimeout(
      this.withRetry(() => this.performVoiceTraining(request), this.config.retryCount, 'voice training'),
      this.config.timeout,
      'voice training'
    );
  }

  private async performVoiceTraining(request: VoiceTrainingRequest): Promise<VoiceTrainingResult> {
    this.log('info', `Starting voice training for user ${request.userId} with ${request.samples.length} samples`);
    
    try {
      const voiceName = `User_${request.userId}_Voice_${Date.now()}`;
      this.log('info', `Generated voice name: ${voiceName}`);
      
      // Process audio files using base class utilities
      const audioFiles: File[] = [];
      
      for (let index = 0; index < request.samples.length; index++) {
        const sample = request.samples[index];
        
        try {
          this.log('info', `Processing sample ${index + 1}/${request.samples.length}: ${sample.emotion}`);
          
          // Convert relative path to absolute URL for fetch
          const audioUrl = sample.audioUrl.startsWith('http') 
            ? sample.audioUrl 
            : `http://localhost:5000${sample.audioUrl}`;
          
          this.log('info', `Fetching audio from: ${audioUrl}`);
          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio for ${sample.emotion}: HTTP ${audioResponse.status}`);
          }
          
          const arrayBuffer = await audioResponse.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuffer);
          
          // Use base class validation
          const fileName = `${sample.emotion}_sample_${index + 1}.mp3`;
          this.validateAudioFile(audioBuffer, fileName);
          
          const audioFile = new File([audioBuffer], fileName, { type: 'audio/mpeg' });
          audioFiles.push(audioFile);
          
          this.log('info', `Successfully processed ${sample.emotion} sample (${audioBuffer.length} bytes)`);
        } catch (error) {
          this.log('error', `Failed to process sample ${sample.emotion}`, error);
          throw error;
        }
      }
      
      this.log('info', `All ${audioFiles.length} audio files processed. Starting ElevenLabs voice creation...`);
      
      // Create voice using ElevenLabs SDK
      // Note: Using voices.add method which is the correct method for voice cloning
      const voiceResult = await this.client.voices.add({
        name: voiceName,
        description: `Voice clone for user ${request.userId} with ${request.samples.length} emotion samples`,
        files: audioFiles
      });
      
      this.log('info', `Voice created successfully with ID: ${voiceResult.voice_id}`);
      
      return this.createSuccessResult(voiceResult.voice_id, request.samples.length, {
        elevenlabsVoiceId: voiceResult.voice_id,
        voiceName: voiceResult.name,
        category: voiceResult.category,
        emotionsProcessed: request.samples.map(s => s.emotion)
      });
      
    } catch (error) {
      this.log('error', `Voice training failed for user ${request.userId}`, error);
      return this.createErrorResult(error instanceof Error ? error : String(error));
    }
  }

  async generateSpeech(text: string, voiceId: string, emotion?: string): Promise<ArrayBuffer> {
    console.log(`[ElevenLabs] Generating speech using ElevenLabs SDK for voice ID: ${voiceId}, text length: ${text.length} characters, emotion: ${emotion || 'neutral'}`);
    
    try {
      const audioStream = await this.client.textToSpeech.stream(voiceId, {
        text: text,
        modelId: 'eleven_multilingual_v2'
      });
      
      // Convert stream to ArrayBuffer
      const chunks: Uint8Array[] = [];
      const reader = audioStream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      console.log(`[ElevenLabs] Speech generation completed successfully using ElevenLabs SDK. Generated ${result.length} bytes of audio data`);
      return result.buffer;
      
    } catch (error) {
      console.error(`[ElevenLabs] Speech generation failed:`, error);
      throw error;
    }
  }

  async getVoiceStatus(voiceId: string): Promise<{ status: string; ready: boolean }> {
    console.log(`[ElevenLabs] Checking voice status for ElevenLabs voice ID: ${voiceId}`);
    
    try {
      const voice = await this.client.voices.get(voiceId);
      console.log(`[ElevenLabs] Voice status retrieved: ${voice.name}, Category: ${voice.category}`);
      
      return {
        status: 'ready',
        ready: true
      };
    } catch (error) {
      console.error(`[ElevenLabs] Failed to get voice status:`, error);
      return {
        status: 'error',
        ready: false
      };
    }
  }

  private getEmotionSettings(emotion?: string): any {
    // ElevenLabs emotion settings based on emotion type
    const emotionMap: Record<string, any> = {
      happy: { stability: 0.5, similarity_boost: 0.8 },
      sad: { stability: 0.7, similarity_boost: 0.6 },
      angry: { stability: 0.3, similarity_boost: 0.9 },
      calm: { stability: 0.8, similarity_boost: 0.7 },
      excited: { stability: 0.4, similarity_boost: 0.8 }
    };
    
    return emotionMap[emotion || 'neutral'] || { stability: 0.6, similarity_boost: 0.75 };
  }
}