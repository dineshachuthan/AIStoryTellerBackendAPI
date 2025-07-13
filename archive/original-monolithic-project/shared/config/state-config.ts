/**
 * Centralized State Configuration System
 * Defines all application states and their metadata
 */

// State type definitions
export type StateType = 'story' | 'story_instance' | 'video_job' | 'voice_training' | 'story_processing';

// Base state definition interface
export interface StateDefinition {
  stateKey: string;
  displayName: string;
  description: string;
  isInitial: boolean;
  isTerminal: boolean;
  sortOrder: number;
  isActive: boolean;
}

// State transition definition
export interface StateTransition {
  fromState: string;
  toState: string;
  isAutomatic: boolean;
  requiresPermission: boolean;
  validationRules?: Record<string, any>;
}

// Type-safe state enums (generated from database)
export enum StoryStatus {
  DRAFT = 'draft',
  READY = 'ready',
  ANALYZED = 'analyzed',
  PRIVATE_TESTING = 'private_testing',
  COLLABORATIVE_REVIEW = 'collaborative_review',
  FINALIZED = 'finalized',
  PUBLISHED = 'published'
}

export enum StoryProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum StoryInstanceStatus {
  DRAFT = 'draft',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PUBLISHED = 'published'
}

export enum VideoJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum VoiceTrainingStatus {
  PENDING = 'pending',
  TRAINING = 'training',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// State type mapping
export type StatesFor<T extends StateType> = 
  T extends 'story' ? StoryStatus :
  T extends 'story_processing' ? StoryProcessingStatus :
  T extends 'story_instance' ? StoryInstanceStatus :
  T extends 'video_job' ? VideoJobStatus :
  T extends 'voice_training' ? VoiceTrainingStatus :
  never;

// Default state definitions for database seeding
export const DEFAULT_STATE_DEFINITIONS: Record<StateType, StateDefinition[]> = {
  story: [
    { stateKey: 'draft', displayName: 'Draft', description: 'Story is being written or edited', isInitial: true, isTerminal: false, sortOrder: 1, isActive: true },
    { stateKey: 'ready', displayName: 'Ready', description: 'Story is complete and ready for analysis', isInitial: false, isTerminal: false, sortOrder: 2, isActive: true },
    { stateKey: 'analyzed', displayName: 'Analyzed', description: 'AI analysis has been completed', isInitial: false, isTerminal: false, sortOrder: 3, isActive: true },
    { stateKey: 'private_testing', displayName: 'Private Testing', description: 'Author testing narration with voice samples and refinements', isInitial: false, isTerminal: false, sortOrder: 4, isActive: true },
    { stateKey: 'collaborative_review', displayName: 'Collaborative Review', description: 'Friends and family invited to test story with their own voices', isInitial: false, isTerminal: false, sortOrder: 5, isActive: true },
    { stateKey: 'finalized', displayName: 'Finalized', description: 'Story completed with all feedback incorporated', isInitial: false, isTerminal: false, sortOrder: 6, isActive: true },
    { stateKey: 'published', displayName: 'Published', description: 'Story is published and visible to others', isInitial: false, isTerminal: true, sortOrder: 7, isActive: true }
  ],
  story_processing: [
    { stateKey: 'pending', displayName: 'Pending', description: 'Waiting for processing to begin', isInitial: true, isTerminal: false, sortOrder: 1, isActive: true },
    { stateKey: 'processing', displayName: 'Processing', description: 'Currently being processed', isInitial: false, isTerminal: false, sortOrder: 2, isActive: true },
    { stateKey: 'completed', displayName: 'Completed', description: 'Processing completed successfully', isInitial: false, isTerminal: true, sortOrder: 3, isActive: true },
    { stateKey: 'failed', displayName: 'Failed', description: 'Processing failed with error', isInitial: false, isTerminal: true, sortOrder: 4, isActive: true }
  ],
  story_instance: [
    { stateKey: 'draft', displayName: 'Draft', description: 'Instance is being created', isInitial: true, isTerminal: false, sortOrder: 1, isActive: true },
    { stateKey: 'recording', displayName: 'Recording', description: 'Voice recording phase', isInitial: false, isTerminal: false, sortOrder: 2, isActive: true },
    { stateKey: 'processing', displayName: 'Processing', description: 'Audio/video generation in progress', isInitial: false, isTerminal: false, sortOrder: 3, isActive: true },
    { stateKey: 'completed', displayName: 'Completed', description: 'Instance processing finished', isInitial: false, isTerminal: false, sortOrder: 4, isActive: true },
    { stateKey: 'published', displayName: 'Published', description: 'Instance is published and public', isInitial: false, isTerminal: true, sortOrder: 5, isActive: true }
  ],
  video_job: [
    { stateKey: 'queued', displayName: 'Queued', description: 'Job is waiting to be processed', isInitial: true, isTerminal: false, sortOrder: 1, isActive: true },
    { stateKey: 'processing', displayName: 'Processing', description: 'Video generation in progress', isInitial: false, isTerminal: false, sortOrder: 2, isActive: true },
    { stateKey: 'completed', displayName: 'Completed', description: 'Video generated successfully', isInitial: false, isTerminal: true, sortOrder: 3, isActive: true },
    { stateKey: 'failed', displayName: 'Failed', description: 'Video generation failed', isInitial: false, isTerminal: true, sortOrder: 4, isActive: true }
  ],
  voice_training: [
    { stateKey: 'pending', displayName: 'Pending', description: 'Voice training not yet started', isInitial: true, isTerminal: false, sortOrder: 1, isActive: true },
    { stateKey: 'training', displayName: 'Training', description: 'Voice cloning in progress', isInitial: false, isTerminal: false, sortOrder: 2, isActive: true },
    { stateKey: 'completed', displayName: 'Completed', description: 'Voice training completed successfully', isInitial: false, isTerminal: true, sortOrder: 3, isActive: true },
    { stateKey: 'failed', displayName: 'Failed', description: 'Voice training failed', isInitial: false, isTerminal: true, sortOrder: 4, isActive: true }
  ]
};

// Default state transitions for database seeding
export const DEFAULT_STATE_TRANSITIONS: Record<StateType, StateTransition[]> = {
  story: [
    { fromState: 'draft', toState: 'ready', isAutomatic: false, requiresPermission: false },
    { fromState: 'ready', toState: 'analyzed', isAutomatic: true, requiresPermission: false },
    { fromState: 'analyzed', toState: 'private_testing', isAutomatic: false, requiresPermission: false },
    { fromState: 'private_testing', toState: 'collaborative_review', isAutomatic: false, requiresPermission: false },
    { fromState: 'private_testing', toState: 'analyzed', isAutomatic: false, requiresPermission: false }, // Go back for refinement
    { fromState: 'collaborative_review', toState: 'finalized', isAutomatic: false, requiresPermission: false },
    { fromState: 'collaborative_review', toState: 'private_testing', isAutomatic: false, requiresPermission: false }, // Go back for changes
    { fromState: 'finalized', toState: 'published', isAutomatic: false, requiresPermission: false },
    { fromState: 'finalized', toState: 'collaborative_review', isAutomatic: false, requiresPermission: false }, // Go back for more feedback
    { fromState: 'analyzed', toState: 'published', isAutomatic: false, requiresPermission: false }, // Skip workflow
    { fromState: 'draft', toState: 'published', isAutomatic: false, requiresPermission: true } // Admin shortcut
  ],
  story_processing: [
    { fromState: 'pending', toState: 'processing', isAutomatic: true, requiresPermission: false },
    { fromState: 'processing', toState: 'completed', isAutomatic: true, requiresPermission: false },
    { fromState: 'processing', toState: 'failed', isAutomatic: true, requiresPermission: false }
  ],
  story_instance: [
    { fromState: 'draft', toState: 'recording', isAutomatic: false, requiresPermission: false },
    { fromState: 'recording', toState: 'processing', isAutomatic: false, requiresPermission: false },
    { fromState: 'processing', toState: 'completed', isAutomatic: true, requiresPermission: false },
    { fromState: 'completed', toState: 'published', isAutomatic: false, requiresPermission: false }
  ],
  video_job: [
    { fromState: 'queued', toState: 'processing', isAutomatic: true, requiresPermission: false },
    { fromState: 'processing', toState: 'completed', isAutomatic: true, requiresPermission: false },
    { fromState: 'processing', toState: 'failed', isAutomatic: true, requiresPermission: false }
  ],
  voice_training: [
    { fromState: 'pending', toState: 'training', isAutomatic: true, requiresPermission: false },
    { fromState: 'training', toState: 'completed', isAutomatic: true, requiresPermission: false },
    { fromState: 'training', toState: 'failed', isAutomatic: true, requiresPermission: false }
  ]
};