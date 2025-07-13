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

// DEPRECATED: Emotion samples moved to database-driven ESM system
// Use database queries on user_esm table for emotion categories, sample texts, and configurations
// This ensures consistency with the actual emotion data used throughout the application

export const GLOBAL_EMOTION_SAMPLES: EmotionSample[] = [
  // This array is kept for backward compatibility but should not be used
  // Use getEmotionSamplesFromDatabase() instead
];

// Minimum samples required to create an ephemeral voice
export const MIN_SAMPLES_FOR_VOICE = 10;

// Voice cleanup configuration
export const VOICE_CLEANUP_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // milliseconds
  logFailures: true
};