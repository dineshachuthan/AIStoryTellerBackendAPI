// Advanced voice matching system for character-specific voice assignment
import type { ExtractedCharacter } from './ai-analysis';

interface VoiceProfile {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  gender: 'male' | 'female' | 'neutral';
  age: 'young' | 'adult' | 'mature';
  tone: 'warm' | 'authoritative' | 'gentle' | 'dramatic' | 'neutral';
  description: string;
}

// OpenAI voice profiles with detailed characteristics
const VOICE_PROFILES: Record<string, VoiceProfile> = {
  'alloy': {
    voice: 'alloy',
    gender: 'neutral',
    age: 'adult',
    tone: 'neutral',
    description: 'Clear, balanced narrator voice suitable for storytelling'
  },
  'echo': {
    voice: 'echo',
    gender: 'male',
    age: 'young',
    tone: 'gentle',
    description: 'Higher-pitched male voice, youthful and expressive'
  },
  'fable': {
    voice: 'fable',
    gender: 'male',
    age: 'adult',
    tone: 'dramatic',
    description: 'Expressive male voice with storytelling quality'
  },
  'onyx': {
    voice: 'onyx',
    gender: 'male',
    age: 'mature',
    tone: 'authoritative',
    description: 'Deep, authoritative male voice with gravitas'
  },
  'nova': {
    voice: 'nova',
    gender: 'female',
    age: 'adult',
    tone: 'warm',
    description: 'Clear, mature female voice with warmth and authority'
  },
  'shimmer': {
    voice: 'shimmer',
    gender: 'female',
    age: 'young',
    tone: 'gentle',
    description: 'Bright, youthful female voice with energy'
  }
};

interface CharacterAnalysis {
  gender: 'male' | 'female' | 'unknown';
  age: 'young' | 'adult' | 'mature' | 'unknown';
  personality: 'authoritative' | 'gentle' | 'dramatic' | 'wise' | 'energetic' | 'neutral';
  role: 'protagonist' | 'antagonist' | 'supporting' | 'narrator' | 'other';
}

export function analyzeCharacter(character: ExtractedCharacter): CharacterAnalysis {
  const text = `${character.name} ${character.description} ${character.personality} ${character.traits.join(' ')}`.toLowerCase();
  
  // Animal detection (animals get special voice treatment)
  const animalIndicators = [
    'dog', 'cat', 'horse', 'lion', 'tiger', 'bear', 'wolf', 'fox', 'rabbit', 'mouse',
    'bird', 'eagle', 'owl', 'crow', 'duck', 'chicken', 'rooster', 'pig', 'cow', 'sheep',
    'goat', 'elephant', 'monkey', 'snake', 'frog', 'fish', 'whale', 'dolphin', 'turtle',
    'deer', 'squirrel', 'raccoon', 'badger', 'beaver', 'otter', 'hedgehog', 'porcupine'
  ];
  
  const isAnimal = animalIndicators.some(animal => text.includes(animal));
  
  // Gender detection with comprehensive indicators including authority figures
  const femaleIndicators = [
    'mother', 'mom', 'girl', 'woman', 'female', 'she', 'her', 'mrs', 'miss', 'lady', 
    'daughter', 'sister', 'grandmother', 'aunt', 'queen', 'princess', 'witch', 'fairy',
    'goddess', 'empress', 'duchess', 'countess', 'baroness', 'nurse', 'teacher female',
    'priestess', 'nun', 'abbess', 'maiden', 'bride', 'wife', 'widow', 'governess'
  ];
  const maleIndicators = [
    'boy', 'man', 'male', 'he', 'him', 'mr', 'father', 'dad', 'son', 'brother', 
    'grandfather', 'uncle', 'king', 'prince', 'wizard', 'knight', 'soldier', 'warrior',
    'god', 'emperor', 'duke', 'count', 'baron', 'lord', 'sir', 'captain', 'general',
    'admiral', 'colonel', 'sergeant', 'priest', 'monk', 'bishop', 'pope', 'president',
    'minister', 'ambassador', 'judge', 'sheriff', 'detective', 'doctor male', 'professor male',
    'terrorist', 'bandit', 'thief', 'pirate', 'merchant', 'blacksmith', 'carpenter',
    'hunter', 'fisherman', 'farmer', 'shepherd', 'groom', 'husband', 'widower'
  ];
  
  const femaleMatches = femaleIndicators.filter(indicator => text.includes(indicator)).length;
  const maleMatches = maleIndicators.filter(indicator => text.includes(indicator)).length;
  
  let gender: 'male' | 'female' | 'unknown' = 'unknown';
  if (femaleMatches > maleMatches) gender = 'female';
  else if (maleMatches > femaleMatches) gender = 'male';
  
  // Age detection with context awareness
  const youngIndicators = ['young', 'child', 'kid', 'little', 'small', 'teenage', 'adolescent', 'boy', 'girl'];
  const matureIndicators = ['old', 'elderly', 'aged', 'senior', 'wise', 'experienced', 'veteran', 'ancient'];
  const adultIndicators = ['adult', 'grown', 'mature', 'mother', 'father', 'parent'];
  
  let age: 'young' | 'adult' | 'mature' | 'unknown' = 'unknown';
  if (youngIndicators.some(indicator => text.includes(indicator))) {
    age = 'young';
  } else if (matureIndicators.some(indicator => text.includes(indicator))) {
    age = 'mature';
  } else if (adultIndicators.some(indicator => text.includes(indicator))) {
    age = 'adult';
  }
  
  // Authority figure detection for voice assignment
  const highAuthorityFigures = [
    'king', 'queen', 'emperor', 'empress', 'president', 'prime minister', 'chancellor',
    'pope', 'bishop', 'archbishop', 'cardinal', 'chief', 'commander', 'general',
    'admiral', 'lord', 'duke', 'duchess', 'god', 'goddess', 'deity', 'judge'
  ];
  
  const militaryFigures = [
    'soldier', 'warrior', 'knight', 'captain', 'sergeant', 'colonel', 'major',
    'lieutenant', 'admiral', 'general', 'commander', 'guard', 'sentry'
  ];
  
  const antagonisticFigures = [
    'terrorist', 'villain', 'criminal', 'bandit', 'thief', 'pirate', 'assassin',
    'witch', 'warlock', 'demon', 'monster', 'dragon', 'tyrant', 'dictator'
  ];
  
  const religiousFigures = [
    'priest', 'monk', 'nun', 'bishop', 'pope', 'rabbi', 'imam', 'minister',
    'pastor', 'chaplain', 'oracle', 'prophet', 'sage', 'hermit'
  ];
  
  const isHighAuthority = highAuthorityFigures.some(figure => text.includes(figure));
  const isMilitary = militaryFigures.some(figure => text.includes(figure));
  const isAntagonistic = antagonisticFigures.some(figure => text.includes(figure));
  const isReligious = religiousFigures.some(figure => text.includes(figure));
  
  // Personality analysis for voice tone
  const authoritativeTraits = [
    'wise', 'leader', 'teacher', 'mentor', 'authoritative', 'commanding', 'stern', 'firm',
    'powerful', 'dominant', 'confident', 'strong', 'brave', 'courageous', 'noble'
  ];
  const gentleTraits = [
    'kind', 'gentle', 'soft', 'caring', 'nurturing', 'supportive', 'loving', 'tender',
    'compassionate', 'merciful', 'peaceful', 'calm', 'serene', 'patient'
  ];
  const dramaticTraits = [
    'dramatic', 'intense', 'passionate', 'emotional', 'expressive', 'theatrical',
    'flamboyant', 'charismatic', 'magnetic', 'captivating', 'enchanting'
  ];
  const wiseTraits = [
    'wise', 'intelligent', 'thoughtful', 'sage', 'knowledgeable', 'experienced',
    'scholarly', 'learned', 'educated', 'profound', 'insightful', 'philosophical'
  ];
  const energeticTraits = [
    'energetic', 'excited', 'enthusiastic', 'lively', 'spirited', 'vibrant',
    'playful', 'cheerful', 'bubbly', 'animated', 'dynamic', 'active'
  ];
  const menacingTraits = [
    'evil', 'dark', 'sinister', 'cruel', 'harsh', 'brutal', 'fierce', 'savage',
    'ruthless', 'merciless', 'cold', 'calculating', 'cunning', 'treacherous'
  ];
  
  let personality: 'authoritative' | 'gentle' | 'dramatic' | 'wise' | 'energetic' | 'neutral' = 'neutral';
  
  // Special handling for animals
  if (isAnimal) {
    // Animals get energetic or gentle personalities based on context
    if (text.includes('fierce') || text.includes('wild') || text.includes('predator')) {
      personality = 'dramatic';
    } else {
      personality = 'energetic';
    }
    // Override gender for animals - use neutral detection
    gender = 'unknown';
    age = 'adult';
  } else {
    // Personality assignment with priority for specific character types
    if (isHighAuthority || isMilitary || isReligious) {
      personality = 'authoritative';
    } else if (isAntagonistic || menacingTraits.some(trait => text.includes(trait))) {
      personality = 'dramatic';
    } else if (authoritativeTraits.some(trait => text.includes(trait))) {
      personality = 'authoritative';
    } else if (wiseTraits.some(trait => text.includes(trait))) {
      personality = 'wise';
    } else if (gentleTraits.some(trait => text.includes(trait))) {
      personality = 'gentle';
    } else if (dramaticTraits.some(trait => text.includes(trait))) {
      personality = 'dramatic';
    } else if (energeticTraits.some(trait => text.includes(trait))) {
      personality = 'energetic';
    } else {
      personality = 'neutral';
    }
  }
  
  return {
    gender,
    age,
    personality,
    role: character.role
  };
}

export function matchVoiceToCharacter(character: ExtractedCharacter): string {
  const analysis = analyzeCharacter(character);
  const text = `${character.name} ${character.description} ${character.personality}`.toLowerCase();
  
  // Special voice assignments for specific character archetypes
  const specialCharacterMappings: Record<string, string> = {
    // Authority figures get deep, commanding voices
    'king': 'onyx',
    'emperor': 'onyx', 
    'president': 'onyx',
    'general': 'onyx',
    'commander': 'onyx',
    'judge': 'onyx',
    
    // Queens and female authority get strong female voice
    'queen': 'nova',
    'empress': 'nova',
    'goddess': 'nova',
    'princess': 'shimmer',
    
    // Religious figures get wise, authoritative voices
    'priest': 'fable',
    'monk': 'fable',
    'bishop': 'onyx',
    'pope': 'onyx',
    'oracle': 'nova',
    'sage': 'fable',
    
    // Military gets appropriate voices by rank
    'soldier': 'echo',
    'sergeant': 'fable',
    'captain': 'onyx',
    'admiral': 'onyx',
    
    // Antagonistic characters get dramatic voices
    'terrorist': 'onyx',
    'villain': 'onyx',
    'demon': 'onyx',
    'witch': 'nova',
    'dragon': 'onyx',
    
    // Animals get distinctive voices
    'dog': 'echo',
    'cat': 'shimmer',
    'lion': 'onyx',
    'bear': 'onyx',
    'bird': 'shimmer',
    'wolf': 'fable',
    'horse': 'fable'
  };
  
  // Check for direct character type match
  for (const [characterType, voice] of Object.entries(specialCharacterMappings)) {
    if (text.includes(characterType)) {
      return voice;
    }
  }
  
  // Find the best matching voice based on character analysis
  const candidateVoices = Object.values(VOICE_PROFILES);
  
  let bestMatch = 'alloy';
  let bestScore = 0;
  
  for (const voiceProfile of candidateVoices) {
    let score = 0;
    
    // Gender matching (highest priority)
    if (analysis.gender !== 'unknown' && voiceProfile.gender === analysis.gender) {
      score += 10;
    } else if (analysis.gender === 'unknown' && voiceProfile.gender === 'neutral') {
      score += 5;
    }
    
    // Age matching
    if (analysis.age !== 'unknown' && voiceProfile.age === analysis.age) {
      score += 5;
    }
    
    // Personality/tone matching with expanded mappings
    const personalityToToneMap: Record<string, string> = {
      'authoritative': 'authoritative',
      'wise': 'authoritative', 
      'gentle': 'gentle',
      'dramatic': 'dramatic',
      'energetic': 'warm',
      'neutral': 'neutral'
    };
    
    const expectedTone = personalityToToneMap[analysis.personality];
    if (expectedTone && voiceProfile.tone === expectedTone) {
      score += 3;
    }
    
    // Role-based adjustments
    if (analysis.role === 'protagonist' && voiceProfile.voice === 'echo') score += 2;
    if (analysis.role === 'antagonist' && voiceProfile.voice === 'onyx') score += 2;
    if (analysis.role === 'narrator' && voiceProfile.voice === 'alloy') score += 3;
    
    // Special bonuses for character context
    if (text.includes('evil') || text.includes('dark')) {
      if (voiceProfile.voice === 'onyx') score += 3;
    }
    if (text.includes('wise') || text.includes('old')) {
      if (voiceProfile.voice === 'fable' || voiceProfile.voice === 'nova') score += 2;
    }
    if (text.includes('young') || text.includes('child')) {
      if (voiceProfile.voice === 'echo' || voiceProfile.voice === 'shimmer') score += 2;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = voiceProfile.voice;
    }
  }
  
  return bestMatch;
}

// Future enhancement: Custom voice training data
export interface CustomVoiceData {
  characterId: string;
  voiceSamples: string[];
  preferredStyle: 'conversational' | 'narrative' | 'emotional';
  speedModifier: number; // 0.25 to 4.0
  pitchHints: 'higher' | 'lower' | 'natural';
}

export function generateVoiceInstructions(character: ExtractedCharacter, emotion: string): {
  voice: string;
  speed: number;
  style: string;
} {
  const assignedVoice = matchVoiceToCharacter(character);
  const analysis = analyzeCharacter(character);
  
  // Adjust speed based on character and emotion
  let speed = 1.0;
  if (analysis.age === 'young') speed *= 1.1;
  if (analysis.age === 'mature') speed *= 0.9;
  if (emotion === 'excitement' || emotion === 'fear') speed *= 1.2;
  if (emotion === 'sadness' || emotion === 'wisdom') speed *= 0.8;
  
  // Generate style instructions for text-to-speech
  const styleInstructions = [];
  if (analysis.personality === 'gentle') styleInstructions.push('speak softly and warmly');
  if (analysis.personality === 'authoritative') styleInstructions.push('speak with confidence and authority');
  if (analysis.personality === 'dramatic') styleInstructions.push('speak with expression and emphasis');
  if (emotion === 'wisdom') styleInstructions.push('speak thoughtfully with pauses');
  
  return {
    voice: assignedVoice,
    speed: Math.max(0.25, Math.min(4.0, speed)),
    style: styleInstructions.join(', ') || 'speak naturally'
  };
}

export function getVoiceExplanation(character: ExtractedCharacter): string {
  const analysis = analyzeCharacter(character);
  const voice = matchVoiceToCharacter(character);
  const profile = VOICE_PROFILES[voice];
  
  return `${character.name} assigned "${voice}" voice: ${profile.description}. ` +
         `Detected as ${analysis.gender} ${analysis.age} character with ${analysis.personality} personality.`;
}