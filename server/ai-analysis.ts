import OpenAI from "openai";
import { getCachedAnalysis, cacheAnalysis } from './content-cache';

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

export async function analyzeStoryContent(content: string): Promise<StoryAnalysis> {
  // Try cache first, fallback to source with cache update
  try {
    const cachedAnalysis = getCachedAnalysis(content);
    if (cachedAnalysis) {
      console.log("Using cached story analysis");
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
      "themes": ["theme1", "theme2", "theme3"],
      "suggestedTags": ["tag1", "tag2", "tag3"],
      "isAdultContent": false
    }

    Guidelines:
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
      const prompt = `Create a high-quality digital portrait of ${character.name}, a ${character.role} character from a story. 
      
      Character details:
      - Description: ${character.description}
      - Personality: ${character.personality}
      - Appearance: ${character.appearance || "To be imagined based on personality"}
      - Story context: ${storyContext}
      
      Style: Digital art, portrait orientation, detailed and expressive, suitable for character representation in a story app. Professional quality, clean background.`;

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });

      return response.data?.[0]?.url || generateRoleBasedAvatar(character);
    } catch (error: any) {
      console.error("Character image generation error:", error);
      
      // Always use avatar fallback for any API error to prevent blocking story creation
      return generateRoleBasedAvatar(character);
    }
  });
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    // Create a temporary file from buffer
    const tempFile = new File([audioBuffer], "audio.mp3", { type: "audio/mpeg" });
    
    const transcription = await openai.audio.transcriptions.create({
      file: tempFile,
      model: "whisper-1",
      language: "en",
    });

    return transcription.text;
  } catch (error) {
    console.error("Audio transcription error:", error);
    throw new Error("Failed to transcribe audio");
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