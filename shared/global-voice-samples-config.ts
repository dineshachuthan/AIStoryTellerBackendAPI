/**
 * Global Voice Samples Configuration
 * Defines the standard set of emotions and sounds that all users must record
 */

export interface GlobalVoiceSample {
  id: string;
  type: 'emotion' | 'sound';
  name: string;
  displayName: string;
  description: string;
  sampleText: string; // Pre-written text for users to read
  minDuration: number; // Minimum recording duration in seconds
  category: string;
}

export const GLOBAL_VOICE_SAMPLES: GlobalVoiceSample[] = [
  // Core Emotions (10)
  {
    id: 'happy',
    type: 'emotion',
    name: 'happy',
    displayName: 'Happy',
    description: 'Express joy and happiness',
    sampleText: 'What a wonderful surprise! I can\'t believe this is happening. This is the best day ever!',
    minDuration: 5,
    category: 'core'
  },
  {
    id: 'sad',
    type: 'emotion',
    name: 'sad',
    displayName: 'Sad',
    description: 'Express sadness and sorrow',
    sampleText: 'I miss you so much. Why did things have to end this way? My heart feels so heavy.',
    minDuration: 5,
    category: 'core'
  },
  {
    id: 'angry',
    type: 'emotion',
    name: 'angry',
    displayName: 'Angry',
    description: 'Express anger and frustration',
    sampleText: 'This is unacceptable! How could you do this to me? I\'ve had enough of these excuses!',
    minDuration: 5,
    category: 'core'
  },
  {
    id: 'scared',
    type: 'emotion',
    name: 'scared',
    displayName: 'Scared',
    description: 'Express fear and anxiety',
    sampleText: 'Did you hear that? Something\'s not right here. Please, we need to get out of here now!',
    minDuration: 5,
    category: 'core'
  },
  {
    id: 'excited',
    type: 'emotion',
    name: 'excited',
    displayName: 'Excited',
    description: 'Express excitement and enthusiasm',
    sampleText: 'Oh my goodness! This is incredible! I can\'t wait to tell everyone about this amazing news!',
    minDuration: 5,
    category: 'core'
  },
  {
    id: 'surprised',
    type: 'emotion',
    name: 'surprised',
    displayName: 'Surprised',
    description: 'Express surprise and shock',
    sampleText: 'What? I can\'t believe it! Is this really happening? You\'re kidding me, right?',
    minDuration: 5,
    category: 'core'
  },
  {
    id: 'disgusted',
    type: 'emotion',
    name: 'disgusted',
    displayName: 'Disgusted',
    description: 'Express disgust and revulsion',
    sampleText: 'Ugh, that\'s revolting! I can\'t even look at it. Get that away from me immediately!',
    minDuration: 5,
    category: 'core'
  },
  {
    id: 'confused',
    type: 'emotion',
    name: 'confused',
    displayName: 'Confused',
    description: 'Express confusion and bewilderment',
    sampleText: 'Wait, what? I don\'t understand. Can you explain that again? This doesn\'t make any sense.',
    minDuration: 5,
    category: 'core'
  },
  {
    id: 'calm',
    type: 'emotion',
    name: 'calm',
    displayName: 'Calm',
    description: 'Express calmness and serenity',
    sampleText: 'Everything will be alright. Let\'s take a deep breath and think this through together.',
    minDuration: 5,
    category: 'core'
  },
  {
    id: 'neutral',
    type: 'emotion',
    name: 'neutral',
    displayName: 'Neutral',
    description: 'Normal speaking voice',
    sampleText: 'The meeting is scheduled for tomorrow at three o\'clock in the conference room.',
    minDuration: 5,
    category: 'core'
  },

  // Character Voices (10)
  {
    id: 'child',
    type: 'sound',
    name: 'child',
    displayName: 'Child Voice',
    description: 'Speak like a young child',
    sampleText: 'Mommy, can I have some ice cream please? I promise I\'ll be good!',
    minDuration: 5,
    category: 'character'
  },
  {
    id: 'elderly',
    type: 'sound',
    name: 'elderly',
    displayName: 'Elderly Voice',
    description: 'Speak like an elderly person',
    sampleText: 'Back in my day, things were quite different. Let me tell you a story from long ago.',
    minDuration: 5,
    category: 'character'
  },
  {
    id: 'whisper',
    type: 'sound',
    name: 'whisper',
    displayName: 'Whisper',
    description: 'Speak in a soft whisper',
    sampleText: 'Shh... be very quiet. They might hear us if we\'re not careful.',
    minDuration: 5,
    category: 'character'
  },
  {
    id: 'shout',
    type: 'sound',
    name: 'shout',
    displayName: 'Shout',
    description: 'Speak loudly as if shouting',
    sampleText: 'HEY! OVER HERE! CAN YOU HEAR ME? I NEED HELP!',
    minDuration: 5,
    category: 'character'
  },
  {
    id: 'robot',
    type: 'sound',
    name: 'robot',
    displayName: 'Robot Voice',
    description: 'Speak like a robot',
    sampleText: 'Initiating protocol. Processing request. Task completed successfully.',
    minDuration: 5,
    category: 'character'
  },
  {
    id: 'narrator',
    type: 'sound',
    name: 'narrator',
    displayName: 'Narrator',
    description: 'Story narrator voice',
    sampleText: 'Once upon a time, in a land far away, there lived a brave young hero.',
    minDuration: 5,
    category: 'character'
  },
  {
    id: 'villain',
    type: 'sound',
    name: 'villain',
    displayName: 'Villain',
    description: 'Speak like a villain',
    sampleText: 'You fool! Did you really think you could stop me? My plan is already in motion!',
    minDuration: 5,
    category: 'character'
  },
  {
    id: 'hero',
    type: 'sound',
    name: 'hero',
    displayName: 'Hero',
    description: 'Speak like a hero',
    sampleText: 'I won\'t let you hurt these innocent people! Justice will prevail!',
    minDuration: 5,
    category: 'character'
  },
  {
    id: 'mysterious',
    type: 'sound',
    name: 'mysterious',
    displayName: 'Mysterious',
    description: 'Speak mysteriously',
    sampleText: 'Things are not always as they seem... The truth lies hidden in the shadows.',
    minDuration: 5,
    category: 'character'
  },
  {
    id: 'dramatic',
    type: 'sound',
    name: 'dramatic',
    displayName: 'Dramatic',
    description: 'Speak dramatically',
    sampleText: 'This... this changes everything! The fate of the world hangs in the balance!',
    minDuration: 5,
    category: 'character'
  },

  // Action Sounds (5)
  {
    id: 'laugh',
    type: 'sound',
    name: 'laugh',
    displayName: 'Laugh',
    description: 'Natural laughter',
    sampleText: 'Hahaha! That\'s the funniest thing I\'ve heard all day! Oh my sides hurt!',
    minDuration: 5,
    category: 'action'
  },
  {
    id: 'cry',
    type: 'sound',
    name: 'cry',
    displayName: 'Cry',
    description: 'Crying or sobbing',
    sampleText: '*sniff* I can\'t believe it\'s over... *sob* Why did this have to happen?',
    minDuration: 5,
    category: 'action'
  },
  {
    id: 'sigh',
    type: 'sound',
    name: 'sigh',
    displayName: 'Sigh',
    description: 'A deep sigh',
    sampleText: '*deep sigh* Well, I suppose there\'s nothing more we can do about it now.',
    minDuration: 5,
    category: 'action'
  },
  {
    id: 'gasp',
    type: 'sound',
    name: 'gasp',
    displayName: 'Gasp',
    description: 'A sharp gasp',
    sampleText: '*GASP* Oh no! Look out behind you! Quick, move!',
    minDuration: 5,
    category: 'action'
  },
  {
    id: 'groan',
    type: 'sound',
    name: 'groan',
    displayName: 'Groan',
    description: 'Groaning sound',
    sampleText: '*groan* Not again... This is the third time this week.',
    minDuration: 5,
    category: 'action'
  }
];

// Configuration constants
export const VOICE_SAMPLE_CONFIG = {
  MINIMUM_SAMPLES_REQUIRED: 10, // Minimum samples before auto-generating narrator voice
  SAMPLES_PER_LOGIN_PROMPT: 3, // How many samples to prompt for on login
  TOTAL_SAMPLES: GLOBAL_VOICE_SAMPLES.length,
  MIN_DURATION_SECONDS: 5,
  MAX_DURATION_SECONDS: 30,
  CATEGORIES: {
    core: 'Core Emotions',
    character: 'Character Voices',
    action: 'Action Sounds'
  }
};

// Helper functions
export function getRequiredSampleIds(): string[] {
  return GLOBAL_VOICE_SAMPLES.slice(0, VOICE_SAMPLE_CONFIG.MINIMUM_SAMPLES_REQUIRED).map(s => s.id);
}

export function getSampleById(id: string): GlobalVoiceSample | undefined {
  return GLOBAL_VOICE_SAMPLES.find(s => s.id === id);
}

export function getSamplesByCategory(category: string): GlobalVoiceSample[] {
  return GLOBAL_VOICE_SAMPLES.filter(s => s.category === category);
}

export function getRandomUnrecordedSamples(recordedIds: string[], count: number): GlobalVoiceSample[] {
  const unrecorded = GLOBAL_VOICE_SAMPLES.filter(s => !recordedIds.includes(s.id));
  const shuffled = [...unrecorded].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}