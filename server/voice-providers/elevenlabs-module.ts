/**
 * ElevenLabs Voice Module - Follows Video Provider Pattern
 * Handles voice cloning and speech generation using ElevenLabs API
 */

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
    console.log(`[ElevenLabs] Starting voice training for user ${request.userId} with ${request.samples.length} samples`);
    
    try {
      // Prepare FormData for ElevenLabs API
      const formData = new FormData();
      formData.append('name', `User_${request.userId}_Voice_${Date.now()}`);
      formData.append('description', `Voice clone for user ${request.userId} with ${request.samples.length} emotion samples`);

      // Add emotion labels
      const emotionLabels: Record<string, string> = {};
      for (const sample of request.samples) {
        emotionLabels[sample.emotion] = `Voice sample expressing ${sample.emotion} emotion`;
      }
      formData.append('labels', JSON.stringify(emotionLabels));

      // Download and add audio files
      for (let index = 0; index < request.samples.length; index++) {
        const sample = request.samples[index];
        
        try {
          console.log(`[ElevenLabs] Fetching audio for ${sample.emotion} from ${sample.audioUrl}`);
          
          const audioResponse = await fetch(sample.audioUrl);
          if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio for ${sample.emotion}: ${audioResponse.status}`);
          }
          
          const arrayBuffer = await audioResponse.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuffer);
          
          if (audioBuffer.length === 0) {
            throw new Error(`No audio data available for ${sample.emotion}`);
          }
          
          const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
          formData.append('files', blob, `${sample.emotion}_${index}.mp3`);
          console.log(`[ElevenLabs] Added ${sample.emotion} sample (${audioBuffer.length} bytes)`);
        } catch (error) {
          console.error(`[ElevenLabs] Failed to process sample ${sample.emotion}:`, error);
          throw error;
        }
      }

      // Make API call to ElevenLabs
      console.log(`[ElevenLabs] Sending voice clone request to ${this.config.baseUrl}/voices/add`);
      
      const response = await fetch(`${this.config.baseUrl}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
        },
        body: formData,
      });

      console.log(`[ElevenLabs] API Response Status: ${response.status}`);
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`[ElevenLabs] API Error Response:`, error);
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      console.log(`[ElevenLabs] Voice clone created successfully:`, result);
      
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