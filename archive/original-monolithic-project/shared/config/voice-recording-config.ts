/**
 * Voice Recording Configuration
 * Centralized configuration for voice recording durations and text generation
 */

export const VOICE_RECORDING_CONFIG = {
  // Duration limits in seconds
  MIN_DURATION: 15,
  MAX_DURATION: 25,
  
  // Text generation parameters (for speech at ~3 words/second)
  MIN_WORDS: 45,  // 15 seconds * 3 words/second
  MAX_WORDS: 60,  // Allows for natural pauses and emotion
  
  // Display messages
  DURATION_REQUIREMENTS: '15-25 seconds',
  
  // Speech rate for calculations
  WORDS_PER_SECOND: 3
};

export type VoiceRecordingConfig = typeof VOICE_RECORDING_CONFIG;