import OpenAI from "openai";

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
  emotion: 'happy' | 'sad' | 'angry' | 'fear' | 'surprise' | 'disgust' | 'love' | 'excitement' | 'anxiety' | 'grief' | 'sympathy' | 'empathy' | 'melancholy' | 'despair' | 'hope' | 'relief' | 'guilt' | 'shame' | 'pride' | 'envy' | 'jealousy' | 'contentment' | 'longing' | 'nostalgia' | 'regret' | 'acceptance' | 'betrayal' | 'trust' | 'vulnerability' | 'compassion' | 'other';
  intensity: number; // 1-10
  context: string;
  quote?: string;
}

export interface StoryAnalysis {
  characters: ExtractedCharacter[];
  emotions: ExtractedEmotion[];
  summary: string;
  category: string;
  themes: string[];
  suggestedTags: string[];
  isAdultContent: boolean;
}

export async function analyzeStoryContent(content: string): Promise<StoryAnalysis> {
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
          "emotion": "happy|sad|angry|fear|surprise|disgust|love|excitement|anxiety|grief|sympathy|empathy|melancholy|despair|hope|relief|guilt|shame|pride|envy|jealousy|contentment|longing|nostalgia|regret|acceptance|betrayal|trust|vulnerability|compassion|other",
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
    - Identify ALL emotions throughout the story with their context - be comprehensive
    - Pay special attention to complex emotions: grief, sympathy, empathy, melancholy, despair, hope, relief, guilt, regret, acceptance, compassion
    - For stories involving death, loss, or tragedy, ensure emotions like grief, sympathy, empathy are captured
    - Provide accurate intensity ratings (1-10 scale) based on story context
    - Include multiple emotions if the story evokes different feelings
    - Determine appropriate category and themes
    - Flag adult content if it contains explicit material, violence, or mature themes
    - Be thorough but concise in descriptions`;

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

    const analysis: StoryAnalysis = JSON.parse(analysisText);
    
    // Assign voices to characters during analysis phase
    analysis.characters = analysis.characters.map(character => {
      const assignedVoice = assignVoiceToCharacter(character);
      console.log(`Assigning voice "${assignedVoice}" to character "${character.name}"`);
      return {
        ...character,
        assignedVoice
      };
    });
    
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

// Advanced voice assignment function that considers multiple character attributes
function assignVoiceToCharacter(character: ExtractedCharacter): string {
  // Analyze character traits and description for voice selection
  const description = character.description.toLowerCase();
  const personality = character.personality.toLowerCase();
  const traits = character.traits.map(t => t.toLowerCase());
  const name = character.name.toLowerCase();
  
  // Direct character mapping for common story archetypes
  const directMappings: { [key: string]: string } = {
    'mother': 'nova',        // Female maternal voice
    'mom': 'nova',
    'mama': 'nova',
    'boy': 'echo',           // Young male voice
    'the boy': 'echo',
    'young boy': 'echo',
    'little boy': 'echo',
    'father': 'fable',       // Mature male voice
    'dad': 'fable',
    'papa': 'fable',
    'girl': 'shimmer',       // Young female voice
    'little girl': 'shimmer',
    'young girl': 'shimmer',
    'king': 'onyx',          // Authoritative male voice
    'queen': 'nova',         // Authoritative female voice
    'priest': 'fable',       // Wise male voice
    'soldier': 'echo',       // Strong young male voice
    'dog': 'echo',           // Friendly energetic voice
    'cat': 'shimmer',        // Graceful voice
    'lion': 'onyx',          // Powerful voice
    'wise man': 'fable',
    'old man': 'fable',
    'wise woman': 'nova',
    'old woman': 'nova'
  };
  
  // Check for direct character mapping first
  for (const [pattern, voice] of Object.entries(directMappings)) {
    if (name.includes(pattern)) {
      return voice;
    }
  }
  
  // Gender detection from name and description
  const femaleIndicators = ['mother', 'girl', 'woman', 'female', 'she', 'her', 'mrs', 'miss', 'lady', 'daughter', 'sister', 'grandmother', 'aunt', 'queen', 'princess'];
  const maleIndicators = ['boy', 'man', 'male', 'he', 'him', 'mr', 'father', 'sir', 'son', 'brother', 'grandfather', 'uncle', 'king', 'prince'];
  
  const isFemale = femaleIndicators.some(indicator => 
    name.includes(indicator) || description.includes(indicator) || personality.includes(indicator)
  );
  const isMale = maleIndicators.some(indicator => 
    name.includes(indicator) || description.includes(indicator) || personality.includes(indicator)
  );
  
  // Age detection from traits and description
  const youngIndicators = ['young', 'child', 'kid', 'little', 'small', 'boy', 'girl', 'teenage', 'teen'];
  const matureIndicators = ['old', 'elderly', 'wise', 'experienced', 'mother', 'father', 'mature', 'adult', 'grown'];
  
  const isYoung = youngIndicators.some(indicator => 
    name.includes(indicator) || description.includes(indicator) || personality.includes(indicator) || traits.includes(indicator)
  );
  const isMature = matureIndicators.some(indicator => 
    name.includes(indicator) || description.includes(indicator) || personality.includes(indicator) || traits.includes(indicator)
  );
  
  // Authority/role detection
  const authorityIndicators = ['wise', 'leader', 'teacher', 'mentor', 'authoritative', 'commanding', 'powerful', 'royal', 'noble'];
  const gentleIndicators = ['kind', 'gentle', 'soft', 'caring', 'nurturing', 'supportive', 'loving', 'tender', 'warm'];
  const dramaticIndicators = ['dramatic', 'intense', 'passionate', 'emotional', 'expressive', 'fierce', 'angry', 'evil'];
  
  const hasAuthority = authorityIndicators.some(indicator => 
    personality.includes(indicator) || traits.includes(indicator)
  );
  const isGentle = gentleIndicators.some(indicator => 
    personality.includes(indicator) || traits.includes(indicator)
  );
  const isDramatic = dramaticIndicators.some(indicator => 
    personality.includes(indicator) || traits.includes(indicator)
  );
  
  // Voice selection logic based on character attributes
  if (isFemale) {
    if (isMature || hasAuthority || name.includes('mother') || name.includes('queen')) {
      return 'nova';     // Mature, clear female voice for mothers, queens, mature women
    } else if (isYoung) {
      return 'shimmer';  // Young, bright female voice for girls
    } else if (isGentle) {
      return 'nova';     // Warm, nurturing female voice
    } else {
      return 'nova';     // Default female voice
    }
  } else if (isMale) {
    if (isYoung || name.includes('boy')) {
      return 'echo';     // Young male voice for boys and young men
    } else if (hasAuthority || isMature || name.includes('father') || name.includes('king')) {
      return 'onyx';     // Deep, authoritative male voice for fathers, kings, mature men
    } else if (isDramatic) {
      return 'onyx';     // Dramatic male voice for villains
    } else {
      return 'fable';    // Default expressive male voice
    }
  }
  
  // Role-based fallback for ambiguous cases
  const roleVoiceMap: { [key: string]: string } = {
    'protagonist': 'echo',     // Young voice for main character
    'antagonist': 'onyx',      // Deeper, more intense voice
    'supporting': 'nova',      // Default to supportive voice
    'narrator': 'alloy',       // Neutral narrator voice
    'other': 'alloy'           // Neutral voice for others
  };

  return roleVoiceMap[character.role] || 'alloy';
}