/**
 * ElevenLabs Voice Provider Implementation
 * Follows BaseVoiceProvider patterns with proper FFmpeg integration
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { BaseVoiceProvider } from './base-voice-provider';
import { VoiceProviderConfig, VoiceTrainingRequest, VoiceTrainingResult, VoiceModule } from './provider-manager';
import { ExternalIntegrationStateReset } from '../external-integration-state-reset';
import { detectAudioFormat } from '../ai-analysis';

export class ElevenLabsModule extends BaseVoiceProvider implements VoiceModule {
  private client: ElevenLabsClient;

  constructor(config: VoiceProviderConfig) {
    super(config, 'ElevenLabs');
    this.client = new ElevenLabsClient({
      apiKey: config.apiKey
    });
  }

  protected validateConfig(config: VoiceProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
  }

  async trainVoice(request: VoiceTrainingRequest): Promise<VoiceTrainingResult> {
    try {
      this.log('info', `Starting voice training for user ${request.userId} with ${request.samples.length} samples`);
      
      // Process and convert audio samples
      const processedSamples = await this.processAudioSamples(request.samples);
      
      // Generate voice name
      const voiceName = this.generateVoiceName(request.userId);
      
      // Create voice using ElevenLabs API
      const voiceResult = await this.client.voices.add({
        name: voiceName,
        description: `Voice clone for user ${request.userId}`,
        labels: {
          accent: 'neutral',
          age: 'adult',
          gender: 'neutral',
          use_case: 'storytelling'
        },
        files: processedSamples.map(sample => ({
          name: sample.filename,
          content: sample.buffer
        }))
      });

      this.log('info', `Voice created successfully with ID: ${voiceResult.voice_id}`);
      
      return {
        success: true,
        voiceId: voiceResult.voice_id,
        samplesProcessed: processedSamples.length,
        metadata: {
          elevenlabsVoiceId: voiceResult.voice_id,
          voiceName: voiceResult.name,
          emotions: request.samples.map(s => s.emotion)
        }
      };
      
    } catch (error) {
      await this.handleTrainingFailure(error, request);
      throw new Error(`Voice training failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateSpeech(text: string, voiceId: string, emotion?: string): Promise<ArrayBuffer> {
    try {
      this.log('info', `Generating speech for voice ID: ${voiceId}`);
      
      const audioStream = await this.client.textToSpeech.stream(voiceId, {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: this.getVoiceSettings(emotion)
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

  private async processAudioSamples(samples: Array<{ emotion: string; audioUrl: string; isLocked: boolean }>): Promise<Array<{ buffer: Buffer; filename: string }>> {
    const processedSamples: Array<{ buffer: Buffer; filename: string }> = [];
    
    for (let index = 0; index < samples.length; index++) {
      const sample = samples[index];
      this.log('info', `Processing sample ${index + 1}/${samples.length}: ${sample.emotion}`);
      
      try {
        // Fetch audio file
        const audioUrl = `http://localhost:5000${sample.audioUrl}`;
        const response = await fetch(audioUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch audio for ${sample.emotion}: HTTP ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);
        
        // Convert to MP3 if needed
        const mp3Buffer = await this.convertToMp3(audioBuffer, `${sample.emotion}_${index + 1}`);
        
        processedSamples.push({
          buffer: mp3Buffer,
          filename: `${sample.emotion}_sample_${index + 1}.mp3`
        });
        
        this.log('info', `Successfully processed ${sample.emotion} sample (${mp3Buffer.length} bytes)`);
        
      } catch (error) {
        this.log('error', `Failed to process sample ${sample.emotion}`, error);
        throw error;
      }
    }
    
    return processedSamples;
  }

  private async convertToMp3(audioBuffer: Buffer, fileName: string): Promise<Buffer> {
    const format = detectAudioFormat(audioBuffer);
    
    // Skip conversion if already MP3
    if (format === 'mp3') {
      this.log('info', `${fileName} is already MP3 format, skipping conversion`);
      return audioBuffer;
    }
    
    try {
      this.log('info', `Converting ${fileName} from ${format} to MP3`);
      
      // Create temporary directory and files
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'elevenlabs-'));
      const inputPath = path.join(tempDir, `input_${Date.now()}.${format}`);
      const outputPath = path.join(tempDir, `output_${Date.now()}.mp3`);
      
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

  private getVoiceSettings(emotion?: string): any {
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

  private generateVoiceName(userId: string): string {
    return `User_${userId}_Voice_${Date.now()}`;
  }

  private async handleTrainingFailure(error: any, request: VoiceTrainingRequest): Promise<void> {
    const errorDetails = error.response?.data || error.message || String(error);
    this.log('error', `Voice training failed for user ${request.userId}. Error: ${JSON.stringify(errorDetails)}`);
    
    try {
      ExternalIntegrationStateReset.logFailureWithoutStorage(
        'elevenlabs',
        'voice_training',
        request.userId,
        `ElevenLabs API error: ${JSON.stringify(errorDetails)}`
      );
      
      await ExternalIntegrationStateReset.resetVoiceProfile(
        request.userId,
        `ElevenLabs API error: ${error instanceof Error ? error.message : String(error)}`
      );
      
      this.log('info', `Voice profile state reset completed for user ${request.userId}`);
    } catch (resetError) {
      this.log('error', `Failed to reset voice profile state for user ${request.userId}`, resetError);
    }
  }
}