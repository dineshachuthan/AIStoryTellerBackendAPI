/**
 * OpenAI Voice Provider Implementation
 * Fallback provider for text-to-speech when voice cloning is not available
 */

import { BaseVoiceProvider, VoiceSample, VoiceCloneRequest, VoiceGenerationRequest, AudioResult, VoiceCloneResult, VoiceProviderCapabilities, VoiceProviderStatus } from './base-voice-provider';
import OpenAI from "openai";

export class OpenAIProvider extends BaseVoiceProvider {
  private openai: OpenAI;

  constructor(config: any) {
    super(config);
    this.openai = new OpenAI({ apiKey: config.apiConfig.apiKey });
  }

  getCapabilities(): VoiceProviderCapabilities {
    return {
      voiceCloning: false,
      emotionModulation: false,
      realTimeGeneration: true,
      batchProcessing: false,
      maxSamples: 0,
      maxSampleSize: 0,
      supportedFormats: ['mp3']
    };
  }

  async checkHealth(): Promise<VoiceProviderStatus> {
    try {
      if (!this.config.apiConfig.apiKey) {
        return {
          isAvailable: false,
          isHealthy: false,
          lastCheck: new Date(),
          error: 'API key not configured'
        };
      }

      // Test with a small request
      await this.openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: "test",
      });

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
    throw new Error('OpenAI provider does not support voice cloning');
  }

  async generateSpeech(request: VoiceGenerationRequest): Promise<AudioResult> {
    if (!this.config.apiConfig.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Map emotion to appropriate OpenAI voice
      const voice = this.selectVoiceForEmotion(request.emotion);
      
      const response = await this.openai.audio.speech.create({
        model: this.config.apiConfig.model || "tts-1",
        voice: voice as any,
        input: request.text,
        speed: this.getSpeedForEmotion(request.emotion)
      });

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const duration = this.estimateAudioDuration(request.text);

      return {
        audioBuffer,
        duration,
        format: 'mp3',
        size: audioBuffer.length
      };
    } catch (error) {
      throw new Error(`OpenAI TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserVoices(userId: string): Promise<any[]> {
    // OpenAI doesn't support custom voices, return empty array
    return [];
  }

  async deleteVoice(voiceId: string): Promise<void> {
    throw new Error('OpenAI provider does not support voice deletion');
  }

  async getVoiceStatus(voiceId: string): Promise<any> {
    throw new Error('OpenAI provider does not support voice status');
  }

  /**
   * Select appropriate OpenAI voice based on emotion
   */
  private selectVoiceForEmotion(emotion?: string): string {
    if (!emotion) return 'alloy';

    const lowerEmotion = emotion.toLowerCase();

    // Map emotions to OpenAI voices based on characteristics
    if (lowerEmotion.includes('happy') || lowerEmotion.includes('joy') || lowerEmotion.includes('excited')) {
      return 'nova'; // Bright, energetic
    }
    
    if (lowerEmotion.includes('sad') || lowerEmotion.includes('melancholy') || lowerEmotion.includes('sorrow')) {
      return 'echo'; // Deeper, more resonant
    }
    
    if (lowerEmotion.includes('angry') || lowerEmotion.includes('frustrated')) {
      return 'onyx'; // Stronger, more assertive
    }
    
    if (lowerEmotion.includes('calm') || lowerEmotion.includes('peaceful') || lowerEmotion.includes('serene')) {
      return 'shimmer'; // Gentle, soothing
    }
    
    if (lowerEmotion.includes('mysterious') || lowerEmotion.includes('dramatic')) {
      return 'fable'; // More dramatic
    }

    // Default neutral voice
    return 'alloy';
  }

  /**
   * Get appropriate speech speed for emotion
   */
  private getSpeedForEmotion(emotion?: string): number {
    if (!emotion) return 1.0;

    const lowerEmotion = emotion.toLowerCase();

    if (lowerEmotion.includes('excited') || lowerEmotion.includes('anxious') || lowerEmotion.includes('nervous')) {
      return 1.15; // Faster for high-energy emotions
    }
    
    if (lowerEmotion.includes('sad') || lowerEmotion.includes('melancholy') || lowerEmotion.includes('calm')) {
      return 0.9; // Slower for contemplative emotions
    }
    
    if (lowerEmotion.includes('angry') || lowerEmotion.includes('frustrated')) {
      return 1.1; // Slightly faster for intensity
    }

    return 1.0; // Normal speed
  }
}