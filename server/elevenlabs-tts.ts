/**
 * ElevenLabs Text-to-Speech Integration
 * Provides voice cloning and custom voice generation capabilities
 */

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
}

interface ElevenLabsGenerationResult {
  audioBuffer: Buffer;
  duration?: number;
}

interface VoiceCloneRequest {
  name: string;
  description?: string;
  files: Buffer[];
  labels?: Record<string, string>;
}

export class ElevenLabsTTS {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not found. Voice cloning will not be available.');
    }
  }

  /**
   * Check if ElevenLabs is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Clone a voice from user audio samples
   */
  async cloneVoice(request: VoiceCloneRequest): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    const formData = new FormData();
    formData.append('name', request.name);
    
    if (request.description) {
      formData.append('description', request.description);
    }

    // Add audio files
    request.files.forEach((buffer, index) => {
      formData.append('files', new Blob([buffer], { type: 'audio/mpeg' }), `sample_${index}.mp3`);
    });

    if (request.labels) {
      formData.append('labels', JSON.stringify(request.labels));
    }

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
    return result.voice_id;
  }

  /**
   * Generate speech using a cloned voice
   */
  async generateSpeech(
    text: string, 
    voiceId: string,
    options: {
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
    } = {}
  ): Promise<ElevenLabsGenerationResult> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    const requestBody = {
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarity_boost ?? 0.8,
        style: options.style ?? 0.0,
        use_speaker_boost: options.use_speaker_boost ?? true,
      },
    };

    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
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
    
    return {
      audioBuffer,
      duration: this.estimateAudioDuration(text), // Rough estimation
    };
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    if (!this.isAvailable()) {
      return [];
    }

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
  }

  /**
   * Delete a cloned voice
   */
  async deleteVoice(voiceId: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

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
  }

  /**
   * Estimate audio duration based on text length
   * Rough approximation: ~150 words per minute
   */
  private estimateAudioDuration(text: string): number {
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150;
    const durationInMinutes = wordCount / wordsPerMinute;
    return Math.round(durationInMinutes * 60 * 1000); // Convert to milliseconds
  }
}

export const elevenLabsTTS = new ElevenLabsTTS();