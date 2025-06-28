/**
 * ElevenLabs Voice Provider Implementation
 * Handles voice cloning and speech generation using ElevenLabs API
 */

import { BaseVoiceProvider, VoiceSample, VoiceCloneRequest, VoiceGenerationRequest, AudioResult, VoiceCloneResult, VoiceProviderCapabilities, VoiceProviderStatus } from './base-voice-provider';
import { getEmotionConfig } from '@shared/voice-config';

export class ElevenLabsProvider extends BaseVoiceProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(config: any) {
    super(config);
    this.baseUrl = config.apiConfig.baseUrl;
    this.apiKey = config.apiConfig.apiKey;
    this.model = config.apiConfig.model || 'eleven_monolingual_v1';
  }

  getCapabilities(): VoiceProviderCapabilities {
    return {
      voiceCloning: true,
      emotionModulation: true,
      realTimeGeneration: true,
      batchProcessing: true,
      maxSamples: 25,
      maxSampleSize: 25 * 1024 * 1024, // 25MB
      supportedFormats: ['mp3', 'wav', 'ogg', 'flac']
    };
  }

  async checkHealth(): Promise<VoiceProviderStatus> {
    try {
      if (!this.apiKey) {
        return {
          isAvailable: false,
          isHealthy: false,
          lastCheck: new Date(),
          error: 'API key not configured'
        };
      }

      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        return {
          isAvailable: false,
          isHealthy: false,
          lastCheck: new Date(),
          error: `API health check failed: ${response.status}`
        };
      }

      return {
        isAvailable: true,
        isHealthy: true,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        isAvailable: false,
        isHealthy: false,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cloneVoice(request: VoiceCloneRequest): Promise<VoiceCloneResult> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Validate samples
    const validation = this.validateSamples(request.samples);
    if (!validation.valid) {
      throw new Error(`Invalid samples: ${validation.errors.join(', ')}`);
    }

    try {
      const formData = new FormData();
      formData.append('name', request.name);
      
      if (request.description) {
        formData.append('description', request.description);
      }

      // Add emotion labels to help ElevenLabs understand the emotional range
      const emotionLabels: Record<string, string> = {};
      for (const sample of request.samples) {
        emotionLabels[sample.emotion] = `Voice sample expressing ${sample.emotion} emotion`;
      }
      formData.append('labels', JSON.stringify(emotionLabels));

      // Add audio files with emotion context
      request.samples.forEach((sample, index) => {
        const blob = new Blob([sample.audioData], { type: 'audio/mpeg' });
        formData.append('files', blob, `${sample.emotion}_${index}.mp3`);
      });

      const response = await fetch(`${this.baseUrl}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs voice cloning failed: ${error}`);
      }

      const result = await response.json();
      
      return {
        voiceId: result.voice_id,
        status: 'completed',
        metadata: {
          provider: 'elevenlabs',
          emotionCount: request.samples.length,
          emotions: request.samples.map(s => s.emotion),
          created: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Voice cloning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSpeech(request: VoiceGenerationRequest): Promise<AudioResult> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      // Get emotion-specific voice settings
      const voiceSettings = this.getEmotionVoiceSettings(request.emotion);
      
      // Override with custom settings if provided
      const finalSettings = {
        ...voiceSettings,
        ...(request.settings || {})
      };

      const requestBody = {
        text: request.text,
        model_id: this.model,
        voice_settings: finalSettings,
      };

      const response = await fetch(`${this.baseUrl}/text-to-speech/${request.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs TTS failed: ${error}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const duration = this.estimateAudioDuration(request.text);

      return {
        audioBuffer,
        duration,
        format: 'mp3',
        size: audioBuffer.length
      };
    } catch (error) {
      throw new Error(`Speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserVoices(userId: string): Promise<any[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch ElevenLabs voices');
        return [];
      }

      const result = await response.json();
      return result.voices || [];
    } catch (error) {
      console.error('Error fetching user voices:', error);
      return [];
    }
  }

  async deleteVoice(voiceId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete voice: ${error}`);
      }
    } catch (error) {
      throw new Error(`Voice deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getVoiceStatus(voiceId: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get voice status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Voice status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get emotion-specific voice settings from configuration
   */
  private getEmotionVoiceSettings(emotion?: string): any {
    if (!emotion) {
      // Default neutral settings
      return {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true,
        optimize_streaming_latency: false
      };
    }

    // Get emotion configuration
    const emotionConfig = getEmotionConfig(emotion);
    if (emotionConfig) {
      return {
        stability: emotionConfig.voiceSettings.stability,
        similarity_boost: emotionConfig.voiceSettings.similarityBoost,
        style: emotionConfig.voiceSettings.style,
        use_speaker_boost: emotionConfig.voiceSettings.useSpeakerBoost,
        optimize_streaming_latency: emotionConfig.voiceSettings.optimizeStreamingLatency
      };
    }

    // Fallback: try to infer settings based on emotion name
    return this.inferEmotionSettings(emotion);
  }

  /**
   * Infer voice settings based on emotion name when no configuration exists
   */
  private inferEmotionSettings(emotion: string): any {
    const lowerEmotion = emotion.toLowerCase();
    
    // Map common emotions to voice parameters
    if (lowerEmotion.includes('happy') || lowerEmotion.includes('joy') || lowerEmotion.includes('excited')) {
      return {
        stability: 0.7,
        similarity_boost: 0.8,
        style: 0.4,
        use_speaker_boost: true,
        optimize_streaming_latency: false
      };
    }
    
    if (lowerEmotion.includes('sad') || lowerEmotion.includes('melancholy') || lowerEmotion.includes('sorrow')) {
      return {
        stability: 0.3,
        similarity_boost: 0.9,
        style: 0.0,
        use_speaker_boost: true,
        optimize_streaming_latency: false
      };
    }
    
    if (lowerEmotion.includes('angry') || lowerEmotion.includes('frustrated') || lowerEmotion.includes('rage')) {
      return {
        stability: 0.4,
        similarity_boost: 0.7,
        style: 0.8,
        use_speaker_boost: true,
        optimize_streaming_latency: false
      };
    }
    
    if (lowerEmotion.includes('calm') || lowerEmotion.includes('peaceful') || lowerEmotion.includes('serene')) {
      return {
        stability: 0.8,
        similarity_boost: 0.9,
        style: 0.1,
        use_speaker_boost: true,
        optimize_streaming_latency: false
      };
    }
    
    if (lowerEmotion.includes('fear') || lowerEmotion.includes('anxious') || lowerEmotion.includes('worried')) {
      return {
        stability: 0.2,
        similarity_boost: 0.9,
        style: 0.2,
        use_speaker_boost: true,
        optimize_streaming_latency: false
      };
    }
    
    // Default neutral settings
    return {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
      optimize_streaming_latency: false
    };
  }
}