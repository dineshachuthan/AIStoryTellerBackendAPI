import OpenAI from "openai";
import { getCachedAnalysis, cacheAnalysis } from './content-cache';
import { AUDIO_FORMAT_CONFIG, AUDIO_PROCESSING_CONFIG } from '@shared/audio-config';
import { storage } from "./storage";
import { ContentHashService } from './content-hash-service';

// Audio format detection using configuration
function detectAudioFormat(buffer: Buffer): string {
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

export interface StoryAnalysis {
  title: string; // AI-generated title for the story
  characters: ExtractedCharacter[];
  emotions: ExtractedEmotion[];
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

  // Try cache first, fallback to source with cache update
  try {
    const cachedAnalysis = getCachedAnalysis(content);
    if (cachedAnalysis) {
      console.log("Using cached story analysis");
      // Still populate ESM reference data even for cached analysis
      if (userId) {
        await populateEsmReferenceData(cachedAnalysis, userId);
      }
      return cachedAnalysis;
    }
  } catch (cacheError) {
    console.warn("Cache read failed, generating analysis from source:", cacheError);
  }

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
      "soundEffects": [
        {
          "sound": "Environmental or audio effects mentioned in the story (dog barking, train whistling, rain falling, door slamming, footsteps, car engine, bird chirping, wind howling, ocean waves, thunder, music playing, phone ringing, etc.)",
          "intensity": 6,
          "context": "Where this sound appears in the story",
          "quote": "Quote from story mentioning this sound"
        }
      ],
      "summary"
      "category": "Category like Romance, Adventure, Mystery, Fantasy, Sci-Fi, Drama, Comedy, Horror, Thriller",
      "genre": "Primary genre (Drama, Fantasy, Mystery, Romance, etc.)",
      "subGenre": "Sub-genre if applicable",
      ],
      "soundEffects": [
        {
          "sound": "Environmental or audio effects mentioned in the story (dog barking, train whistling, rain falling, door slamming, footsteps, car engine, bird chirping, wind howling, ocean waves, thunder, music playing, phone ringing, etc.)",
          "intensity": 6,
          "context": "Where this sound appears in the story",
          "quote": "Quote from story mentioning this sound"
        }
      ],
      "summary"
      "category": "Category like Romance, Adventure, Mystery, Fantasy, Sci-Fi, Drama, Comedy, Horror, Thriller",
      "genre": "Primary genre (Drama, Fantasy, Mystery, Romance, etc.)",
      "subGenre": "Sub-genre if applicable",
