// Unified type definitions for the entire application

export interface Character {
  name: string;
  role: string;
  personality: string;
  voiceProfile: string;
  description?: string; // For narrative analysis compatibility
  traits?: string[]; // For narrative analysis compatibility
  costumeSuggestion?: string;
  assignedVoice?: string;
  voiceSampleId?: number;
  appearance?: string;
}

export interface DialogueLine {
  characterName: string;
  dialogue: string;
  emotion: string;
  intensity: number;
  action?: string;
}

export interface SceneBackground {
  location: string;
  timeOfDay: string;
  atmosphere: string;
  visualDescription: string;
  soundscape?: string;
  lighting?: string;
}

export interface RolePlayScene {
  sceneNumber: number;
  title: string;
  background: SceneBackground;
  dialogueSequence: DialogueLine[];
  stageDirections: string[];
  estimatedDuration: number;
  emotionalTone: string;
}

export interface RolePlayAnalysis {
  title: string;
  genre: string;
  overallTone: string;
  totalScenes: number;
  estimatedPlaytime: number;
  scenes: RolePlayScene[];
  characters: Character[];
  productionNotes: string[];
}

export interface VideoResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  status: 'completed' | 'processing' | 'failed' | 'pending_approval';
  cacheHit?: boolean;
  metadata?: {
    provider: string;
    providerJobId: string;
    format: string;
    resolution: string;
    codec: string;
    generatedAt: Date;
  };
  error?: string;
}

export interface Invitation {
  id: string;
  contactValue: string;
  contactMethod: 'email' | 'phone';
  hasVoiceRecording: boolean;
  invitationToken: string;
  sentAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  invitationUrl?: string;
}