/**
 * ElevenLabs Voice Provider - Uses Abstract Base Class
 * Handles voice cloning and speech generation using ElevenLabs API
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { BaseVoiceProvider } from './base-voice-provider';
import { VoiceProviderConfig, VoiceTrainingRequest, VoiceTrainingResult } from './provider-manager';
import { ExternalIntegrationStateReset } from '../external-integration-state-reset';
import { AUDIO_FORMAT_CONFIG, AUDIO_PROCESSING_CONFIG } from '@shared/audio-config';
import { detectAudioFormat } from '../ai-analysis';
import FormData from 'form-data';

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
      const audioFiles: Array<{buffer: Buffer, filename: string, contentType: string}> = [];
      
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
          
          // Use helper function to detect actual audio format
          const detectedFormat = detectAudioFormat(audioBuffer);
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
            contentType: 'audio/mpeg'
          };
          audioFiles.push(audioFile);
          
          this.log('info', `Successfully processed ${sample.emotion} sample (${audioBuffer.length} bytes)`);
        } catch (error) {
          this.log('error', `Failed to process sample ${sample.emotion}`, error);
          throw error;
        }
      }
      
      this.log('info', `All ${audioFiles.length} audio files processed. Starting ElevenLabs voice creation...`);
      
      // Create voice using ElevenLabs SDK voice cloning method
      this.log('info', `Creating voice clone using ElevenLabs SDK...`);
      
      // Convert audio files to the format expected by ElevenLabs SDK
      const audioFiles_SDK = audioFiles.map(file => ({
        audio: file.buffer,
        filename: file.filename
      }));
      
      // Debug: Check available methods on voices object
      this.log('info', `Available voices methods: ${Object.getOwnPropertyNames(this.client.voices)}`);
      
      // Use ElevenLabs SDK voice cloning method - if it exists
      const voiceResult = await this.client.voices.add({
        name: voiceName,
        description: `Voice clone for user ${request.userId} with ${request.samples.length} emotion samples`,
        files: audioFiles_SDK
      });
      
      this.log('info', `Voice created successfully with ID: ${voiceResult.voice_id}`);
      
      return this.createSuccessResult(voiceResult.voice_id, request.samples.length, {
        elevenlabsVoiceId: voiceResult.voice_id,
        voiceName: voiceResult.name,
        category: voiceResult.category,
        emotionsProcessed: request.samples.map(s => s.emotion)
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



  private async convertToMp3(audioBuffer: Buffer, fileName: string): Promise<Buffer> {
    const { spawn } = await import('child_process');
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    this.log('info', `Converting audio to MP3 format for ${fileName}`);
    
    try {
      // Create temporary files
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'elevenlabs-'));
      
      // Detect actual file format from buffer or use fileName extension
      const detectedExtension = detectAudioFormat(audioBuffer) || path.extname(fileName).slice(1) || 'mp3';
      
      // If already MP3, return as-is (MP3-only enforcement means no conversion needed)
      if (detectedExtension === 'mp3') {
        this.log('info', `File is already MP3 format, skipping conversion: ${fileName}`);
        return audioBuffer;
      }
      
      const inputPath = path.join(tempDir, `input_${Date.now()}.${detectedExtension}`);
      const outputPath = path.join(tempDir, `output_${Date.now()}.mp3`);
      
      // Write input file
      await fs.writeFile(inputPath, audioBuffer);
      
      // Convert using FFmpeg with specific settings for ElevenLabs compatibility
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
}