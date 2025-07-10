/**
 * Ephemeral Voice Configuration
 * Defines voice types and emotion samples for the multi-voice narrator system
 */

export interface VoiceType {
  id: string;
  name: string;
  icon: string;
  description: string;
  suggestedFor: string[];
}

export const VOICE_TYPES: VoiceType[] = [
  {
    id: 'hero',
    name: 'Hero Voice',
    icon: '🎭',
    description: 'Confident, inspiring, and uplifting',
    suggestedFor: ['adventure', 'motivational', 'success']
  },
  {
    id: 'villain',
    name: 'Villain Voice',
    icon: '👹',
    description: 'Dark, mysterious, and dramatic',
    suggestedFor: ['thriller', 'mystery', 'horror']
  },
  {
    id: 'creature',
    name: 'Creature Voice',
    icon: '🐾',
    description: 'Playful, animated, and whimsical',
    suggestedFor: ['fantasy', 'children', 'comedy']
  },
  {
    id: 'narrator',
    name: 'Narrator Voice',
    icon: '📖',
    description: 'Neutral, clear, and professional',
    suggestedFor: ['documentary', 'educational', 'general']
  },
  {
    id: 'elder',
    name: 'Elder Voice',
    icon: '🧙',
    description: 'Wise, gentle, and thoughtful',
    suggestedFor: ['wisdom', 'folklore', 'historical']
  }
];

export interface EmotionSample {
  id: string;
  emotion: string;
  displayName: string;
  icon: string;
  description: string;
  exampleText: string;
  minDuration: number;
  maxDuration: number;
}

export const GLOBAL_EMOTION_SAMPLES: EmotionSample[] = [
  {
    id: 'happy',
    emotion: 'happy',
    displayName: 'Happy',
    icon: '😊',
    description: 'Joyful and cheerful tone',
    exampleText: 'Today was absolutely wonderful! I woke up to sunshine streaming through my window, birds singing their morning songs, and the smell of fresh coffee brewing. Everything feels perfect and I can\'t stop smiling at how beautiful life can be.',
    minDuration: 15,
    maxDuration: 25
  },
  {
    id: 'sad',
    emotion: 'sad',
    displayName: 'Sad',
    icon: '😢',
    description: 'Melancholic and sorrowful',
    exampleText: 'The rain falls gently on the window, matching the tears in my heart. I miss the days when we were together, laughing without a care in the world. Now those memories feel like distant dreams that slip through my fingers like sand.',
    minDuration: 15,
    maxDuration: 25
  },
  {
    id: 'angry',
    emotion: 'angry',
    displayName: 'Angry',
    icon: '😠',
    description: 'Frustrated and intense',
    exampleText: 'This is completely unacceptable! How could they make such a careless mistake? I\'ve told them a thousand times to be careful, but no one ever listens. My patience has run out and I won\'t stand for this incompetence any longer!',
    minDuration: 15,
    maxDuration: 25
  },
  {
    id: 'fear',
    emotion: 'fear',
    displayName: 'Fear',
    icon: '😨',
    description: 'Anxious and scared',
    exampleText: 'My heart pounds in my chest as shadows dance on the walls. Every creak of the floorboards makes me jump. I can\'t shake the feeling that something is watching me from the darkness, waiting for the perfect moment to strike.',
    minDuration: 15,
    maxDuration: 25
  },
  {
    id: 'surprised',
    emotion: 'surprised',
    displayName: 'Surprised',
    icon: '😲',
    description: 'Shocked and amazed',
    exampleText: 'I can\'t believe what just happened! Out of nowhere, all my friends jumped out and yelled surprise! My jaw dropped and my eyes went wide. This is the most incredible birthday party I\'ve ever had. I\'m completely speechless!',
    minDuration: 15,
    maxDuration: 25
  },
  {
    id: 'disgusted',
    emotion: 'disgusted',
    displayName: 'Disgusted',
    icon: '🤢',
    description: 'Repulsed and uncomfortable',
    exampleText: 'The smell hit me like a wall of rotting garbage mixed with spoiled milk. My stomach churned and I had to cover my nose. How could anyone let things get this bad? This is absolutely revolting and I need to get out of here immediately.',
    minDuration: 15,
    maxDuration: 25
  },
  {
    id: 'neutral',
    emotion: 'neutral',
    displayName: 'Neutral',
    icon: '😐',
    description: 'Calm and balanced',
    exampleText: 'The meeting went as expected. We reviewed the quarterly reports, discussed the upcoming projects, and set deadlines for next month. Everything is proceeding according to plan. The weather today is partly cloudy with mild temperatures.',
    minDuration: 15,
    maxDuration: 25
  },
  {
    id: 'excited',
    emotion: 'excited',
    displayName: 'Excited',
    icon: '🤗',
    description: 'Enthusiastic and energetic',
    exampleText: 'This is it! The moment I\'ve been waiting for all year! My hands are shaking with anticipation and I can barely contain my enthusiasm. Tomorrow we embark on the adventure of a lifetime. I\'m so pumped I could run a marathon right now!',
    minDuration: 15,
    maxDuration: 25
  },
  {
    id: 'thoughtful',
    emotion: 'thoughtful',
    displayName: 'Thoughtful',
    icon: '🤔',
    description: 'Contemplative and reflective',
    exampleText: 'As I sit by the window watching the world go by, I find myself pondering life\'s bigger questions. What truly makes us happy? How do we find meaning in our daily routines? These thoughts swirl in my mind like autumn leaves in the wind.',
    minDuration: 15,
    maxDuration: 25
  },
  {
    id: 'confident',
    emotion: 'confident',
    displayName: 'Confident',
    icon: '💪',
    description: 'Assured and determined',
    exampleText: 'I walk into the room with my head held high, knowing I\'m prepared for whatever comes my way. Years of hard work have led to this moment, and I\'m ready to show everyone what I\'m capable of. Success is not a matter of if, but when.',
    minDuration: 15,
    maxDuration: 25
  }
];

// Minimum samples required to create an ephemeral voice
export const MIN_SAMPLES_FOR_VOICE = 10;

// Voice cleanup configuration
export const VOICE_CLEANUP_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // milliseconds
  logFailures: true
};