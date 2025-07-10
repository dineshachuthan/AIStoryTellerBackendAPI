import OpenAI from 'openai';
import { storage } from './storage';
import type { Story, StoryCharacter, StoryEmotion } from '@shared/schema/schema';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required for voice narration');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface VoiceSegment {
  text: string;
  characterName?: string;
  emotion: string;
  intensity: number;
  audioUrl: string;
  duration: number;
  startTime: number;
}

export interface GrandmaStoryNarration {
  storyId: number;
  segments: VoiceSegment[];
  totalDuration: number;
}

export class GrandmaVoiceNarrator {
  async generateGrandmaNarration(storyId: number): Promise<GrandmaStoryNarration> {
    const story = await storage.getStory(storyId);
    if (!story) {
      throw new Error('Story not found');
    }

    const characters = await storage.getStoryCharacters(storyId);
    const emotions = await storage.getStoryEmotions(storyId);

    // Analyze story context to determine narrator and audience
    const narrativeContext = this.analyzeNarrativeContext(story, characters);

    // Split story into narrative segments with context
    const segments = await this.createGrandmaSegments(story, characters, emotions, narrativeContext);
    
    // Generate voice audio for each segment
    const voiceSegments = await this.generateVoiceSegments(segments, narrativeContext);

    const totalDuration = voiceSegments.reduce((total, segment) => total + segment.duration, 0);

    return {
      storyId,
      segments: voiceSegments,
      totalDuration,
    };
  }

  private analyzeNarrativeContext(story: Story, characters: StoryCharacter[]): {
    narrator: string;
    audience: string;
    relationship: string;
    tone: string;
    gender: 'grandma' | 'grandpa';
  } {
    const content = story.content.toLowerCase();
    const mainCharacters = characters.filter(c => c.role === 'protagonist');
    const hasChildren = characters.some(c => 
      c.name.toLowerCase().includes('boy') || 
      c.name.toLowerCase().includes('girl') ||
      c.name.toLowerCase().includes('child') ||
      c.description?.toLowerCase().includes('young') ||
      c.description?.toLowerCase().includes('little')
    );

    // Determine gender preference based on story themes
    let gender: 'grandma' | 'grandpa' = 'grandma';
    
    // Grandpa stories: adventure, war, tools, building, sports, heroes
    if (content.includes('adventure') || content.includes('journey') || 
        content.includes('hero') || content.includes('brave') ||
        content.includes('fight') || content.includes('battle') ||
        content.includes('build') || content.includes('tool') ||
        content.includes('sport') || content.includes('strong') ||
        content.includes('work') || content.includes('fix')) {
      gender = 'grandpa';
    }

    // Grandma stories: magic, home, cooking, care, healing, wisdom
    if (content.includes('magic') || content.includes('fairy') || 
        content.includes('princess') || content.includes('home') ||
        content.includes('cook') || content.includes('heal') ||
        content.includes('care') || content.includes('kind') ||
        content.includes('gentle') || content.includes('wise')) {
      gender = 'grandma';
    }

    // Check main character gender influence
    if (mainCharacters.length > 0) {
      const mainChar = mainCharacters[0];
      const isBoy = mainChar.name.toLowerCase().includes('boy') || 
                   mainChar.name.toLowerCase().includes('son') ||
                   ['he', 'him', 'his'].some(pronoun => content.includes(pronoun));
      
      // Boys might prefer grandpa for certain story types
      if (isBoy && (content.includes('adventure') || content.includes('hero'))) {
        gender = 'grandpa';
      }
    }

    // Set up narrator details based on gender and story theme
    let narrator: string;
    let audience = 'my dear grandchildren';
    let relationship: string;
    let tone: string;

    if (gender === 'grandpa') {
      // Grandpa narrator variations
      if (content.includes('adventure') || content.includes('journey')) {
        narrator = 'Grandpa Adventure';
        relationship = 'wise storyteller';
        tone = 'exciting and encouraging';
      } else if (content.includes('hero') || content.includes('brave')) {
        narrator = 'Grandpa Hero';
        relationship = 'proud grandfather';
        tone = 'inspiring and strong';
      } else if (content.includes('work') || content.includes('build')) {
        narrator = 'Grandpa Builder';
        relationship = 'experienced grandfather';
        tone = 'practical and encouraging';
      } else {
        narrator = 'Grandpa Wisdom';
        relationship = 'loving grandfather';
        tone = 'warm and steady';
      }
    } else {
      // Grandma narrator variations
      if (content.includes('magic') || content.includes('fairy')) {
        narrator = 'Grandma Moonbeam';
        audience = 'my precious little ones';
        relationship = 'magical grandmother';
        tone = 'enchanting and mystical';
      } else if (content.includes('lesson') || content.includes('moral')) {
        narrator = 'Grandma Wisdom';
        relationship = 'teaching grandmother';
        tone = 'gentle and instructive';
      } else if (hasChildren) {
        narrator = 'Grandma Sunshine';
        audience = 'my sweet little angels';
        relationship = 'caring grandmother';
        tone = 'protective and loving';
      } else {
        narrator = 'Grandma Rose';
        relationship = 'loving grandmother';
        tone = 'warm and nurturing';
      }
    }

    // Adjust audience based on main character
    if (mainCharacters.length > 0) {
      const mainChar = mainCharacters[0];
      if (mainChar.name.toLowerCase().includes('boy')) {
        audience = gender === 'grandpa' ? 'my brave grandson' : 'my brave little grandson';
      } else if (mainChar.name.toLowerCase().includes('girl')) {
        audience = gender === 'grandpa' ? 'my sweet granddaughter' : 'my sweet little granddaughter';
      }
    }

    return { narrator, audience, relationship, tone, gender };
  }

  private async createGrandmaSegments(
    story: Story,
    characters: StoryCharacter[],
    emotions: StoryEmotion[],
    narrativeContext: { narrator: string; audience: string; relationship: string; tone: string; gender: 'grandma' | 'grandpa' }
  ): Promise<Array<{
    text: string;
    characterName?: string;
    emotion: string;
    intensity: number;
  }>> {
    const content = story.content;
    const sentences = this.splitIntoSentences(content);
    const segments = [];

    // Add personalized opening based on narrator
    const openingText = narrativeContext.gender === 'grandpa' 
      ? `Come sit here beside me, ${narrativeContext.audience}. Your old ${narrativeContext.narrator} has a wonderful story to share with you...`
      : `Come gather around, ${narrativeContext.audience}. Let ${narrativeContext.narrator} tell you a wonderful story...`;
    
    segments.push({
      text: openingText,
      emotion: 'warm',
      intensity: 7,
    });

    let currentTime = 0;

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < 10) continue;

      // Detect if this is dialogue or narration
      const characterName = this.extractSpeaker(trimmed, characters);
      const emotion = this.detectEmotionForSentence(trimmed, emotions);
      
      // Transform text for grandmother style narration
      const grandmaText = this.transformToGrandmaStyle(trimmed, characterName, emotion);

      segments.push({
        text: grandmaText,
        characterName,
        emotion: emotion.emotion,
        intensity: emotion.intensity,
      });
    }

    // Add personalized closing based on narrator
    const closingText = narrativeContext.gender === 'grandpa' 
      ? `And that, ${narrativeContext.audience}, is the end of our story. What did you learn from that adventure? ${narrativeContext.narrator} hopes you enjoyed it.`
      : `And that, my precious ones, is the end of our story. What did you think? Wasn't that lovely?`;
    
    segments.push({
      text: closingText,
      emotion: 'warm',
      intensity: 8,
    });

    return segments;
  }

  private transformToGrandmaStyle(
    text: string, 
    characterName?: string, 
    emotion?: { emotion: string; intensity: number }
  ): string {
    let transformed = text;

    // Add grandmother-style expressions based on emotion
    if (emotion) {
      switch (emotion.emotion) {
        case 'happy':
        case 'joy':
          transformed = `Oh, how wonderful! ${transformed}`;
          break;
        case 'sad':
          transformed = `Oh my dear, ${transformed.toLowerCase()}`;
          break;
        case 'angry':
          transformed = `Oh no, can you imagine? ${transformed}`;
          break;
        case 'fear':
        case 'scared':
          transformed = `Oh my goodness, ${transformed}`;
          break;
        case 'surprise':
          transformed = `Well, would you believe it! ${transformed}`;
          break;
        case 'excitement':
          transformed = `Oh, how exciting! ${transformed}`;
          break;
      }
    }

    // Add character voice modulation cues
    if (characterName) {
      transformed = `Now, ${characterName} said, "${transformed}"`;
    }

    // Add natural grandmother pauses and expressions
    transformed = transformed
      .replace(/\./g, '... ')
      .replace(/!/g, '! ')
      .replace(/\?/g, '? ');

    return transformed;
  }

  private async generateVoiceSegments(
    segments: Array<{
      text: string;
      characterName?: string;
      emotion: string;
      intensity: number;
    }>,
    narrativeContext: { narrator: string; audience: string; relationship: string; tone: string; gender: 'grandma' | 'grandpa' }
  ): Promise<VoiceSegment[]> {
    const voiceSegments: VoiceSegment[] = [];
    let currentTime = 0;

    for (const segment of segments) {
      try {
        // Generate audio using OpenAI TTS
        const audioResponse = await openai.audio.speech.create({
          model: 'tts-1',
          voice: this.selectNarratorVoice(segment.emotion, segment.intensity, narrativeContext.gender),
          input: segment.text,
          speed: this.calculateSpeechSpeed(segment.emotion),
        });

        // Convert audio to base64 URL (simplified for demo)
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        const audioUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
        
        // Estimate duration (rough calculation)
        const wordCount = segment.text.split(' ').length;
        const duration = (wordCount / 120) * 60 * 1000; // 120 WPM for grandmother pace

        voiceSegments.push({
          text: segment.text,
          characterName: segment.characterName,
          emotion: segment.emotion,
          intensity: segment.intensity,
          audioUrl,
          duration,
          startTime: currentTime,
        });

        currentTime += duration + 500; // Add 500ms pause between segments

        // Rate limiting - wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error('Failed to generate voice for segment:', error);
        // Fallback logic goes here
        throw error;
      }
    }

    return voiceSegments;
  }

  private selectNarratorVoice(emotion: string, intensity: number, gender: 'grandma' | 'grandpa'): 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' {
    if (gender === 'grandpa') {
      // Grandpa voice selection - deeper, more authoritative
      switch (emotion) {
        case 'warm':
        case 'happy':
        case 'joy':
          return 'fable'; // Warm but authoritative grandfather voice
        case 'sad':
        case 'gentle':
          return 'onyx'; // Deep, comforting grandfather voice
        case 'excited':
        case 'surprise':
          return 'echo'; // More animated grandfather voice
        case 'serious':
        case 'angry':
          return 'onyx'; // Strong, serious grandfather voice
        case 'inspiring':
        case 'brave':
          return 'fable'; // Inspiring grandfather voice
        default:
          return 'fable'; // Default grandfather voice
      }
    } else {
      // Grandma voice selection - warmer, more nurturing
      switch (emotion) {
        case 'warm':
        case 'happy':
        case 'joy':
          return 'nova'; // Warm, nurturing grandmother voice
        case 'sad':
        case 'gentle':
          return 'alloy'; // Soft, comforting grandmother voice
        case 'excited':
        case 'surprise':
          return 'shimmer'; // More animated grandmother voice
        case 'serious':
        case 'angry':
          return 'fable'; // More authoritative but still kind grandmother
        case 'magical':
        case 'mystical':
          return 'shimmer'; // Enchanting grandmother voice
        default:
          return 'nova'; // Default grandmother voice
      }
    }
  }

  private calculateSpeechSpeed(emotion: string): number {
    // Adjust speech speed based on emotion
    switch (emotion) {
      case 'excited':
      case 'happy':
        return 1.1; // Slightly faster for excitement
      case 'sad':
      case 'gentle':
        return 0.9; // Slower for sad or gentle moments
      case 'angry':
        return 1.05; // Slightly faster for tension
      default:
        return 1.0; // Normal grandmother pace
    }
  }

  private splitIntoSentences(content: string): string[] {
    return content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private extractSpeaker(sentence: string, characters: StoryCharacter[]): string | undefined {
    const lowerSentence = sentence.toLowerCase();
    
    // Look for character names in the sentence
    for (const character of characters) {
      if (lowerSentence.includes(character.name.toLowerCase())) {
        return character.name;
      }
    }

    // Look for dialogue patterns
    if (sentence.includes('"') || sentence.includes("'")) {
      const speakingPatterns = [
        /(\w+)\s+said/i,
        /(\w+)\s+replied/i,
        /(\w+)\s+asked/i,
        /(\w+)\s+whispered/i,
        /(\w+)\s+shouted/i,
        /(\w+)\s+exclaimed/i,
      ];

      for (const pattern of speakingPatterns) {
        const match = sentence.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }

    return undefined;
  }

  private detectEmotionForSentence(
    sentence: string, 
    emotions: StoryEmotion[]
  ): { emotion: string; intensity: number } {
    const lowerSentence = sentence.toLowerCase();

    // Check against story-specific emotions
    for (const emotion of emotions) {
      if (emotion.context && lowerSentence.includes(emotion.context.toLowerCase())) {
        return {
          emotion: emotion.emotion,
          intensity: emotion.intensity || 5,
        };
      }
    }

    // Fallback emotion detection
    const emotionPatterns = {
      'happy': /\b(joy|happy|excited|wonderful|amazing|great|fantastic|love|smiled|laughed)\b/i,
      'sad': /\b(sad|sorrow|tears|cry|depressed|lonely|grief|wept|mourned)\b/i,
      'angry': /\b(angry|furious|rage|mad|frustrated|annoyed|shouted|yelled)\b/i,
      'fear': /\b(scared|afraid|terrified|frightened|worried|anxious|trembled)\b/i,
      'surprise': /\b(surprised|shocked|amazed|astonished|wow|gasped)\b/i,
      'excitement': /\b(excited|thrilled|amazing|incredible|awesome|cheered)\b/i,
      'gentle': /\b(gentle|soft|quiet|whispered|peaceful|calm)\b/i,
    };

    for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
      if (pattern.test(sentence)) {
        const intensity = emotion === 'excited' ? 8 : emotion === 'gentle' ? 4 : 6;
        return { emotion, intensity };
      }
    }

    return { emotion: 'warm', intensity: 5 }; // Default grandmother warmth
  }
}

export const grandmaVoiceNarrator = new GrandmaVoiceNarrator();