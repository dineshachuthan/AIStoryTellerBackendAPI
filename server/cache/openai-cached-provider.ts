/**
 * OpenAI Cached Provider - Content Hash Based External API Decisions
 * Extends BaseCachedProvider to enforce cache-first pattern for OpenAI API calls
 */

import { BaseCachedProvider, ProviderConfig, ExternalApiContext } from './base-cached-provider';
import { ICacheProvider, CacheOptions } from './cache-interfaces';
import { CacheService } from './cache-service';
import OpenAI from 'openai';
import crypto from 'crypto';

export interface OpenAIAnalysisRequest {
  content: string;
  userId?: string;
}

export interface OpenAIImageRequest {
  character: any;
  storyContext: string;
}

export interface OpenAITranscriptionRequest {
  audioBuffer: Buffer;
}

export interface OpenAICompletionRequest {
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export class OpenAICachedProvider extends BaseCachedProvider {
  private openai: OpenAI;

  constructor(config: ProviderConfig) {
    const cacheService = CacheService.getInstance();
    // Create a simple ICacheProvider wrapper around cacheService
    const cacheProvider = {
      async read(key: string) {
        return { hit: false, data: null }; // Temporary implementation
      },
      async write(key: string, data: any, options: any) {
        // Temporary implementation
      },
      async invalidate(key: string) {
        // Temporary implementation
      }
    };
    super(cacheProvider, config);
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  protected generateCacheKey(...args: any[]): string {
    const [requestType, data] = args;
    
    switch (requestType) {
      case 'story-analysis':
        return `story-analysis:${this.generateContentHash(data.content)}`;
      case 'character-image':
        return `character-image:${this.generateContentHash(JSON.stringify(data))}`;
      case 'audio-transcription':
        return `transcription:${this.generateContentHash(data.audioBuffer)}`;
      case 'text-completion':
        return `completion:${this.generateContentHash(JSON.stringify(data.messages))}`;
      default:
        return `openai:${this.generateContentHash(JSON.stringify(args))}`;
    }
  }

  private generateContentHash(content: string | Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  protected async callExternalApi<T>(context: ExternalApiContext, ...args: any[]): Promise<T> {
    const [requestType, data] = args;
    
    console.log(`[OpenAI] Calling external API for ${requestType} (attempt ${context.attempt})`);
    
    switch (requestType) {
      case 'story-analysis':
        return await this.analyzeStoryContent(data) as T;
      case 'character-image':
        return await this.generateCharacterImage(data) as T;
      case 'audio-transcription':
        return await this.transcribeAudio(data) as T;
      case 'text-completion':
        return await this.generateTextCompletion(data) as T;
      default:
        throw new Error(`Unsupported OpenAI request type: ${requestType}`);
    }
  }

  protected async writeToDatabaseFirst<T>(key: string, data: T, options: CacheOptions): Promise<void> {
    // Database write happens first - implemented in storage layer
    console.log(`[OpenAI] Writing to database first: ${key.substring(0, 12)}...`);
    // This will be integrated with storage.ts cache methods
  }

  protected async readFromDatabase<T>(key: string): Promise<T | null> {
    // Database read for cache misses - implemented in storage layer
    console.log(`[OpenAI] Reading from database: ${key.substring(0, 12)}...`);
    return null; // Will be integrated with storage.ts
  }

  protected validateResponse<T>(data: T): boolean {
    if (!data) return false;
    
    // Validate based on response type
    if (typeof data === 'object' && data !== null) {
      const obj = data as any;
      
      // Story analysis validation
      if (obj.title && obj.characters && obj.emotions) {
        return Array.isArray(obj.characters) && Array.isArray(obj.emotions);
      }
      
      // Text completion validation
      if (obj.content && typeof obj.content === 'string' && obj.content.length > 0) {
        return true;
      }
      
      // Image URL validation
      if (typeof obj === 'string' && obj.startsWith('http')) {
        return true;
      }
      
      // Transcription validation (string response)
      if (typeof obj === 'string' && obj.length > 0) {
        return true;
      }
    }
    
    return false;
  }

  // Public methods that use cache-first pattern
  async analyzeStoryWithCache(request: OpenAIAnalysisRequest): Promise<any> {
    return this.executeWithCache(
      'story-analysis',
      { ttl: null, tags: ['story-analysis'] }, // Infinite - same content hash = same analysis forever
      'story-analysis',
      request
    );
  }

  async generateImageWithCache(request: OpenAIImageRequest): Promise<string> {
    return this.executeWithCache(
      'character-image',
      { ttl: null, tags: ['character-image'] }, // Infinite - same character description = same image forever
      'character-image',
      request
    );
  }

  async transcribeAudioWithCache(request: OpenAITranscriptionRequest): Promise<string> {
    return this.executeWithCache(
      'audio-transcription',
      { ttl: null, tags: ['transcription'] }, // Infinite - same audio file = same transcription forever
      'audio-transcription',
      request
    );
  }

  async generateCompletionWithCache(request: OpenAICompletionRequest): Promise<{ content: string }> {
    return this.executeWithCache(
      'text-completion',
      { ttl: null, tags: ['completion'] }, // Infinite - same prompt = same completion forever
      'text-completion',
      request
    );
  }

  // Private methods that call actual OpenAI APIs
  private async analyzeStoryContent(request: OpenAIAnalysisRequest): Promise<any> {
    if (!request.content || request.content.trim().length === 0) {
      throw new Error("Cannot analyze empty story content");
    }

    const systemPrompt = `You are an expert story analyst. Analyze the provided story text and extract detailed information about characters, emotions, themes, and content.

    Respond with valid JSON in this exact format:
    {
      "title": "A compelling, creative title for the story (3-8 words, engaging and descriptive)",
      "characters": [
        {
          "name": "Character name",
          "description": "Brief description of the character",
          "personality": "Personality traits and characteristics",
          "role": "protagonist|antagonist|supporting|narrator|other",
          "appearance": "Physical description if available",
          "traits": ["trait1", "trait2", "trait3"]
        }
      ],
      "emotions": [
        {
          "emotion": "Any emotion detected in the story",
          "intensity": 7,
          "context": "Context where this emotion appears",
          "quote": "Relevant quote from the story if available"
        }
      ],
      "soundEffects": [
        {
          "sound": "Environmental or audio effect (e.g., Rain, Footsteps, Thunder)",
          "intensity": 7,
          "context": "Context where this sound appears",
          "quote": "Relevant quote mentioning the sound"
        }
      ],
      "summary": "2-3 sentence summary of the story",
      "category": "Category like Romance, Adventure, Mystery, Fantasy, Sci-Fi, Drama, Comedy, Horror, Thriller",
      "genre": "Primary genre (Drama, Fantasy, Mystery, Romance, etc.)",
      "subGenre": "Sub-genre if applicable",
      "themes": ["theme1", "theme2", "theme3"],
      "suggestedTags": ["tag1", "tag2", "tag3"],
      "emotionalTags": ["emotional_tag1", "emotional_tag2"],
      "moodCategory": "Overall mood/atmosphere (dark, light, mysterious, hopeful, melancholic, suspenseful, etc.)",
      "ageRating": "general|teen|mature",
      "readingTime": 5,
      "isAdultContent": false
    }
    
    Guidelines:
    - CREATE COMPELLING TITLE: Generate a creative, engaging title that captures the essence of the story (3-8 words)
    - Title should be descriptive but not spoil the plot
    - Extract all significant characters (minimum 1, maximum 8)
    - EXTRACT ALL EMOTIONS: Identify every emotion present in the story, no matter how subtle
    - Use specific emotion names with proper casing (Grief, Sympathy, Empathy, Melancholy, Despair, Hope, Relief, Guilt, Shame, Regret, Acceptance, Compassion, Betrayal, Vulnerability, Longing, Nostalgia, Contentment, etc.)
    - ALWAYS capitalize the first letter of each emotion name (e.g., "Frustration" not "frustration")
    - DO NOT limit emotions to basic categories - be comprehensive and nuanced
    - EXTRACT SOUND EFFECTS: Identify all environmental sounds and audio effects mentioned in the story
    - Use proper casing for sounds (e.g., "Rain", "Footsteps", "Thunder", "Wind", "Laughter", "Crying", "Music", "Birdsong", etc.)
    - ALWAYS capitalize the first letter of each sound effect (e.g., "Footsteps" not "footsteps")
    - Include any sounds that would enhance the story's atmosphere: nature sounds, human sounds, mechanical sounds, etc.
    - Provide accurate intensity ratings (1-10 scale) based on story context
    - Each emotion and sound should have a specific quote and context from the story
    - Determine appropriate category and themes
    - Flag adult content if it contains explicit material, violence, or mature themes`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this story:\n\n${request.content}` }
      ],
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const analysisText = response.choices[0].message.content;
    if (!analysisText) {
      throw new Error("No analysis generated from OpenAI");
    }

    return JSON.parse(analysisText);
  }

  private async generateCharacterImage(request: OpenAIImageRequest): Promise<string> {
    const { character, storyContext } = request;
    
    const prompt = `Create a high-quality digital portrait of ${character.name}, a ${character.role} character from a story. 
    
    Character details:
    - Description: ${character.description}
    - Personality: ${character.personality}
    - Appearance: ${character.appearance || "To be imagined based on personality"}
    - Story context: ${storyContext}
    
    Style: Digital art, portrait orientation, detailed and expressive, suitable for character representation in a story app. Professional quality, clean background.`;

    const response = await this.openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("No image URL generated from OpenAI");
    }

    return imageUrl;
  }

  private async transcribeAudio(request: OpenAITranscriptionRequest): Promise<string> {
    const { audioBuffer } = request;
    
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    // Create temporary file
    const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`);
    await fs.promises.writeFile(tempFilePath, audioBuffer);
    
    try {
      const audioReadStream = fs.createReadStream(tempFilePath);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1"
      });

      if (!transcription.text || transcription.text.trim().length < 5) {
        throw new Error("Audio transcription failed - no speech detected");
      }
      
      return transcription.text;
    } finally {
      // Clean up temporary file
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn("Failed to clean up temp file:", cleanupError);
      }
    }
  }

  private async generateTextCompletion(request: OpenAICompletionRequest): Promise<{ content: string }> {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: request.messages,
      max_tokens: request.maxTokens || 150,
      temperature: request.temperature || 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content || content.trim().length === 0) {
      throw new Error("OpenAI completion failed - no content generated");
    }

    return {
      content: content.trim()
    };
  }

  // Stats and monitoring
  getStats() {
    return {
      ...this.stats,
      provider: 'openai',
      cacheHitRate: this.stats.totalRequests > 0 ? 
        (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%'
    };
  }
}

// Singleton instance
let openaiProvider: OpenAICachedProvider | null = null;

export function getOpenAICachedProvider(): OpenAICachedProvider {
  if (!openaiProvider) {
    openaiProvider = new OpenAICachedProvider({
      name: 'openai',
      timeout: 60000, // 60 seconds
      retryCount: 3,
      retryDelays: [1000, 2000, 4000],
      enableCaching: true,
      defaultTtl: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }
  return openaiProvider;
}