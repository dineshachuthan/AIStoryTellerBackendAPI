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
      const voiceName = `User_${request.userId}_Voice_${Date.now()}`;
      this.log('info', `Generated voice name: ${voiceName}`);
      
      // Process audio files using base class utilities
      const audioFiles: Array<{buffer: Buffer, filename: string, contentType: string}> = [];
      const failedSamples: Array<{ emotion: string; error: string; recordingId?: number }> = [];
      
      // Import storage for database operations
      const { storage } = await import('../storage');
      
      for (let index = 0; index < request.samples.length; index++) {
        const sample = request.samples[index];
        
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
          const audioUrl = sample.audioUrl.startsWith('http') 
            ? sample.audioUrl 
            : `http://localhost:5000${sample.audioUrl}`;
          
          this.log('info', `Final audioUrl for fetch: ${audioUrl}`);
          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio for ${sample.emotion}: HTTP ${audioResponse.status}`);
          }
          
          const arrayBuffer = await audioResponse.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuffer);
          
          // PRE-ELEVENLABS VALIDATION - Check audio before processing
          // Step 1: Basic file size check
          if (audioBuffer.length < 1000) { // Less than 1KB is likely corrupted
            throw new Error(`Audio file too small (${audioBuffer.length} bytes) - likely corrupted`);
          }
          
          // Step 2: Detect actual audio format
          const detectedFormat = detectAudioFormat(audioBuffer);
          this.log('info', `Audio format detection for ${sample.emotion}_sample_${index + 1}.mp3: detected=${detectedFormat}, bufferSize=${audioBuffer.length}, firstBytes=${audioBuffer.slice(0, 8).toString('hex')}`);
          
          // Step 3: Check if format is valid
          const validFormats = ['mp3', 'wav', 'webm', 'm4a', 'ogg'];
          if (!validFormats.includes(detectedFormat)) {
            throw new Error(`Invalid audio format detected: ${detectedFormat}. File may be corrupted.`);
          }
          
          // Step 4: Check duration if available from sample metadata
          if ((sample as any).duration && parseFloat((sample as any).duration) < 5.0) {
            throw new Error(`Audio duration too short: ${(sample as any).duration}s (minimum 5s required)`);
          }
          
          const fileName = `${sample.emotion}_sample_${index + 1}.mp3`;
          
          // Convert to MP3 for ElevenLabs compatibility if needed
          const convertedAudioBuffer = detectedFormat === 'mp3' 
            ? audioBuffer 
            : await this.convertToMp3(audioBuffer, fileName);
          
          // Use base class validation on converted audio
          this.validateAudioFile(convertedAudioBuffer, fileName);
          
          const audioFile = {
            buffer: convertedAudioBuffer,
            filename: fileName,
            contentType: 'audio/mpeg',
            emotion: sample.emotion // Track emotion for successful samples
          };
          audioFiles.push(audioFile);
          
          this.log('info', `Successfully processed ${sample.emotion} sample (${audioBuffer.length} bytes)`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log('warn', `Skipping failed sample ${sample.emotion}: ${errorMessage}`);
          
          // Add sample metadata if available (for database cleanup)
          const failedSample: any = { emotion: sample.emotion, error: errorMessage };
          if ((sample as any).recordingId) {
            failedSample.recordingId = (sample as any).recordingId;
          }
          failedSamples.push(failedSample);
          
          // Delete corrupted recording from database
          try {
            // Parse the audio URL to extract the emotion name
            const urlParts = sample.audioUrl.split('/');
            const emotionFile = urlParts[urlParts.length - 1].replace('.mp3', '');
            const category = parseInt(urlParts[urlParts.length - 2]) || 1; // Get category from path
            
            const existingRecording = await storage.getUserEsmRecordingByEmotionAndCategory(
              request.userId, 
              emotionFile, 
              category
            );
            
            if (existingRecording) {
              this.log('warn', `Deleting corrupted recording ${existingRecording.user_esm_recordings_id} for ${sample.emotion}`);
              await storage.deleteUserEsmRecording(existingRecording.user_esm_recordings_id);
            }
          } catch (dbError) {
            this.log('error', `Failed to delete corrupted recording for ${sample.emotion}:`, dbError);
          }
        }
      }
      
      // Log summary of processing
      if (failedSamples.length > 0) {
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



  async generateSpeech(text: string, voiceId: string, emotion?: string): Promise<ArrayBuffer> {
    console.log(`[ElevenLabs] Generating speech using ElevenLabs SDK for voice ID: ${voiceId}, text length: ${text.length} characters, emotion: ${emotion || 'neutral'}`);
    
    try {
      // Use SDK for TTS as recommended in your first snippet
      const audioStream = await this.client.textToSpeech.convert({
        voiceId: voiceId,
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
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result.buffer;
      
    } catch (error) {
      this.log('error', `Speech generation failed for voice ${voiceId}`, error);
      throw error;
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