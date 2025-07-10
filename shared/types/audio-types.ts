// Shared type definitions for audio functionality across client and server

export interface EmotionData {
  emotion: string;
  intensity: number;
  context: string;
  quote?: string;
}

export interface CharacterData {
  name: string;
  description: string;
  personality: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'narrator' | 'other';
  appearance?: string;
  traits: string[];
  assignedVoice?: string;
  voiceSampleId?: number;
}

export interface AudioRequest {
  emotion: string;
  intensity: number;
  text: string;
  userId?: string;
  storyId?: number;
  characters?: CharacterData[];
  voice?: string;
}

export interface AudioResponse {
  audioUrl: string;
  isUserGenerated: boolean;
  voice: string;
  success: boolean;
}

export interface NarrationSegment {
  text: string;
  audioUrl: string;
  emotion: string;
  intensity: number;
  characterName?: string;
  startTime: number;
  duration: number;
}

export interface StoryNarration {
  storyId: number;
  segments: NarrationSegment[];
  totalDuration: number;
}

export interface VoiceSample {
  id: number;
  userId: string;
  emotion: string;
  intensity: number;
  storyId?: number;
  audioUrl: string;
  isCompleted: boolean;
  timestamp: number;
}

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';