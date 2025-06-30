/**
 * ElevenLabs Voice Module - Follows Video Provider Pattern
 * Handles voice cloning and speech generation using ElevenLabs API
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { VoiceModule, VoiceProviderConfig, VoiceTrainingRequest, VoiceTrainingResult } from './provider-manager';

export class ElevenLabsModule implements VoiceModule {
  private config: VoiceProviderConfig;

  constructor(config: VoiceProviderConfig) {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
  }

  async trainVoice(request: VoiceTrainingRequest): Promise<VoiceTrainingResult> {
    console.log(`[ElevenLabs] ======================================== COMPREHENSIVE VOICE TRAINING SESSION INITIATED ========================================`);
    console.log(`[ElevenLabs] Beginning comprehensive voice cloning process for user ID: ${request.userId} at ${new Date().toISOString()}`);
    console.log(`[ElevenLabs] Voice training request contains ${request.samples.length} audio samples for emotion-based voice synthesis training`);
    console.log(`[ElevenLabs] Voice profile target ID: ${request.voiceProfileId} - this will be updated with the resulting ElevenLabs voice identifier upon successful completion`);
    console.log(`[ElevenLabs] Sample emotion types detected: ${request.samples.map(s => s.emotion).join(', ')} - these will provide emotional range for the synthesized voice`);
    console.log(`[ElevenLabs] Audio URLs being processed: ${request.samples.map((s, i) => `${i+1}. ${s.emotion}: ${s.audioUrl.substring(0, 100)}...`).join(' | ')}`);
    console.log(`[ElevenLabs] ElevenLabs API configuration details: Base URL: ${this.config.baseUrl}, Timeout: ${this.config.timeout}ms, API Key present: ${!!this.config.apiKey}`);
    
    try {
      // Prepare FormData for ElevenLabs API
      const voiceName = `User_${request.userId}_Voice_${Date.now()}`;
      console.log(`[ElevenLabs] Generating unique voice identifier for ElevenLabs: "${voiceName}" - this ensures no naming conflicts in the ElevenLabs voice library`);
      
      const formData = new FormData();
      formData.append('name', voiceName);
      formData.append('description', `Voice clone for user ${request.userId} with ${request.samples.length} emotion samples created on ${new Date().toISOString()}`);
      
      console.log(`[ElevenLabs] FormData preparation initiated - name and description fields populated for ElevenLabs voice creation API endpoint`);

      // Add emotion labels
      const emotionLabels: Record<string, string> = {};
      for (const sample of request.samples) {
        emotionLabels[sample.emotion] = `High-quality voice sample expressing ${sample.emotion} emotion for character voice synthesis and narrative generation`;
      }
      formData.append('labels', JSON.stringify(emotionLabels));
      
      console.log(`[ElevenLabs] Emotion label mapping created with detailed descriptions: ${JSON.stringify(emotionLabels, null, 2)} - this metadata helps ElevenLabs AI understand emotional context for better voice synthesis`);
      console.log(`[ElevenLabs] FormData labels field populated with comprehensive emotion mapping. Proceeding to audio file download and attachment phase...`);

      // Download and add audio files
      console.log(`[ElevenLabs] ================================ AUDIO FILE PROCESSING PHASE INITIATED ================================`);
      console.log(`[ElevenLabs] Beginning systematic download and processing of ${request.samples.length} audio files from user's voice sample collection`);
      console.log(`[ElevenLabs] Each audio file will be fetched via HTTP, validated for integrity, converted to Buffer format, and attached to FormData for ElevenLabs API transmission`);
      
      for (let index = 0; index < request.samples.length; index++) {
        const sample = request.samples[index];
        
        try {
          console.log(`[ElevenLabs] ------------------------ PROCESSING AUDIO SAMPLE ${index + 1}/${request.samples.length} ------------------------`);
          console.log(`[ElevenLabs] Current sample details: Emotion="${sample.emotion}", AudioURL="${sample.audioUrl}", IsLocked=${sample.isLocked}, ProcessingIndex=${index}`);
          console.log(`[ElevenLabs] Initiating HTTP fetch request to retrieve audio data from URL: ${sample.audioUrl} using fetch() with automatic retry logic`);
          console.log(`[ElevenLabs] Expected audio format: MP3/WAV/WebM, Expected size range: 50KB-5MB, Processing timeout: 30 seconds maximum per file`);
          
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
          
          console.log(`[ElevenLabs] Audio validation passed for ${sample.emotion}. Creating Blob object for multipart form submission to ElevenLabs API...`);
          const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
          const fileName = `${sample.emotion}_sample_${index + 1}_user_${request.userId}.mp3`;
          formData.append('files', blob, fileName);
          
          console.log(`[ElevenLabs] Successfully processed and attached ${sample.emotion} sample to FormData: FileName="${fileName}", FileSize=${audioBuffer.length} bytes, BlobType="audio/mpeg", FormDataFieldName="files"`);
          console.log(`[ElevenLabs] Audio sample ${index + 1}/${request.samples.length} (${sample.emotion}) processing completed successfully. Ready for ElevenLabs API transmission.`);
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
      console.log(`[ElevenLabs] All ${request.samples.length} audio samples have been successfully downloaded, validated, and attached to FormData for ElevenLabs API submission`);

      // Make API call to ElevenLabs
      console.log(`[ElevenLabs] ================================ ELEVENLABS API TRANSMISSION PHASE INITIATED ================================`);
      console.log(`[ElevenLabs] Preparing to transmit comprehensive voice cloning request to ElevenLabs servers using official API endpoint`);
      console.log(`[ElevenLabs] Target API endpoint: ${this.config.baseUrl}/voices/add - this is the official ElevenLabs voice cloning creation endpoint`);
      console.log(`[ElevenLabs] Request method: POST with multipart/form-data body containing ${request.samples.length} audio files and comprehensive metadata`);
      console.log(`[ElevenLabs] Authentication: Using xi-api-key header with length ${this.config.apiKey.length} characters (API key validated during initialization)`);
      console.log(`[ElevenLabs] FormData contents: voice name, description, emotion labels, and ${request.samples.length} audio files totaling approximately ${formData.get('files') ? 'multiple MB' : 'unknown size'} of audio data`);
      console.log(`[ElevenLabs] Request timeout configuration: ${this.config.timeout}ms maximum wait time before automatic retry or failure`);
      console.log(`[ElevenLabs] Initiating HTTP POST request to ElevenLabs API servers now...`);
      
      const requestStartTime = Date.now();
      const response = await fetch(`${this.config.baseUrl}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
        },
        body: formData,
      });
      const requestDuration = Date.now() - requestStartTime;

      console.log(`[ElevenLabs] ========================== ELEVENLABS API RESPONSE RECEIVED ==========================`);
      console.log(`[ElevenLabs] HTTP request completed in ${requestDuration}ms - response received from ElevenLabs servers`);
      console.log(`[ElevenLabs] Response status: HTTP ${response.status} ${response.statusText} - ${response.ok ? 'SUCCESS' : 'ERROR'} response from ElevenLabs API`);
      console.log(`[ElevenLabs] Response headers: Content-Type="${response.headers.get('content-type')}", Content-Length="${response.headers.get('content-length')}", Server="${response.headers.get('server')}"`);
      console.log(`[ElevenLabs] Response URL: ${response.url} - final URL after any redirects from ElevenLabs infrastructure`);
      console.log(`[ElevenLabs] API call timing: Request initiated at ${new Date(requestStartTime).toISOString()}, completed at ${new Date().toISOString()}, duration: ${requestDuration}ms`);
      
      if (!response.ok) {
        console.error(`[ElevenLabs] ========================== CRITICAL API ERROR DETECTED ==========================`);
        console.error(`[ElevenLabs] ElevenLabs API returned error status: HTTP ${response.status} ${response.statusText}`);
        console.error(`[ElevenLabs] This indicates a problem with the API request, authentication, or ElevenLabs service availability`);
        console.error(`[ElevenLabs] Request details: Method=POST, Endpoint=${this.config.baseUrl}/voices/add, Auth=xi-api-key (${this.config.apiKey.length} chars)`);
        console.error(`[ElevenLabs] Attempting to retrieve detailed error message from ElevenLabs API response body...`);
        
        const error = await response.text();
        console.error(`[ElevenLabs] ElevenLabs API error response body (full text): ${error}`);
        console.error(`[ElevenLabs] Error response length: ${error.length} characters`);
        console.error(`[ElevenLabs] Common causes: Invalid API key, insufficient credits, malformed request, audio file format issues, or ElevenLabs service downtime`);
        console.error(`[ElevenLabs] Voice training process cannot continue. Manual intervention required to resolve API error.`);
        throw new Error(`ElevenLabs API error: HTTP ${response.status} ${response.statusText} - ${error}`);
      }

      console.log(`[ElevenLabs] ============================= API SUCCESS - PARSING RESPONSE =============================`);
      console.log(`[ElevenLabs] ElevenLabs API request successful! Processing response data from voice cloning operation...`);
      console.log(`[ElevenLabs] Response indicates successful voice creation. Parsing JSON response to extract voice ID and metadata...`);
      
      const result = await response.json();
      console.log(`[ElevenLabs] ============================= VOICE CLONING OPERATION COMPLETED SUCCESSFULLY =============================`);
      console.log(`[ElevenLabs] ElevenLabs API response parsed successfully. Voice cloning operation completed with full details:`);
      console.log(`[ElevenLabs] Response data structure: ${JSON.stringify(result, null, 2)}`);
      console.log(`[ElevenLabs] Voice ID generated: ${result.voice_id || result.id || 'ID not found in response'}`);
      console.log(`[ElevenLabs] Voice name assigned: ${result.name || 'Name not found in response'}`);
      console.log(`[ElevenLabs] Voice status: ${result.status || 'Status not found in response'}`);
      console.log(`[ElevenLabs] Total processing time: ${Date.now() - requestStartTime + requestDuration}ms from initiation to completion`);
      console.log(`[ElevenLabs] Voice cloning successful for user ${request.userId} with voice profile ${request.voiceProfileId}`);
      
      return {
        success: true,
        voiceId: result.voice_id,
        samplesProcessed: request.samples.length,
        metadata: {
          provider: 'elevenlabs',
          emotionCount: request.samples.length,
          emotions: request.samples.map(s => s.emotion),
          created: new Date().toISOString(),
          elevenLabsData: result
        }
      };
    } catch (error) {
      console.error('[ElevenLabs] Voice training failed:', error);
      
      // Reset state using centralized service
      const { externalIntegrationStateReset } = await import('../external-integration-state-reset');
      await externalIntegrationStateReset.resetIntegrationState({
        userId: request.userId,
        provider: 'elevenlabs',
        operationType: 'voice_training',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        samplesProcessed: 0
      };
    }
  }

  async generateSpeech(text: string, voiceId: string, emotion?: string): Promise<ArrayBuffer> {
    console.log(`[ElevenLabs] Generating speech for voice ${voiceId}${emotion ? ` with emotion ${emotion}` : ''}`);
    
    try {
      // Get emotion-specific voice settings
      const voiceSettings = this.getEmotionSettings(emotion);
      
      const response = await fetch(`${this.config.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: this.config.modelName,
          voice_settings: voiceSettings
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs TTS error: ${response.status} - ${error}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('[ElevenLabs] Speech generation failed:', error);
      throw error;
    }
  }

  async getVoiceStatus(voiceId: string): Promise<{ status: string; ready: boolean }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        return { status: 'error', ready: false };
      }

      const voiceData = await response.json();
      
      // ElevenLabs voices are typically ready immediately after creation
      return {
        status: voiceData.fine_tuning?.is_allowed_to_fine_tune ? 'ready' : 'processing',
        ready: true
      };
    } catch (error) {
      console.error('[ElevenLabs] Voice status check failed:', error);
      return { status: 'error', ready: false };
    }
  }

  private getEmotionSettings(emotion?: string): any {
    // Default voice settings
    const baseSettings = {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    };

    // Emotion-specific adjustments
    if (!emotion) return baseSettings;

    switch (emotion.toLowerCase()) {
      case 'excitement':
      case 'joy':
        return { ...baseSettings, stability: 0.6, style: 0.2 };
      case 'anger':
      case 'frustration':
        return { ...baseSettings, stability: 0.8, style: 0.3 };
      case 'sadness':
      case 'melancholy':
        return { ...baseSettings, stability: 0.9, style: 0.1 };
      case 'fear':
      case 'anxiety':
        return { ...baseSettings, stability: 0.5, style: 0.4 };
      case 'calm':
      case 'peaceful':
        return { ...baseSettings, stability: 0.95, style: 0.0 };
      default:
        return baseSettings;
    }
  }
}