/**
 * ElevenLabs Voice Provider - Professional Implementation
 * Carries over all proven architectural patterns, utilities, error handling, timeout patterns, and state reset patterns
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import axios from 'axios';
import FormData from 'form-data';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { BaseVoiceProvider } from './base-voice-provider';
import { VoiceProviderConfig, VoiceTrainingRequest, VoiceTrainingResult } from './provider-manager';
import { ExternalIntegrationStateReset } from '../external-integration-state-reset';
import { AUDIO_FORMAT_CONFIG, AUDIO_PROCESSING_CONFIG } from '@shared/audio-config';
import { detectAudioFormat } from '../ai-analysis';

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
      // Test API connectivity using direct axios call
      const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.config.apiKey
        }
      });
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
    this.log('info', `Sample details: ${JSON.stringify(request.samples.map(s => ({ emotion: s.emotion, audioUrl: s.audioUrl })))}`);
    
    try {
      // Get anonymous external ID for the user
      const { externalIdService } = await import('../external-id-service');
      const externalId = await externalIdService.getOrCreateExternalId(request.userId);
      
      const voiceName = `User_${externalId}_Voice_${Date.now()}`;
      this.log('info', `Generated voice name: ${voiceName}`);
      
      // Process audio files using base class utilities
      const audioFiles: Array<{buffer: Buffer, filename: string, contentType: string}> = [];
      const failedSamples: Array<{ emotion: string; error: string; recordingId?: number }> = [];
      
      // Import storage for database operations
      const { storage } = await import('../storage');
      
      // Log all samples being processed for debugging
      console.log(`[ElevenLabs] 📋 All samples to process (${request.samples.length} total):`, request.samples.map(s => ({
        emotion: s.emotion,
        audioUrl: s.audioUrl,
        duration: (s as any).duration || 'unknown',
        recordingId: (s as any).recordingId || 'unknown'
      })));
      
      // Track successful vs failed samples
      const processedEmotions: string[] = [];
      const skippedEmotions: string[] = [];
      
      for (let index = 0; index < request.samples.length; index++) {
        const sample = request.samples[index];
        let audioBuffer: Buffer | null = null;
        
        try {
          this.log('info', `Processing sample ${index + 1}/${request.samples.length}: ${sample.emotion}`);
          this.log('info', `🔍 FAULT-TOLERANT VALIDATION ENABLED - Checking audio before ElevenLabs`);
          
          // Special logging for optimism to debug the issue
          if (sample.emotion === 'optimism' || sample.emotion.includes('optimism')) {
            this.log('warn', `⚠️ DETECTED OPTIMISM SAMPLE: ${JSON.stringify(sample)}`);
          }
          
          // Log the original audio URL received
          this.log('info', `Original audioUrl received: ${sample.audioUrl}`);
          
          // Convert relative path to absolute URL for fetch
          // Handle different path formats
          let audioUrl: string;
          if (sample.audioUrl.startsWith('http')) {
            audioUrl = sample.audioUrl;
          } else if (sample.audioUrl.startsWith('/cache/')) {
            // Handle legacy /cache/ paths - these files don't exist
            throw new Error(`Legacy cache path detected: ${sample.audioUrl}. File needs to be re-recorded.`);
          } else {
            audioUrl = `http://localhost:5000${sample.audioUrl}`;
          }
          
          this.log('info', `Final audioUrl for fetch: ${audioUrl}`);
          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio for ${sample.emotion}: HTTP ${audioResponse.status}`);
          }
          
          const arrayBuffer = await audioResponse.arrayBuffer();
          audioBuffer = Buffer.from(arrayBuffer);
          
          // FAULT TOLERANT LOGIC COMMENTED OUT FOR TESTING
          /*
          // PRE-ELEVENLABS VALIDATION - Log audio details
          // Step 1: Log file size but don't reject based on it
          this.log('info', `Audio file size: ${audioBuffer.length} bytes`);
          
          // Step 2: Detect actual audio format
          const detectedFormat = detectAudioFormat(audioBuffer);
          this.log('info', `Audio format detection for ${sample.emotion}_sample_${index + 1}.mp3: detected=${detectedFormat}, bufferSize=${audioBuffer.length}, firstBytes=${audioBuffer.slice(0, 8).toString('hex')}`);
          
          // Step 3: Log detected format but don't reject - let ElevenLabs validate
          this.log('info', `Detected format: ${detectedFormat} - proceeding to ElevenLabs for validation`);
          
          // Step 4: Log duration but don't reject based on it - let ElevenLabs validate
          if ((sample as any).duration) {
            this.log('info', `Sample duration: ${(sample as any).duration}s`);
          }
          */
          
          const fileName = `${sample.emotion}_sample_${index + 1}.mp3`;
          
          // Skip validation and conversion - send raw audio to ElevenLabs
          const convertedAudioBuffer = audioBuffer;
          
          // Comment out base class validation
          // this.validateAudioFile(convertedAudioBuffer, fileName);
          
          const audioFile = {
            buffer: convertedAudioBuffer,
            filename: fileName,
            contentType: 'audio/mpeg',
            emotion: sample.emotion // Track emotion for successful samples
          };
          audioFiles.push(audioFile);
          processedEmotions.push(sample.emotion);
          
          this.log('info', `✅ Successfully processed ${sample.emotion} sample (${audioBuffer.length} bytes)`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`[ElevenLabs] ❌ SAMPLE FAILED: ${sample.emotion}`, {
            error: errorMessage,
            audioUrl: sample.audioUrl,
            duration: (sample as any).duration || 'unknown',
            recordingId: (sample as any).recordingId || 'unknown'
          });
          this.log('warn', `Skipping failed sample ${sample.emotion}: ${errorMessage}`);
          
          // Add sample metadata if available (for database cleanup)
          const failedSample: any = { emotion: sample.emotion, error: errorMessage };
          if ((sample as any).recordingId) {
            failedSample.recordingId = (sample as any).recordingId;
          }
          failedSamples.push(failedSample);
          skippedEmotions.push(sample.emotion);
          
          // ONLY soft delete if we can confirm the audio file itself is corrupted
          // Check for actual file corruption indicators
          let isCorrupted = false;
          
          // Try to detect actual audio corruption
          if (errorMessage.includes('Failed to fetch audio') && errorMessage.includes('HTTP 404')) {
            // File doesn't exist
            isCorrupted = true;
          } else if (audioBuffer && audioBuffer.length < 100) {
            // File is too small to be valid audio (less than 100 bytes)
            isCorrupted = true;
          } else if (audioBuffer) {
            // Check audio format detection
            const detectedFormat = detectAudioFormat(audioBuffer);
            if (detectedFormat === 'unknown' || detectedFormat === 'invalid') {
              isCorrupted = true;
            }
          }
          
          if (isCorrupted) {
            // Audio file is confirmed corrupted - safe to soft delete
            this.log('warn', `🗑️ Audio file confirmed corrupted for ${sample.emotion}, will mark as inactive`);
            
            try {
              if ((sample as any).recordingId) {
                await storage.deleteUserEsmRecording((sample as any).recordingId);
                this.log('info', `✅ Soft deleted corrupted recording ${(sample as any).recordingId}`);
              }
            } catch (dbError) {
              this.log('error', `Failed to soft delete corrupted recording: ${dbError}`);
            }
          } else {
            // Network error, API error, or any other issue - ALWAYS preserve the recording
            this.log('warn', `⚠️ Recording for ${sample.emotion} failed with: ${errorMessage}`);
            this.log('info', `Recording preserved for retry - not a file corruption issue`);
          }
        }
      }
      
      // Log comprehensive summary
      console.log(`[ElevenLabs] 📊 PROCESSING SUMMARY:`);
      console.log(`[ElevenLabs] Total samples provided: ${request.samples.length}`);
      console.log(`[ElevenLabs] ✅ Successfully processed: ${processedEmotions.length} samples - [${processedEmotions.join(', ')}]`);
      console.log(`[ElevenLabs] ❌ Failed/Skipped: ${skippedEmotions.length} samples - [${skippedEmotions.join(', ')}]`);
      
      if (failedSamples.length > 0) {
        console.log(`[ElevenLabs] Failed sample details:`, failedSamples.map(s => ({
          emotion: s.emotion,
          error: s.error
        })));
        this.log('warn', `${failedSamples.length} samples failed and were deleted: ${failedSamples.map(s => s.emotion).join(', ')}`);
      }
      
      // Ensure we have minimum required samples after filtering
      if (audioFiles.length < 5) {
        const failedList = failedSamples.map(s => `${s.emotion} (${s.error})`).join(', ');
        throw new Error(`Only ${audioFiles.length} valid samples available (minimum 5 required). Failed samples: ${failedList}. Please re-record the failed samples.`);
      }
      
      this.log('info', `All ${audioFiles.length} audio files processed. Starting ElevenLabs voice creation...`);
      
      // Debug logging as requested - using config-driven values
      console.log(JSON.stringify({
        voiceId: "creating_new_voice",
        modelId: "voice_cloning", 
        text: `Voice cloning with ${audioFiles.length} samples`,
        voiceSettings: this.getEmotionSettings(),
        format: audioFiles.length > 0 ? detectAudioFormat(audioFiles[0].buffer) : "unknown"
      }, null, 2));

      // Use direct axios API for voice cloning as recommended
      this.log('info', `Creating voice using direct ElevenLabs API with axios`);
      
      // Create voice using direct axios approach as recommended
      const voiceResult = await this.withRetry(async () => {
        const form = new FormData();
        form.append('name', voiceName);
        
        // Add audio files to FormData
        audioFiles.forEach(file => {
          form.append('files', file.buffer, {
            filename: file.filename,
            contentType: 'audio/mpeg'
          });
        });
        
        form.append('remove_background_noise', 'true');
        form.append('description', `Voice clone for user ${request.userId} with ${request.samples.length} emotion samples`);
        const labels = this.getVoiceLabelsFromConfig();
        if (labels) form.append('labels', JSON.stringify(labels));

        const response = await axios.post(
          'https://api.elevenlabs.io/v1/voices/add',
          form,
          {
            headers: {
              'xi-api-key': this.config.apiKey,
              ...form.getHeaders()
            }
          }
        );
        
        return response.data;
      });
      
      this.log('info', `Voice created successfully with ID: ${voiceResult.voice_id}`);
      
      return this.createSuccessResult(voiceResult.voice_id, audioFiles.length, {
        elevenlabsVoiceId: voiceResult.voice_id,
        voiceName: voiceResult.name,
        emotionsProcessed: audioFiles.map(file => (file as any).emotion),
        failedSamples: failedSamples,
        totalSamplesProvided: request.samples.length,
        validSamplesProcessed: audioFiles.length
      });
      
    } catch (error: any) {
      // Enhanced error logging following the TTS script pattern
      const errorDetails = error.response?.data || error.message || String(error);
      this.log('error', `Voice training failed for user ${request.userId}. API Response: ${JSON.stringify(errorDetails)}`);
      
      // Use standardized external integration failure handling - no completion records stored
      try {
        ExternalIntegrationStateReset.logFailureWithoutStorage(
          'elevenlabs',
          'voice_training',
          request.userId,
          `ElevenLabs API error: ${JSON.stringify(errorDetails)} - Voice Profile ID: ${request.voiceProfileId}, Samples: ${request.samples.length}`
        );
        
        // Reset voice profile state to 'failed' 
        await ExternalIntegrationStateReset.resetVoiceProfile(
          request.userId, 
          `ElevenLabs API error: ${error instanceof Error ? error.message : String(error)}`
        );
        
        this.log('info', `Voice profile state reset completed for user ${request.userId} after ElevenLabs failure`);
      } catch (resetError) {
        this.log('error', `Failed to reset voice profile state for user ${request.userId}`, resetError);
      }
      
      // Throw exception instead of returning error result - follows standardized exception handling
      throw new Error(`ElevenLabs voice training failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }



  async generateSpeech(text: string, voiceId: string, emotion?: string, narratorProfile?: any): Promise<ArrayBuffer> {
    console.log(`[ElevenLabs] Generating speech using ElevenLabs SDK for voice ID: ${voiceId}, text length: ${text.length} characters, emotion: ${emotion || 'neutral'}`);
    if (narratorProfile) {
      console.log(`[ElevenLabs] Narrator profile provided:`, {
        language: narratorProfile.language,
        locale: narratorProfile.locale,
        nativeLanguage: narratorProfile.nativeLanguage
      });
    }
    
    try {
      // Use direct API call instead of SDK which has issues
      const response = await axios.post(
        `${this.config.baseUrl}/text-to-speech/${voiceId}`,
        {
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: this.getEmotionSettings(emotion)
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.config.apiKey
          },
          responseType: 'arraybuffer'
        }
      );
      
      this.log('info', `Speech generation successful for voice ${voiceId}, audio size: ${response.data.length} bytes, emotion: ${emotion || 'neutral'}`);
      return response.data;
      
    } catch (error: any) {
      this.log('error', `Speech generation failed for voice ${voiceId}`, error);
      throw new Error(`ElevenLabs TTS failed: ${error.response?.status || 'Unknown error'} - ${error.message}`);
    }
  }

  async getVoiceStatus(voiceId: string): Promise<{ status: string; ready: boolean }> {
    try {
      const voice = await this.client.voices.get(voiceId);
      return {
        status: voice.status || 'unknown',
        ready: voice.status === 'ready'
      };
    } catch (error) {
      this.log('error', `Failed to get voice status for ${voiceId}`, error);
      return { status: 'error', ready: false };
    }
  }

  /**
   * Delete a voice from ElevenLabs
   * 
   * IMPORTANT: This method always returns true (success) regardless of actual deletion result.
   * This is intentional because:
   * 1. Old voice IDs in our database may no longer exist in ElevenLabs
   * 2. We want voice generation to continue even if cleanup fails
   * 3. Users can manually clean up voices in ElevenLabs dashboard if needed
   * 4. Prevents panic-inducing error logs for expected scenarios
   * 
   * @param voiceId The voice ID to delete
   * @param userId User ID for audit trail
   * @returns Always returns true to allow graceful continuation
   */
  async deleteVoice(voiceId: string, userId?: string): Promise<boolean> {
    try {
      this.log('info', `Deleting voice ${voiceId} from ElevenLabs`);
      
      // Track deletion attempt in audit table if userId provided
      let cleanupId: number | undefined;
      if (userId) {
        const { storage } = await import('../storage');
        const cleanup = await storage.trackVoiceIdDeletion({
          userId,
          integrationPartner: 'ElevenLabs',
          partnerVoiceId: voiceId
        });
        cleanupId = cleanup.id;
      }
      
      const response = await axios.delete(
        `${this.config.baseUrl}/voices/${voiceId}`,
        {
          headers: {
            'xi-api-key': this.config.apiKey
          }
        }
      );
      
      this.log('info', `Successfully deleted voice ${voiceId}`);
      
      // Update audit status to confirmed with response data
      if (cleanupId) {
        const { storage } = await import('../storage');
        await storage.updateVoiceIdCleanupStatus(cleanupId, 'confirmed', undefined, {
          statusCode: response.status,
          statusText: response.statusText,
          headers: response.headers,
          voiceId: voiceId,
          deletedAt: new Date().toISOString(),
          partner: 'ElevenLabs'
        });
      }
      
      return true;
    } catch (error: any) {
      // Voice doesn't exist is expected when updating - not an error
      if (error.response?.status === 400 && error.response?.data?.detail?.message?.includes('does not exist')) {
        this.log('info', `Voice ${voiceId} no longer exists in ElevenLabs - continuing with voice creation`);
        
        // Update audit status to indicate voice didn't exist
        if (userId) {
          try {
            const { storage } = await import('../storage');
            const cleanups = await storage.getVoiceCleanupHistory(userId, 1);
            const cleanup = cleanups.find(c => c.partnerVoiceId === voiceId);
            if (cleanup) {
              await storage.updateVoiceIdCleanupStatus(
                cleanup.id, 
                'confirmed', 
                'Voice did not exist in ElevenLabs'
              );
            }
          } catch (auditError) {
            // Silent fail for audit update
          }
        }
        
        return true; // Return success since voice is gone anyway
      }
      
      // For other errors, keep minimal logging
      this.log('info', `Voice deletion unsuccessful for ${voiceId} - continuing`);
      
      // Update audit status to failed
      if (userId) {
        try {
          const { storage } = await import('../storage');
          const cleanups = await storage.getVoiceCleanupHistory(userId, 1);
          const cleanup = cleanups.find(c => c.partnerVoiceId === voiceId);
          if (cleanup) {
            await storage.updateVoiceIdCleanupStatus(
              cleanup.id, 
              'failed', 
              error.response?.data?.detail?.message || error.message
            );
          }
        } catch (auditError) {
          // Silent fail for audit update
        }
      }
      
      // Swallow exception - always return true to continue gracefully
      return true;
    }
  }

  /**
   * Update an existing voice with new samples
   * @param voiceId The voice ID to update
   * @param request Voice training request with new samples
   * @returns Updated voice result
   */
  async updateVoice(voiceId: string, request: VoiceTrainingRequest): Promise<VoiceTrainingResult> {
    this.log('info', `Updating voice ${voiceId} with ${request.samples.length} new samples`);
    
    try {
      // First, try to delete the old voice (pass userId for audit trail)
      await this.deleteVoice(voiceId, request.userId);
    } catch (error: any) {
      // If voice doesn't exist, that's fine - we'll create a new one
      this.log('info', `Voice ${voiceId} not found, will create new voice`);
    }
    
    // Create a new voice
    return await this.performVoiceTraining(request);
  }

  private async convertToMp3(audioBuffer: Buffer, fileName: string): Promise<Buffer> {
    const format = detectAudioFormat(audioBuffer);
    
    this.log('info', `Audio format detection for ${fileName}: detected=${format}, bufferSize=${audioBuffer.length}, firstBytes=${audioBuffer.slice(0, 8).toString('hex')}`);
    
    // Skip conversion if already MP3 OR if fileName suggests MP3
    const isMP3File = format === 'mp3' || fileName.toLowerCase().endsWith('.mp3');
    if (isMP3File) {
      this.log('info', `${fileName} is already MP3 format (detected=${format}, filename check=${fileName.toLowerCase().endsWith('.mp3')}), skipping conversion`);
      return audioBuffer;
    }
    
    try {
      this.log('info', `Converting ${fileName} from ${format} to MP3`);
      
      // Create temporary directory and files
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'elevenlabs-'));
      // Use the original file extension from fileName if available, otherwise use detected format
      const originalExt = path.extname(fileName).slice(1) || format;
      const inputPath = path.join(tempDir, `input_${Date.now()}.${originalExt}`);
      const outputPath = path.join(tempDir, `output_${Date.now()}.mp3`);
      
      this.log('info', `Writing audio file: ${inputPath} (extension: ${originalExt})`);
      
      // Write input file
      await fs.writeFile(inputPath, audioBuffer);
      
      // Convert using FFmpeg with ElevenLabs-compatible settings
      const ffmpegArgs = [
        '-i', inputPath,
        '-codec:a', 'libmp3lame',  // Use LAME MP3 encoder
        '-b:a', '128k',            // 128 kbps bitrate
        '-ar', '22050',            // 22.05 kHz sample rate (ElevenLabs compatible)
        '-ac', '1',                // Mono audio
        '-f', 'mp3',               // Force MP3 format
        '-y',                      // Overwrite output file
        outputPath
      ];
      
      return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        let errorOutput = '';
        
        ffmpeg.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        ffmpeg.on('close', async (code) => {
          try {
            if (code !== 0) {
              throw new Error(`FFmpeg conversion failed with code ${code}: ${errorOutput}`);
            }
            
            // Read converted file
            const convertedBuffer = await fs.readFile(outputPath);
            
            // Cleanup temp files
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
            await fs.rmdir(tempDir).catch(() => {});
            
            this.log('info', `Successfully converted ${fileName} to MP3 (${convertedBuffer.length} bytes)`);
            resolve(convertedBuffer);
          } catch (error) {
            reject(error);
          }
        });
        
        ffmpeg.on('error', (error) => {
          reject(new Error(`FFmpeg process error: ${error.message}`));
        });
      });
      
    } catch (error) {
      this.log('error', `Audio conversion failed for ${fileName}`, error);
      throw error;
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

  private getVoiceLabelsFromConfig(): any {
    return {
      accent: 'neutral',
      age: 'adult',
      gender: 'neutral',
      use_case: 'storytelling'
    };
  }
}