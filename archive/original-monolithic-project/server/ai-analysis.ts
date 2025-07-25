import { getOpenAICachedProvider } from './cache/openai-cached-provider';
import { AUDIO_FORMAT_CONFIG, AUDIO_PROCESSING_CONFIG } from '@shared/config/audio-config';
import { VOICE_RECORDING_CONFIG } from '@shared/config/voice-recording-config';
import { storage } from "./storage";
import { SampleTextCore } from './core/sample-text-core';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

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

const openaiCachedProvider = getOpenAICachedProvider();

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
      "soundEffects": [
        {
          "sound": "Description of the sound effect (e.g., 'dog barking', 'footsteps', 'door slamming', 'scary atmosphere', 'falling', 'explosion')",
          "intensity": 5,
          "context": "Context where this sound appears",
          "quote": "Exact quote from the story mentioning the sound"
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
    - Use specific emotion names with proper casing (Grief, Sympathy, Empathy, Melancholy, Despair, Hope, Relief, Guilt, Shame, Regret, Acceptance, Compassion, Betrayal, Vulnerability, Longing, Nostalgia, Contentment, etc.)
    - ALWAYS capitalize the first letter of each emotion name (e.g., "Frustration" not "frustration")
    - DO NOT limit emotions to basic categories - be comprehensive and nuanced
    - For stories involving death, loss, or tragedy: MUST include grief, sympathy, empathy, melancholy
    - For stories of relationships: include love, betrayal, trust, vulnerability, longing
    - For stories of conflict: include anger, fear, guilt, shame, regret
    - Provide accurate intensity ratings (1-10 scale) based on story context
    - Include multiple emotions - stories typically evoke 3-8 different emotions
    - Each emotion should have a specific quote and context from the story
    - EXTRACT SOUND EFFECTS: Identify ALL sounds including:
      * Explicit sounds mentioned in the story (dog barking, footsteps, door slamming)
      * Situational sounds based on atmosphere (scary scene → 'haunted atmosphere', tense moment → 'suspenseful silence')
      * Action sounds (falling → 'falling noise', explosion → 'blast', crash → 'impact sound')
      * Mood-based sounds (scary → 'eerie atmosphere', happy → 'cheerful ambiance', sad → 'melancholic tone')
      * Environmental ambiance (forest → 'nature sounds', city → 'urban noise', ocean → 'waves')
    - Include environmental sounds (wind, rain, footsteps, doors), animal sounds (barking, meowing, neighing), mechanical sounds (trains, cars), etc.
    - For each sound, think about what onomatopoeia or atmospheric sound would enhance the narration
    - Extract sounds for dramatic actions: falling, crashing, exploding, breaking, hitting, etc.
    - Extract sounds for atmospheric descriptions: scary, peaceful, chaotic, mysterious, etc.
    - For sound effects, include the exact quote where the sound is mentioned or implied
    - Determine appropriate category and themes
    - Flag adult content if it contains explicit material, violence, or mature themes`;

    const analysis: StoryAnalysis = await openaiCachedProvider.analyzeStoryWithCache({
      content,
      userId
    });
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

    // Update sound patterns based on detected sound effects
    if (analysis.soundEffects && analysis.soundEffects.length > 0) {
      await updateSoundPatterns(analysis.soundEffects);
    }

    // Analysis is automatically cached by the cached provider
    
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
    const contentHash = createHash('sha256').update(content).digest('hex');
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
    // Cache operations handled by OpenAI cached provider

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
    // Get OpenAI cached provider for generating professional voice sample texts
    const openaiProvider = getOpenAICachedProvider();
    
    // Process emotions (category 1)
    if (analysis.emotions && analysis.emotions.length > 0) {
      console.log(`📊 Processing ${analysis.emotions.length} emotions from story analysis`);
      
      for (const emotion of analysis.emotions) {
        const emotionName = emotion.emotion.trim();
        
        // Check if emotion already exists in ESM reference
        const existingEmotion = await storage.getEsmRef(1, emotionName);
        
        if (!existingEmotion) {
          console.log(`➕ Adding new emotion to ESM reference: ${emotionName}`);
          
          // Use unified sample text core with graceful failure handling
          let sampleText: string;
          try {
            const sampleResult = await SampleTextCore.generateSampleText({
              emotion: emotionName,
              displayName: emotion.emotion,
              context: emotion.context,
              quote: emotion.quote,
              storyContent: analysis.summary, // Use story summary as context
              intensity: emotion.intensity
            });
            
            sampleText = sampleResult.sampleText;
            console.log(`✅ Generated sample text for ${emotionName} (${sampleResult.source}): "${sampleText.substring(0, 50)}..." (${sampleResult.wordCount} words)`);
          } catch (error) {
            console.error(`❌ Sample text generation failed for ${emotionName}, using fallback:`, error);
            sampleText = `Express the emotion of ${emotionName} in your voice with genuine feeling and natural pacing for high-quality voice cloning.`;
          }
          
          // Create new ESM reference entry for emotion
          await storage.createEsmRef({
            category: 1, // Emotions
            name: emotionName,
            display_name: emotion.emotion,
            sample_text: sampleText,
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
    console.log(`🔊 DEBUG: Sound effects check - soundEffects exists: ${!!analysis.soundEffects}, length: ${analysis.soundEffects?.length || 0}`);
    console.log(`🔊 DEBUG: Sound effects data:`, JSON.stringify(analysis.soundEffects, null, 2));
    
    if (analysis.soundEffects && analysis.soundEffects.length > 0) {
      console.log(`🔊 Processing ${analysis.soundEffects.length} sound effects from story analysis`);
      
      for (const soundEffect of analysis.soundEffects) {
        const soundName = soundEffect.sound.trim();
        
        // Check if sound effect already exists in ESM reference
        const existingSound = await storage.getEsmRef(2, soundName);
        
        if (!existingSound) {
          console.log(`➕ Adding new sound effect to ESM reference: ${soundName}`);
          
          // Use unified sample text core with graceful failure handling
          let sampleText: string;
          try {
            const sampleResult = await SampleTextCore.generateSampleText({
              emotion: soundName,
              displayName: soundEffect.sound,
              context: soundEffect.context,
              quote: soundEffect.quote,
              storyContent: analysis.summary, // Use story summary as context
              intensity: soundEffect.intensity
            });
            
            sampleText = sampleResult.sampleText;
            console.log(`✅ Generated sample text for sound ${soundName} (${sampleResult.source}): "${sampleText.substring(0, 50)}..." (${sampleResult.wordCount} words)`);
          } catch (error) {
            console.error(`❌ Sample text generation failed for sound ${soundName}, using fallback:`, error);
            sampleText = `Create a narrative scene that naturally includes the sound of ${soundName} with natural pacing and clear pronunciation.`;
          }
          
          await storage.createEsmRef({
            category: 2, // Sounds/Environmental Effects
            name: soundName,
            display_name: soundEffect.sound,
            sample_text: sampleText,
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
      
      // Update sound patterns file with newly discovered sound effects
      console.log("🔄 Updating sound patterns file with newly discovered sound effects...");
      await updateSoundPatterns(analysis.soundEffects);
    }

    // Process modulations (category 3) - mood category, genre, subGenre (NOT emotional tags)
    const modulations: string[] = [];
    
    // Collect all modulation items (excluding emotionalTags which are emotions, not modulations)
    if (analysis.moodCategory) {
      modulations.push(analysis.moodCategory);
    }
    if (analysis.genre) {
      modulations.push(analysis.genre);
    }
    if (analysis.subGenre) {
      modulations.push(analysis.subGenre);
    }
    
    // Process emotional tags as emotions (category 1), not modulations
    if (analysis.emotionalTags && Array.isArray(analysis.emotionalTags)) {
      console.log(`📊 Processing ${analysis.emotionalTags.length} emotional tags as emotions`);
      
      for (const emotionalTag of analysis.emotionalTags) {
        const emotionName = emotionalTag.trim();
        
        // Check if emotion already exists in ESM reference
        const existingEmotion = await storage.getEsmRef(1, emotionName);
        
        if (!existingEmotion) {
          console.log(`➕ Adding emotional tag as emotion to ESM reference: ${emotionName}`);
          
          // Use unified sample text core with graceful failure handling
          let sampleText: string;
          try {
            const sampleResult = await SampleTextCore.generateSampleText({
              emotion: emotionName,
              displayName: emotionalTag,
              context: `Emotional tag from story: ${emotionalTag}`,
              storyContent: analysis.summary, // Use story summary as context
              intensity: 5 // Default intensity for emotional tags
            });
            
            sampleText = sampleResult.sampleText;
            console.log(`✅ Generated sample text for emotional tag ${emotionName} (${sampleResult.source}): "${sampleText.substring(0, 50)}..." (${sampleResult.wordCount} words)`);
          } catch (error) {
            console.error(`❌ Sample text generation failed for emotional tag ${emotionName}, using fallback:`, error);
            sampleText = `Express the emotion of ${emotionalTag} in your voice with genuine feeling and natural pacing for high-quality voice cloning.`;
          }
          
          // Create new ESM reference entry for emotional tag as emotion
          await storage.createEsmRef({
            category: 1, // Emotions (not modulations)
            name: emotionName,
            display_name: emotionalTag,
            sample_text: sampleText,
            intensity: 5, // Default intensity for emotional tags
            description: `Emotional tag from story analysis`,
            ai_variations: {
              type: 'emotional_tag',
              source: 'story_analysis'
            },
            created_by: userId
          });
          
          console.log(`✅ Successfully added emotional tag as emotion: ${emotionName}`);
        } else {
          console.log(`🔄 Emotional tag already exists in reference data: ${emotionName}`);
        }
      }
    }
    
    // Process each modulation with OpenAI-generated sample texts
    for (const modulation of modulations) {
      if (modulation) {
        const modulationName = modulation.toLowerCase().trim();
        
        // Check if modulation already exists
        const existingModulation = await storage.getEsmRef(3, modulationName);
        
        if (!existingModulation) {
          console.log(`➕ Adding new modulation to ESM reference: ${modulationName}`);
          
          // Generate professional voice sample text using OpenAI cached provider
          let sampleText: string;
          try {
            const result = await openaiProvider.generateCompletionWithCache({
              messages: [{ 
                role: 'user', 
                content: `Generate a voice recording sample text for the narrative modulation "${modulation}". Be exactly ${VOICE_RECORDING_CONFIG.MIN_WORDS}-${VOICE_RECORDING_CONFIG.MAX_WORDS} words for a ${VOICE_RECORDING_CONFIG.MIN_DURATION}-${VOICE_RECORDING_CONFIG.MAX_DURATION} second recording, natural conversational language that demonstrates how to speak with ${modulation} tone/mood/style. No character names or story references. Focus on vocal delivery instructions.`
              }],
              maxTokens: 100,
              temperature: 0.7
            });
            sampleText = result.content.trim().replace(/^["']|["']$/g, '');
            console.log(`✅ Generated professional modulation sample text for ${modulationName}: "${sampleText.substring(0, 50)}..."`);
          } catch (error) {
            console.error(`⚠️ Failed to generate sample text for ${modulationName}, using fallback: ${error.message}`);
            sampleText = `Express how to narrate with a ${modulation} tone and delivery style`;
          }
          
          await storage.createEsmRef({
            category: 3, // Modulations/Moods
            name: modulationName,
            display_name: modulation,
            sample_text: sampleText,
            intensity: 5,
            description: `Narrative modulation from story analysis`,
            ai_variations: {
              genre: analysis.genre,
              category: analysis.category,
              themes: analysis.themes,
              type: 'modulation'
            },
            created_by: userId
          });
          
          console.log(`✅ Successfully added modulation: ${modulationName}`);
        } else {
          console.log(`🔄 Modulation already exists in reference data: ${modulationName}`);
        }
      }
    }

    console.log("🎉 ESM reference data population completed successfully");
    
  } catch (error) {
    console.error("❌ Error populating ESM reference data:", error);
    // Don't throw error to prevent blocking story analysis
  }
}

/**
 * Update sound patterns file with newly discovered patterns from story analysis
 */
async function updateSoundPatterns(soundEffects: ExtractedSoundEffect[]): Promise<void> {
  try {
    console.log(`🔄 DEBUG updateSoundPatterns: Starting with ${soundEffects.length} sound effects`);
    console.log(`🔄 DEBUG updateSoundPatterns: Sound effects:`, soundEffects.map(se => se.sound));
    
    const soundsPatternsPath = path.join(process.cwd(), 'config/data/soundsPattern.json');
    console.log(`🔄 DEBUG updateSoundPatterns: File path: ${soundsPatternsPath}`);
    
    // Load existing patterns
    let existingPatterns: Array<{ pattern: string; insert: string }> = [];
    try {
      const fileContent = await fs.readFile(soundsPatternsPath, 'utf8');
      existingPatterns = JSON.parse(fileContent);
      console.log(`🔄 DEBUG updateSoundPatterns: Loaded ${existingPatterns.length} existing patterns`);
    } catch (error) {
      console.log('[AI Analysis] No existing sound patterns file found, creating new one');
    }
    
    // Extract new patterns from sound effects
    const newPatterns: Array<{ pattern: string; insert: string }> = [];
    
    for (const soundEffect of soundEffects) {
      console.log(`🔄 DEBUG updateSoundPatterns: Processing sound effect:`, soundEffect);
      console.log(`🔄 DEBUG updateSoundPatterns: soundEffect.sound: "${soundEffect.sound}", soundEffect.quote: "${soundEffect.quote}"`);
      
      if (!soundEffect.sound || !soundEffect.quote) {
        console.log(`🔄 DEBUG updateSoundPatterns: SKIPPING - Missing sound (${!!soundEffect.sound}) or quote (${!!soundEffect.quote})`);
        continue;
      }
      
      console.log(`🔄 DEBUG updateSoundPatterns: Processing sound effect: ${soundEffect.sound}`);
      
      // Create a pattern from the sound description
      const soundDescription = soundEffect.sound.toLowerCase();
      console.log(`🔄 DEBUG updateSoundPatterns: soundDescription: "${soundDescription}"`);
      
      // Convert sound descriptions to patterns and onomatopoeia
      const soundMapping: Record<string, { pattern: string; insert: string }> = {
        // Animal sounds
        'dog barking': { pattern: '\\b(dog|dogs?)\\s+(bark(ing|s|ed)?|woof(ing|s|ed)?)\\b', insert: '(bow bow)' },
        'cat meowing': { pattern: '\\b(cat|cats?)\\s+(meow(ing|s|ed)?|mew(ing|s|ed)?)\\b', insert: '(meow meow)' },
        'bird chirping': { pattern: '\\b(bird(s)?)\\s+(chirp(ing|s|ed)?|sing(ing|s)?|tweet(ing|s|ed)?)\\b', insert: '(tweet tweet)' },
        'horse neighing': { pattern: '\\b(horse(s)?)\\s+(neigh(ing|s|ed)?|whinny(ing|ies|ied)?)\\b', insert: '(neigh)' },
        'cow mooing': { pattern: '\\b(cow(s)?)\\s+(moo(ing|s|ed)?|low(ing|s|ed)?)\\b', insert: '(moo)' },
        'sheep bleating': { pattern: '\\b(sheep|lamb(s)?)\\s+(bleat(ing|s|ed)?|baa(ing|s|ed)?)\\b', insert: '(baa baa)' },
        'owl hooting': { pattern: '\\b(owl(s)?)\\s+(hoot(ing|s|ed)?|call(ing|s|ed)?)\\b', insert: '(hoo hoo)' },
        
        // Movement sounds
        'footsteps': { pattern: '\\b(footstep(s)?|step(s|ping|ped)?|walk(ing|s|ed)?)\\b', insert: '(tok tok tok)' },
        'running': { pattern: '\\b(run(ning|s)?|sprint(ing|s|ed)?|dash(ing|es|ed)?)\\b', insert: '(tap tap tap tap)' },
        'falling': { pattern: '\\b(fall(ing|s)?|fell|drop(ping|ped|s)?|plummet(ing|ed|s)?)\\b', insert: '(damal)' },
        
        // Object sounds
        'door slamming': { pattern: '\\b(door|doors?)\\s+(slam(ming|s|med)?|bang(ing|s|ed)?)\\b', insert: '(SLAM!)' },
        'door opening': { pattern: '\\b(door|doors?)\\s+(open(ing|s|ed)?|creak(ing|s|ed)?)\\b', insert: '(creeeeak)' },
        'glass breaking': { pattern: '\\b(glass|window)\\s+(break(ing|s)?|shatter(ing|s|ed)?|smash(ing|es|ed)?)\\b', insert: '(CRASH!)' },
        'bell ringing': { pattern: '\\b(bell(s)?)\\s+(ring(ing|s)?|chim(ing|es|ed)?|toll(ing|s|ed)?)\\b', insert: '(ding dong)' },
        'clock ticking': { pattern: '\\b(clock|watch)\\s+(tick(ing|s|ed)?|tock(ing|s|ed)?)\\b', insert: '(tick tock)' },
        'phone ringing': { pattern: '\\b(phone|telephone)\\s+(ring(ing|s)?|buzz(ing|es|ed)?)\\b', insert: '(ring ring)' },
        
        // Nature sounds
        'wind blowing': { pattern: '\\b(wind|breeze)\\s+(blow(ing|s)?|howl(ing|s|ed)?|whistle(ing|d)?)\\b', insert: '(whoooosh)' },
        'rain falling': { pattern: '\\b(rain(ing|s|ed)?|drizzl(ing|e)|pour(ing|s|ed)?)\\b', insert: '(drip drop drip)' },
        'thunder': { pattern: '\\b(thunder(ing|s|ed)?|boom(ing|s|ed)?)\\b', insert: '(BOOM!)' },
        'waves crashing': { pattern: '\\b(wave(s)?)\\s+(crash(ing|es|ed)?|break(ing|s)?|pound(ing|s|ed)?)\\b', insert: '(splash splash)' },
        'fire crackling': { pattern: '\\b(fire|flame(s)?)\\s+(crackl(ing|es|ed)?|burn(ing|s|ed)?)\\b', insert: '(fsssshhh crackle)' },
        'water dripping': { pattern: '\\b(water|faucet|tap)\\s+(drip(ping|s|ped)?|leak(ing|s|ed)?)\\b', insert: '(drip drop)' },
        
        // Vehicle sounds
        'car engine': { pattern: '\\b(car|engine|motor)\\s+(start(ing|s|ed)?|revv?(ing|s|ed)?|roar(ing|s|ed)?)\\b', insert: '(vroom vroom)' },
        'train': { pattern: '\\b(train|locomotive|railway)\\b', insert: '(Koooo tuh chuk tuk chuk)' },
        
        // Action sounds
        'explosion': { pattern: '\\b(explo(sion|de|ding)|blast(ing|ed|s)?|bomb|detonate)\\b', insert: '(Doooom Dubbb)' },
        'crash': { pattern: '\\b(crash(ing|es|ed)?|collid(e|ing|ed)|impact(ing|ed|s)?)\\b', insert: '(CRASH!)' },
        'hitting': { pattern: '\\b(hit(ting|s)?|punch(ing|es|ed)?|strike|smack(ing|ed|s)?)\\b', insert: '(whack!)' },
        'breaking': { pattern: '\\b(break(ing|s)?|snap(ping|ped|s)?|crack(ing|ed|s)?)\\b', insert: '(crack!)' },
        
        // Emotional/Situational sounds
        'scary atmosphere': { pattern: '\\b(scary|spooky|eerie|haunted|creepy|terrifying|frightening)\\b', insert: '(oooooooo spooky wind)' },
        'laughing': { pattern: '\\b(laugh(ing|s|ed)?|giggl(ing|e|ed)?|chuckl(ing|e|ed)?)\\b', insert: '(ha ha ha)' },
        'crying': { pattern: '\\b(cry(ing)?|weep(ing)?|sob(bing|s|bed)?|tear(s)?)\\b', insert: '(ummmm ummmmm)' },
        'crowd noise': { pattern: '\\b(crowd(ed)?|people|gathering|audience|mob)\\b', insert: '(murmur murmur)' },
        
        // Atmospheric sounds
        'peaceful': { pattern: '\\b(peaceful|calm|serene|tranquil|quiet)\\b', insert: '(soft breeze)' },
        'tense': { pattern: '\\b(tense|suspens(e|eful)|anxious|nervous)\\b', insert: '(silence...)' },
        'chaotic': { pattern: '\\b(chaos|chaotic|pandemonium|mayhem|disorder)\\b', insert: '(crash bang boom)' },
        'mysterious': { pattern: '\\b(mysterious|mystery|enigmatic|puzzling|strange)\\b', insert: '(whooooo)' }
      };
      
      // Check if we have a mapping for this sound using flexible matching
      let patternFound = false;
      for (const [key, mapping] of Object.entries(soundMapping)) {
        // First try exact match
        if (soundDescription === key) {
          const exists = existingPatterns.some(p => p.pattern === mapping.pattern);
          console.log(`🔄 DEBUG updateSoundPatterns: Exact match for "${key}" - pattern exists: ${exists}`);
          console.log(`🔄 DEBUG updateSoundPatterns: Looking for pattern: "${mapping.pattern}"`);
          if (!exists) {
            newPatterns.push(mapping);
            console.log(`[AI Analysis] Added new sound pattern (exact): ${key} -> ${mapping.insert}`);
          } else {
            console.log(`🔄 DEBUG updateSoundPatterns: SKIPPED - Pattern already exists for: ${key}`);
          }
          patternFound = true;
          break;
        }
        
        // Then try contains match
        if (soundDescription.includes(key)) {
          const exists = existingPatterns.some(p => p.pattern === mapping.pattern);
          if (!exists) {
            newPatterns.push(mapping);
            console.log(`[AI Analysis] Added new sound pattern (contains): ${key} -> ${mapping.insert}`);
          }
          patternFound = true;
          break;
        }
        
        // Finally try key words match for flexible matching
        const keyWords = key.split(' ');
        const descWords = soundDescription.split(' ');
        const hasMatchingWords = keyWords.some(keyWord => 
          descWords.some(descWord => 
            descWord.includes(keyWord) || keyWord.includes(descWord)
          )
        );
        
        if (hasMatchingWords) {
          const exists = existingPatterns.some(p => p.pattern === mapping.pattern);
          if (!exists) {
            newPatterns.push(mapping);
            console.log(`[AI Analysis] Added new sound pattern (word match): ${key} -> ${mapping.insert}`);
          }
          patternFound = true;
          break;
        }
      }
      
      // If no specific mapping found, try to create a generic one
      if (!patternFound) {
        // Extract the main sound word (e.g., "barking" from "dog barking loudly")
        const soundWords = soundDescription.split(' ');
        const actionWord = soundWords.find(word => 
          word.endsWith('ing') || word.endsWith('ed') || word.endsWith('s')
        );
        
        if (actionWord) {
          const baseWord = actionWord.replace(/(ing|ed|s)$/, '');
          const pattern = `\\b${baseWord}(ing|s|ed)?\\b`;
          const insert = `(${baseWord}!)`;
          
          const exists = existingPatterns.some(p => p.pattern === pattern);
          if (!exists) {
            newPatterns.push({ pattern, insert });
            console.log(`[AI Analysis] Added generic sound pattern: ${baseWord} -> ${insert}`);
          }
        }
      }
    }
    
    // Merge new patterns with existing ones
    console.log(`🔄 DEBUG updateSoundPatterns: Found ${newPatterns.length} new patterns to add`);
    
    if (newPatterns.length > 0) {
      const mergedPatterns = [...existingPatterns, ...newPatterns];
      
      // Sort patterns by length (longer patterns first)
      mergedPatterns.sort((a, b) => b.pattern.length - a.pattern.length);
      
      console.log(`🔄 DEBUG updateSoundPatterns: Writing ${mergedPatterns.length} total patterns to file`);
      
      // Write back to file
      await fs.writeFile(soundsPatternsPath, JSON.stringify(mergedPatterns, null, 2));
      console.log(`[AI Analysis] Updated sound patterns file with ${newPatterns.length} new patterns`);
    } else {
      console.log(`🔄 DEBUG updateSoundPatterns: No new patterns to add - file not modified`);
    }
    
  } catch (error) {
    console.error('[AI Analysis] Error updating sound patterns:', error);
    // Don't throw - this is not critical for story analysis
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