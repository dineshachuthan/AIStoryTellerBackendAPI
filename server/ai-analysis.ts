import OpenAI from "openai";
import { getCachedAnalysis, cacheAnalysis } from './cache/cache-service';
import { AUDIO_FORMAT_CONFIG, AUDIO_PROCESSING_CONFIG } from '@shared/audio-config';
import { storage } from "./storage";
import { createHash } from 'crypto';

// Audio format detection using configuration
export function detectAudioFormat(buffer: Buffer): string {
  const header = buffer.subarray(0, 12);
  
  for (const format of AUDIO_FORMAT_CONFIG) {
    let matches = true;
    
    for (const signature of format.signatures) {
      let signatureBuffer: Buffer;
      if (typeof signature.pattern === 'string') {
        signatureBuffer = Buffer.from(signature.pattern);
      } else {
        // Convert Uint8Array to Buffer for server-side processing
        signatureBuffer = Buffer.from(signature.pattern);
      }
      
      const headerSection = header.subarray(signature.offset, signature.offset + signatureBuffer.length);
      
      if (!headerSection.equals(signatureBuffer)) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      console.log(`Audio format detected: ${format.name} (.${format.extension})`);
      return format.extension;
    }
  }
  
  console.log('Unknown audio format, using default. Header:', header.toString('hex'));
  return AUDIO_PROCESSING_CONFIG.defaultFormat;
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

export interface ExtractedCharacter {
  name: string;
  description: string;
  personality: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'narrator' | 'other';
  appearance?: string;
  traits: string[];
  assignedVoice?: string; // OpenAI voice assignment (alloy, echo, fable, nova, onyx, shimmer)
  voiceSampleId?: number; // User voice sample ID if assigned
}

export interface ExtractedEmotion {
  emotion: string; // Dynamic - AI can detect any emotion from the story
  intensity: number; // 1-10
  context: string;
  quote?: string;
}

export interface ExtractedSoundEffect {
  sound: string; // Environmental or audio effects mentioned in the story
  intensity: number; // 1-10
  context: string;
  quote?: string;
}

export interface StoryAnalysis {
  title: string; // AI-generated title for the story
  characters: ExtractedCharacter[];
  emotions: ExtractedEmotion[];
  soundEffects?: ExtractedSoundEffect[]; // Environmental and audio effects from the story
  summary: string;
  category: string;
  genre: string;
  subGenre?: string;
  themes: string[];
  suggestedTags: string[];
  emotionalTags: string[];
  moodCategory: string;
  ageRating: 'general' | 'teen' | 'mature';
  readingTime: number; // estimated minutes
  isAdultContent: boolean;
}

export async function analyzeStoryContent(content: string, userId?: string): Promise<StoryAnalysis> {
  // Check for empty content - never analyze empty stories
  if (!content || content.trim().length === 0) {
    throw new Error("Cannot analyze empty story content. Please add text to your story first.");
  }

  // Cache functionality will be implemented with unified cache architecture
  // For now, proceed directly to analysis generation
  // Direct AI analysis generation without cache

  // Cache miss/error - generate from source and update cache
  try {
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
          "emotion": "Any emotion detected in the story (grief, sympathy, empathy, melancholy, despair, hope, relief, guilt, shame, regret, acceptance, compassion, love, fear, anger, sadness, joy, etc.)",
          "intensity": 7,
          "context": "Context where this emotion appears",
          "quote": "Relevant quote from the story if available"
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
    - Use evocative language that matches the story's tone and genre
    - Examples: "The Last Dance", "Shadows of Tomorrow", "A Mother's Choice", "The Secret Garden"
    - Extract all significant characters (minimum 1, maximum 8)
    - EXTRACT ALL EMOTIONS: Identify every emotion present in the story, no matter how subtle
    - Use specific emotion names (grief, sympathy, empathy, melancholy, despair, hope, relief, guilt, shame, regret, acceptance, compassion, betrayal, vulnerability, longing, nostalgia, contentment, etc.)
    - DO NOT limit emotions to basic categories - be comprehensive and nuanced
    - For stories involving death, loss, or tragedy: MUST include grief, sympathy, empathy, melancholy
    - For stories of relationships: include love, betrayal, trust, vulnerability, longing
    - For stories of conflict: include anger, fear, guilt, shame, regret
    - Provide accurate intensity ratings (1-10 scale) based on story context
    - Include multiple emotions - stories typically evoke 3-8 different emotions
    - Each emotion should have a specific quote and context from the story
    - Determine appropriate category and themes
    - Flag adult content if it contains explicit material, violence, or mature themes`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Analyze this story:\n\n${content}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const analysisText = response.choices[0].message.content;
    if (!analysisText) {
      throw new Error("No analysis generated from OpenAI");
    }

    console.log("Raw OpenAI Analysis Response:", analysisText);
    const analysis: StoryAnalysis = JSON.parse(analysisText);
    console.log("Parsed Analysis - Emotions found:", analysis.emotions?.length || 0, analysis.emotions);
    
    // Assign voices to characters during analysis phase
    analysis.characters = analysis.characters.map(character => {
      const assignedVoice = assignVoiceToCharacter(character);
      console.log(`Assigning voice "${assignedVoice}" to character "${character.name}"`);
      return {
        ...character,
        assignedVoice
      };
    });

    // Populate ESM reference data from new analysis
    if (userId) {
      await populateEsmReferenceData(analysis, userId);
    }

    // Update cache with new analysis
    try {
      cacheAnalysis(content, analysis);
      console.log("Successfully cached story analysis");
    } catch (cacheUpdateError) {
      console.warn("Failed to update analysis cache:", cacheUpdateError);
    }
    
    return analysis;
  } catch (error) {
    console.error("Story analysis error:", error);
    
    // Check if it's a quota/rate limit error
    if ((error as any)?.status === 429 || (error as any)?.code === 'insufficient_quota') {
      throw new Error("OpenAI API quota exceeded. Please check your billing details or try again later.");
    }
    
    // Check if it's an authentication error
    if ((error as any)?.status === 401) {
      throw new Error("OpenAI API key is invalid. Please check your API key configuration.");
    }
    
    // For other errors, throw a generic message
    throw new Error("Story analysis failed. Please try again or contact support.");
  }
}

// Rate limiting queue to handle DALL-E API limits
class ImageGenerationQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly minInterval = 3000; // 3 seconds between requests
  private readonly maxRetries = 2;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
      }
      
      const task = this.queue.shift();
      if (task) {
        await task();
        this.lastRequestTime = Date.now();
      }
    }
    
    this.processing = false;
  }
}

const imageQueue = new ImageGenerationQueue();

function generateRoleBasedAvatar(character: ExtractedCharacter): string {
  const roleColors = {
    protagonist: 'b6e3f4',
    antagonist: 'fecaca', 
    supporting: 'c0aede',
    narrator: 'd1d4f9',
    other: 'fed7aa'
  };
  
  const backgroundColor = roleColors[character.role] || 'e5e7eb';
  const seed = encodeURIComponent(character.name + character.role);
  
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${backgroundColor}&style=circle`;
}

export async function generateCharacterImage(character: ExtractedCharacter, storyContext: string): Promise<string> {
  return imageQueue.add(async () => {
    try {
      // Use OpenAI Cached Provider - it handles all cache decisions
      const { getOpenAICachedProvider } = await import('./cache/openai-cached-provider');
      const openaiProvider = getOpenAICachedProvider();
      
      const imageUrl = await openaiProvider.generateImageWithCache({
        character,
        storyContext
      });

      // Cache the generated image locally using existing image service
      try {
        const { imageAssetService } = await import('./image-asset-service');
        const cachedAsset = await imageAssetService.cacheImage(imageUrl, `character-${character.name}`);
        
        // Return the local cached URL
        const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
          `https://${process.env.REPLIT_DEV_DOMAIN}` : 
          'http://localhost:5000';
        
        return imageAssetService.getAbsoluteUrl(cachedAsset.publicUrl, baseUrl);
      } catch (cacheError) {
        console.warn('Failed to cache character image locally, using OpenAI URL:', cacheError);
        return imageUrl;
      }
    } catch (error: any) {
      console.error("Character image generation error:", error);
      
      // Always use avatar fallback for any API error to prevent blocking story creation
      return generateRoleBasedAvatar(character);
    }
  });
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  console.log("Starting audio transcription, buffer size:", audioBuffer.length);
  
  try {
    // Use OpenAI Cached Provider - it handles all cache decisions
    const { getOpenAICachedProvider } = await import('./cache/openai-cached-provider');
    const openaiProvider = getOpenAICachedProvider();
    
    const transcription = await openaiProvider.transcribeAudioWithCache({
      audioBuffer
    });
    
    return transcription;
  } catch (error) {
    console.error("Audio transcription error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorObject: error
    });
    
    // Provide user-friendly error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes('invalid_request_error')) {
        throw new Error('Audio format is not supported. Please try recording again or use a different audio format.');
      } else if (error.message.includes('rate_limit')) {
        throw new Error('Too many transcription requests. Please wait a moment and try again.');
      } else if (error.message.includes('insufficient_quota')) {
        throw new Error('Audio transcription service is temporarily unavailable. Please try again later.');
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        throw new Error('Network connection issue. Please check your internet connection and try again.');
      } else {
        throw new Error(`Audio transcription failed: ${error.message}`);
      }
    } else {
      throw new Error('Audio transcription failed due to an unexpected error. Please try again.');
    }
  }
}

/**
 * Enhanced story analysis with database-backed content hash cache invalidation
 * Uses SHA256 content hashing to detect story content changes and avoid unnecessary API calls
 */
export async function analyzeStoryContentWithHashCache(storyId: number, content: string, userId: string): Promise<StoryAnalysis> {
  // Check for empty content - never analyze empty stories
  if (!content || content.trim().length === 0) {
    throw new Error("Cannot analyze empty story content. Please add text to your story first.");
  }

  console.log(`[Content Hash Cache] Checking analysis cache for story ${storyId}, content length: ${content.length} characters`);

  try {
    // Check database cache with content hash validation
    const { analysis, needsRegeneration } = await storage.getStoryAnalysisWithContentCheck(storyId, 'narrative', content);
    
    if (analysis && !needsRegeneration) {
      console.log(`[Content Hash Cache] Using cached analysis for story ${storyId} - content unchanged`);
      
      // Still populate ESM reference data even for cached analysis
      const parsedAnalysis = JSON.parse(analysis.analysisData as string) as StoryAnalysis;
      await populateEsmReferenceData(parsedAnalysis, userId);
      
      return parsedAnalysis;
    }

    if (analysis && needsRegeneration) {
      console.log(`[Content Hash Cache] Content changed for story ${storyId} - regenerating analysis`);
    } else {
      console.log(`[Content Hash Cache] No cached analysis found for story ${storyId} - generating fresh analysis`);
    }

  } catch (error) {
    console.warn(`[Content Hash Cache] Database cache check failed for story ${storyId}:`, error);
  }

  // Generate fresh analysis using OpenAI Cached Provider
  console.log(`[Content Hash Cache] Calling OpenAI Cached Provider for story ${storyId} analysis`);
  
  try {
    // Use OpenAI Cached Provider - it handles all cache decisions
    const { getOpenAICachedProvider } = await import('./cache/openai-cached-provider');
    const openaiProvider = getOpenAICachedProvider();
    
    const analysis = await openaiProvider.analyzeStoryWithCache({
      content,
      userId
    });

    console.log(`[Content Hash Cache] OpenAI analysis completed for story ${storyId}, characters: ${analysis.characters?.length || 0}, emotions: ${analysis.emotions?.length || 0}`);
    
    // Assign voices to characters during analysis phase
    analysis.characters = analysis.characters.map(character => {
      const assignedVoice = assignVoiceToCharacter(character);
      console.log(`Assigning voice "${assignedVoice}" to character "${character.name}"`);
      return {
        ...character,
        assignedVoice
      };
    });

    // Store analysis in database with content hash
    const contentHash = ContentHashService.generateContentHash(content);
    console.log(`[Content Hash Cache] Generated content hash for story ${storyId}: ${contentHash.substring(0, 12)}...`);
    
    try {
      await storage.createStoryAnalysisWithContentHash({
        storyId,
        analysisType: 'narrative',
        analysisData: JSON.stringify(analysis),
        generatedBy: userId
      }, contentHash);
      
      console.log(`[Content Hash Cache] Successfully cached analysis for story ${storyId} with content hash`);
    } catch (dbError) {
      console.warn(`[Content Hash Cache] Failed to cache analysis in database for story ${storyId}:`, dbError);
    }

    // Update file-based cache as fallback
    try {
      cacheAnalysis(content, analysis);
      console.log(`[Content Hash Cache] Updated file-based cache for story ${storyId}`);
    } catch (cacheUpdateError) {
      console.warn(`[Content Hash Cache] Failed to update file cache for story ${storyId}:`, cacheUpdateError);
    }

    // Populate ESM reference data from new analysis
    await populateEsmReferenceData(analysis, userId);
    
    return analysis;
    
  } catch (error) {
    console.error(`[Content Hash Cache] Story analysis error for story ${storyId}:`, error);
    
    // Check if it's a quota/rate limit error
    if ((error as any)?.status === 429 || (error as any)?.code === 'insufficient_quota') {
      throw new Error("OpenAI API quota exceeded. Please check your billing details or try again later.");
    }
    
    // Check if it's an authentication error
    if ((error as any)?.status === 401) {
      throw new Error("OpenAI API key is invalid. Please check your API key configuration.");
    }
    
    // For other errors, throw a generic message
    throw new Error("Story analysis failed. Please try again or contact support.");
  }
}

// Simple voice assignment function that rotates through available voices
function assignVoiceToCharacter(character: ExtractedCharacter): string {
  const availableVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  
  // Use character name hash to consistently assign same voice to same character
  let hash = 0;
  for (let i = 0; i < character.name.length; i++) {
    const char = character.name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const voiceIndex = Math.abs(hash) % availableVoices.length;
  const assignedVoice = availableVoices[voiceIndex];
  
  console.log(`Assigning voice "${assignedVoice}" to character "${character.name}"`);
  return assignedVoice;
}

// Function to populate ESM reference data from story analysis
async function populateEsmReferenceData(analysis: StoryAnalysis, userId: string): Promise<void> {
  console.log("🎭 Starting ESM reference data population for story analysis...");
  
  try {
    // Process emotions (category 1)
    if (analysis.emotions && analysis.emotions.length > 0) {
      console.log(`📊 Processing ${analysis.emotions.length} emotions from story analysis`);
      
      for (const emotion of analysis.emotions) {
        const emotionName = emotion.emotion.toLowerCase().trim();
        
        // Check if emotion already exists in ESM reference
        const existingEmotion = await storage.getEsmRef(1, emotionName);
        
        if (!existingEmotion) {
          console.log(`➕ Adding new emotion to ESM reference: ${emotionName}`);
          
          // Create new ESM reference entry for emotion
          await storage.createEsmRef({
            category: 1, // Emotions
            name: emotionName,
            display_name: emotion.emotion,
            sample_text: emotion.quote || `Express the emotion of ${emotion.emotion}`,
            intensity: emotion.intensity,
            description: emotion.context,
            ai_variations: {
              contexts: [emotion.context],
              quotes: emotion.quote ? [emotion.quote] : [],
              intensityRange: [emotion.intensity, emotion.intensity]
            },
            created_by: userId
          });
          
          console.log(`✅ Successfully added emotion: ${emotionName}`);
        } else {
          console.log(`🔄 Emotion already exists in reference data: ${emotionName}`);
        }
      }
    }

    // Process sound effects as sounds (category 2)
    if (analysis.soundEffects && analysis.soundEffects.length > 0) {
      console.log(`🔊 Processing ${analysis.soundEffects.length} sound effects from story analysis`);
      
      for (const soundEffect of analysis.soundEffects) {
        const soundName = soundEffect.sound.toLowerCase().trim();
        
        // Check if sound effect already exists in ESM reference
        const existingSound = await storage.getEsmRef(2, soundName);
        
        if (!existingSound) {
          console.log(`➕ Adding new sound effect to ESM reference: ${soundName}`);
          
          await storage.createEsmRef({
            category: 2, // Sounds/Environmental Effects
            name: soundName,
            display_name: soundEffect.sound,
            sample_text: soundEffect.quote || `Audio effect: ${soundEffect.sound}`,
            intensity: soundEffect.intensity,
            description: soundEffect.context,
            ai_variations: {
              contexts: [soundEffect.context],
              quotes: soundEffect.quote ? [soundEffect.quote] : [],
              intensityRange: [soundEffect.intensity, soundEffect.intensity]
            },
            created_by: userId
          });
          
          console.log(`✅ Successfully added sound effect: ${soundName}`);
        } else {
          console.log(`🔄 Sound effect already exists in reference data: ${soundName}`);
        }
      }
    }

    // Process mood category as modulation (category 3)
    if (analysis.moodCategory) {
      const moodName = analysis.moodCategory.toLowerCase().trim();
      
      // Check if mood already exists
      const existingMood = await storage.getEsmRef(3, moodName);
      
      if (!existingMood) {
        console.log(`➕ Adding new mood to ESM reference: ${moodName}`);
        
        await storage.createEsmRef({
          category: 3, // Modulations/Moods
          name: moodName,
          display_name: analysis.moodCategory,
          sample_text: `Express how do you narrate a ${analysis.moodCategory} expression in a story`,
          intensity: 5,
          description: `Overall mood from story analysis`,
          ai_variations: {
            genre: analysis.genre,
            category: analysis.category,
            themes: analysis.themes
          },
          created_by: userId
        });
        
        console.log(`✅ Successfully added mood: ${moodName}`);
      }
    }

    console.log("🎉 ESM reference data population completed successfully");
    
  } catch (error) {
    console.error("❌ Error populating ESM reference data:", error);
    // Don't throw error to prevent blocking story analysis
  }
}

// Helper function to extract voice traits from character data
function extractVoiceTraits(character: ExtractedCharacter): string[] {
  const traits: string[] = [];
  
  // Common voice descriptors to look for
  const voiceKeywords = [
    'deep', 'high', 'low', 'soft', 'harsh', 'gentle', 'rough', 'smooth',
    'melodic', 'gravelly', 'whispered', 'booming', 'squeaky', 'husky',
    'crisp', 'muffled', 'clear', 'raspy', 'throaty', 'nasal', 'breathy'
  ];
  
  const textToAnalyze = [
    character.description,
    character.personality,
    character.appearance || '',
    character.traits.join(' ')
  ].join(' ').toLowerCase();
  
  // Find voice-related keywords
  for (const keyword of voiceKeywords) {
    if (textToAnalyze.includes(keyword)) {
      traits.push(keyword);
    }
  }
  
  // Add role-based voice characteristics
  const roleVoiceMap: Record<string, string[]> = {
    'protagonist': ['confident', 'clear'],
    'antagonist': ['menacing', 'cold'],
    'supporting': ['friendly', 'warm'],
    'narrator': ['authoritative', 'steady'],
    'other': ['distinctive', 'memorable']
  };
  
  const roleTraits = roleVoiceMap[character.role] || [];
  traits.push(...roleTraits);
  
  return [...new Set(traits)]; // Remove duplicates
}