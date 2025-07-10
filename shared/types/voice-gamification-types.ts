/**
 * Voice Gamification System Types
 * Works with or without external AI services
 */

export interface VoiceRecordingStats {
  totalRecordings: number;
  uniqueEmotions: number;
  totalDuration: number; // seconds
  averageQuality: number; // 0-1 scale
  lastRecordedAt: Date;
  currentStreak: number; // days
  longestStreak: number;
}

export interface VoiceAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress: number; // 0-100
  threshold: number;
  category: 'recording' | 'quality' | 'social' | 'narration';
}

export interface EmotionProgress {
  emotion: string;
  recordingCount: number;
  bestQuality: number;
  averageDuration: number;
  lastRecordedAt?: Date;
  isCompleted: boolean;
}

export interface VoicePersonalityProfile {
  dominantEmotions: string[];
  expressionScore: number; // 0-100
  clarityScore: number; // 0-100
  emotionalRange: number; // 0-100
  voiceCharacter: 'warm' | 'authoritative' | 'energetic' | 'calm' | 'dynamic';
}

export interface DailyChallenge {
  id: string;
  date: Date;
  emotion: string;
  targetQuality: number;
  description: string;
  reward: string;
  completed: boolean;
  participants: number;
}

export interface VoiceLeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  category: 'expression' | 'consistency' | 'participation';
  period: 'daily' | 'weekly' | 'allTime';
}

// Ephemeral voice session tracking
export interface VoiceSession {
  sessionId: string;
  userId: string;
  startedAt: Date;
  emotionSamples: {
    emotion: string;
    audioUrl: string;
    duration: number;
    quality: number;
  }[];
  elevenLabsVoiceId?: string; // Only exists during session
  generatedNarrations: {
    storyId: number;
    audioUrl: string;
    generatedAt: Date;
  }[];
  status: 'collecting' | 'generating' | 'completed' | 'failed';
  completedAt?: Date;
}

// Local storage without external APIs
export interface LocalVoiceData {
  recordings: {
    id: string;
    emotion: string;
    audioUrl: string;
    duration: number;
    recordedAt: Date;
    localQuality?: number; // Based on duration, volume, etc.
  }[];
  achievements: VoiceAchievement[];
  stats: VoiceRecordingStats;
  personalityProfile?: VoicePersonalityProfile;
}

// Enhanced features with AI
export interface AIEnhancedFeatures {
  voiceQualityAnalysis?: {
    clarity: number;
    emotion: number;
    naturalness: number;
    suggestions: string[];
  };
  narrationCapability?: {
    available: boolean;
    voicesGenerated: number;
    storiesNarrated: number;
  };
}