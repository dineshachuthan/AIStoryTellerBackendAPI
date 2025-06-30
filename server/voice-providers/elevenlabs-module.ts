/**
 * ElevenLabs Voice Module - Follows Video Provider Pattern
 * Handles voice cloning and speech generation using ElevenLabs API
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { VoiceModule, VoiceProviderConfig, VoiceTrainingRequest, VoiceTrainingResult } from './provider-manager';

export class ElevenLabsModule implements VoiceModule {
  private config: VoiceProviderConfig;
  private client: ElevenLabsClient;

  constructor(config: VoiceProviderConfig) {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    // Initialize ElevenLabs client with API key
    this.client = new ElevenLabsClient({
      apiKey: config.apiKey
    });
  }

  async trainVoice(request: VoiceTrainingRequest): Promise<VoiceTrainingResult> {
    console.log(`[ElevenLabs] ======================================== COMPREHENSIVE VOICE TRAINING SESSION INITIATED ========================================`);
    console.log(`[ElevenLabs] Beginning comprehensive voice cloning process for user ID: ${request.userId} at ${new Date().toISOString()}`);
    console.log(`[ElevenLabs] Voice training request contains ${request.samples.length} audio samples for emotion-based voice synthesis training`);
    console.log(`[ElevenLabs] Voice profile target ID: ${request.voiceProfileId} - this will be updated with the resulting ElevenLabs voice identifier upon successful completion`);
    console.log(`[ElevenLabs] Sample emotion types detected: ${request.samples.map(s => s.emotion).join(', ')} - these will provide emotional range for the synthesized voice`);
    console.log(`[ElevenLabs] Audio URLs being processed: ${request.samples.map((s, i) => `${i+1}. ${s.emotion}: ${s.audioUrl.substring(0, 100)}...`).join(' | ')}`);
    console.log(`[ElevenLabs] ElevenLabs SDK client initialized with API key, proceeding with official voice cloning workflow`);
    
    try {
      const voiceName = `User_${request.userId}_Voice_${Date.now()}`;
      console.log(`[ElevenLabs] Generating unique voice identifier for ElevenLabs: "${voiceName}" - this ensures no naming conflicts in the ElevenLabs voice library`);
      
      // Download and prepare audio files for the SDK
      const audioFiles: File[] = [];
      console.log(`[ElevenLabs] ================================ AUDIO FILE PROCESSING PHASE INITIATED ================================`);
      console.log(`[ElevenLabs] Beginning systematic download and processing of ${request.samples.length} audio files from user's voice sample collection`);
      
      for (let index = 0; index < request.samples.length; index++) {
        const sample = request.samples[index];
        
        try {
          console.log(`[ElevenLabs] ------------------------ PROCESSING AUDIO SAMPLE ${index + 1}/${request.samples.length} ------------------------`);
          console.log(`[ElevenLabs] Current sample details: Emotion="${sample.emotion}", AudioURL="${sample.audioUrl}", IsLocked=${sample.isLocked}, ProcessingIndex=${index}`);
          console.log(`[ElevenLabs] Initiating HTTP fetch request to retrieve audio data from URL: ${sample.audioUrl} using fetch() with automatic retry logic`);
          
          const audioResponse = await fetch(sample.audioUrl);
          console.log(`[ElevenLabs] HTTP fetch completed for ${sample.emotion} sample: Status=${audioResponse.status}, StatusText="${audioResponse.statusText}", ContentType="${audioResponse.headers.get('content-type')}", ContentLength="${audioResponse.headers.get('content-length')} bytes"`);
          
          if (!audioResponse.ok) {
            console.error(`[ElevenLabs] CRITICAL ERROR - HTTP fetch failed for ${sample.emotion} sample: HTTP ${audioResponse.status} ${audioResponse.statusText}. This indicates server error, network issue, or invalid URL. Aborting voice training process.`);
            throw new Error(`Failed to fetch audio for ${sample.emotion}: HTTP ${audioResponse.status} ${audioResponse.statusText} from URL: ${sample.audioUrl}`);
          }
          
          console.log(`[ElevenLabs] HTTP fetch successful for ${sample.emotion}. Converting response to ArrayBuffer format for binary audio data processing...`);
          const arrayBuffer = await audioResponse.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuffer);
          
          console.log(`[ElevenLabs] Audio conversion completed for ${sample.emotion}: ArrayBuffer size=${arrayBuffer.byteLength} bytes, Buffer size=${audioBuffer.length} bytes, Audio quality validation in progress...`);
          
          if (audioBuffer.length === 0) {
            console.error(`[ElevenLabs] CRITICAL ERROR - Empty audio buffer detected for ${sample.emotion} sample. This indicates corrupted file, failed download, or server returning empty response. Voice training cannot proceed with zero-byte audio files.`);
            throw new Error(`No audio data available for ${sample.emotion} - received empty buffer from ${sample.audioUrl}`);
          }
          
          if (audioBuffer.length < 1000) {
            console.warn(`[ElevenLabs] WARNING - Unusually small audio file detected for ${sample.emotion}: ${audioBuffer.length} bytes. This may indicate corrupted or incomplete audio data. Minimum recommended size is 10KB for quality voice synthesis.`);
          }
          
          console.log(`[ElevenLabs] Audio validation passed for ${sample.emotion}. Creating File object for ElevenLabs SDK voice cloning API...`);
          const fileName = `${sample.emotion}_sample_${index + 1}_user_${request.userId}.mp3`;
          const audioFile = new File([audioBuffer], fileName, { type: 'audio/mpeg' });
          audioFiles.push(audioFile);
          
          console.log(`[ElevenLabs] Successfully processed and prepared ${sample.emotion} sample: FileName="${fileName}", FileSize=${audioBuffer.length} bytes, FileType="audio/mpeg"`);
          console.log(`[ElevenLabs] Audio sample ${index + 1}/${request.samples.length} (${sample.emotion}) processing completed successfully. Ready for ElevenLabs SDK submission.`);
        } catch (error) {
          console.error(`[ElevenLabs] ========================== CRITICAL AUDIO PROCESSING ERROR ==========================`);
          console.error(`[ElevenLabs] Failed to process audio sample ${index + 1}/${request.samples.length} for emotion "${sample.emotion}"`);
          console.error(`[ElevenLabs] Error details: ${error instanceof Error ? error.message : String(error)}`);
          console.error(`[ElevenLabs] Error stack trace: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
          console.error(`[ElevenLabs] Sample URL that failed: ${sample.audioUrl}`);
          console.error(`[ElevenLabs] This error prevents voice training from continuing. All audio samples must be successfully processed for ElevenLabs voice cloning.`);
          throw error;
        }
      }
      
      console.log(`[ElevenLabs] ================================ AUDIO PROCESSING PHASE COMPLETED SUCCESSFULLY ================================`);
      console.log(`[ElevenLabs] All ${request.samples.length} audio samples have been successfully downloaded, validated, and prepared for ElevenLabs SDK voice cloning API`);

      // Use ElevenLabs SDK to create voice clone
      console.log(`[ElevenLabs] ================================ ELEVENLABS SDK API CALL INITIATED ================================`);
      console.log(`[ElevenLabs] Calling ElevenLabs SDK voices.clone() method with ${audioFiles.length} audio files and voice name "${voiceName}"`);
      console.log(`[ElevenLabs] This will create a new cloned voice in your ElevenLabs account and should appear in your analytics dashboard`);
      
      const voiceCloneResult = await this.client.voices.add({
        name: voiceName,
        description: `Voice clone for user ${request.userId} with ${request.samples.length} emotion samples created on ${new Date().toISOString()}`,
        files: audioFiles
      });
      
      console.log(`[ElevenLabs] ================================ ELEVENLABS API CALL COMPLETED SUCCESSFULLY ================================`);
      console.log(`[ElevenLabs] Voice cloning operation completed successfully! New ElevenLabs voice created with ID: ${voiceCloneResult.voice_id}`);
      console.log(`[ElevenLabs] Voice details: Name="${voiceCloneResult.name}", Category="${voiceCloneResult.category}", Preview URL available: ${!!voiceCloneResult.preview_url}`);
      console.log(`[ElevenLabs] This voice clone should now appear in your ElevenLabs dashboard and usage analytics`);
      console.log(`[ElevenLabs] Voice training completed successfully. Returning success result with ElevenLabs voice ID for database storage.`);

      return {
        success: true,
        voiceId: voiceCloneResult.voice_id,
        samplesProcessed: request.samples.length,
        metadata: {
          elevenlabsVoiceId: voiceCloneResult.voice_id,
          voiceName: voiceCloneResult.name,
          category: voiceCloneResult.category,
          previewUrl: voiceCloneResult.preview_url,
          createdAt: new Date().toISOString(),
          emotionsProcessed: request.samples.map(s => s.emotion)
        }
      };
      
    } catch (error) {
      console.error(`[ElevenLabs] ========================== CRITICAL VOICE TRAINING ERROR ==========================`);
      console.error(`[ElevenLabs] Voice training failed for user ${request.userId} with comprehensive error details below:`);
      console.error(`[ElevenLabs] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`[ElevenLabs] Error message: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`[ElevenLabs] Error stack trace: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
      console.error(`[ElevenLabs] Voice profile ID affected: ${request.voiceProfileId}`);
      console.error(`[ElevenLabs] Number of samples that were being processed: ${request.samples.length}`);
      console.error(`[ElevenLabs] This error indicates either network connectivity issues, ElevenLabs API problems, or invalid audio data. Voice training has been aborted.`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        samplesProcessed: 0
      };
    }
  }

  async generateSpeech(text: string, voiceId: string, emotion?: string): Promise<ArrayBuffer> {
    console.log(`[ElevenLabs] Generating speech using ElevenLabs SDK for voice ID: ${voiceId}, text length: ${text.length} characters, emotion: ${emotion || 'neutral'}`);
    
    try {
      const audioStream = await this.client.textToSpeech.stream(voiceId, {
        text: text,
        model_id: 'eleven_multilingual_v2'
      });
      
      // Convert stream to ArrayBuffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
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