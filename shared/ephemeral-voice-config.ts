/**
 * Ephemeral Voice System Configuration
 * Treats ElevenLabs voices as temporary resources to bypass voice count limits
 */

export interface EmotionSample {
  id: string;
  emotion: string;
  displayName: string;
  description: string;
  exampleText: string;
  minDuration: number;
  maxDuration: number;
  icon: string;
}

export const GLOBAL_EMOTION_SAMPLES: EmotionSample[] = [
  {
    id: 'happy',
    emotion: 'happy',
    displayName: 'Happy',
    description: 'Express joy, excitement, and positive energy',
    exampleText: 'The sun broke through the clouds, and I couldn\'t help but smile. Everything felt perfect in that moment - the warm breeze, the birds singing, and the feeling that anything was possible.',
    minDuration: 15,
    maxDuration: 25,
    icon: '😊'
  },
  {
    id: 'sad',
    emotion: 'sad',
    displayName: 'Sad',
    description: 'Convey sorrow, melancholy, or disappointment',
    exampleText: 'The rain matched my mood perfectly. I sat by the window, watching droplets race down the glass, thinking about all the things I wished I could have said before it was too late.',
    minDuration: 15,
    maxDuration: 25,
    icon: '😢'
  },
  {
    id: 'angry',
    emotion: 'angry',
    displayName: 'Angry',
    description: 'Show frustration, anger, or intense emotion',
    exampleText: 'I couldn\'t believe they had done this again! My fists clenched as I tried to control my breathing. How many times would I have to explain before they finally understood?',
    minDuration: 15,
    maxDuration: 25,
    icon: '😠'
  },
  {
    id: 'fear',
    emotion: 'fear',
    displayName: 'Fearful',
    description: 'Express worry, anxiety, or fear',
    exampleText: 'My heart pounded as I heard footsteps in the hallway. Was someone there? I held my breath, listening intently, every shadow seeming to move in the corner of my eye.',
    minDuration: 15,
    maxDuration: 25,
    icon: '😨'
  },
  {
    id: 'surprised',
    emotion: 'surprised',
    displayName: 'Surprised',
    description: 'Show shock, amazement, or unexpected discovery',
    exampleText: 'I couldn\'t believe my eyes! There it was, right in front of me - the thing I\'d been searching for all these years. How had I missed it before? This changed everything!',
    minDuration: 15,
    maxDuration: 25,
    icon: '😲'
  },
  {
    id: 'disgust',
    emotion: 'disgust',
    displayName: 'Disgusted',
    description: 'Express revulsion or strong disapproval',
    exampleText: 'The smell hit me like a wall, and I had to cover my nose. How could anyone live like this? I stepped carefully through the mess, trying not to touch anything.',
    minDuration: 15,
    maxDuration: 25,
    icon: '🤢'
  },
  {
    id: 'neutral',
    emotion: 'neutral',
    displayName: 'Neutral',
    description: 'Calm, balanced, everyday speaking voice',
    exampleText: 'The meeting was scheduled for three o\'clock in the conference room. I gathered my notes and made sure I had everything prepared. It was going to be a long afternoon of discussions.',
    minDuration: 15,
    maxDuration: 25,
    icon: '😐'
  },
  {
    id: 'excited',
    emotion: 'excited',
    displayName: 'Excited',
    description: 'High energy, enthusiastic delivery',
    exampleText: 'This is it! The moment we\'ve all been waiting for! I can barely contain myself - after months of preparation, it\'s finally happening! Are you ready? Let\'s do this!',
    minDuration: 15,
    maxDuration: 25,
    icon: '🤩'
  },
  {
    id: 'thoughtful',
    emotion: 'thoughtful',
    displayName: 'Thoughtful',
    description: 'Contemplative, reflective tone',
    exampleText: 'Sometimes I wonder about the choices we make. Each decision leads us down a different path, and we can never truly know what might have been. It\'s both terrifying and beautiful.',
    minDuration: 15,
    maxDuration: 25,
    icon: '🤔'
  },
  {
    id: 'confident',
    emotion: 'confident',
    displayName: 'Confident',
    description: 'Strong, assured, authoritative voice',
    exampleText: 'I know exactly what needs to be done, and I\'m the person to do it. Years of experience have prepared me for this moment. Watch and learn - this is how it\'s done properly.',
    minDuration: 15,
    maxDuration: 25,
    icon: '💪'
  }
];

export const EPHEMERAL_VOICE_CONFIG = {
  // Minimum samples required to create a voice
  MIN_SAMPLES_FOR_VOICE: 5,
  
  // Maximum samples to use (ElevenLabs limit)
  MAX_SAMPLES_PER_VOICE: 25,
  
  // Voice session settings
  SESSION_SETTINGS: {
    // How long to keep voice before deletion (milliseconds)
    VOICE_RETENTION_TIME: 5 * 60 * 1000, // 5 minutes
    
    // Batch size for narration generation
    NARRATION_BATCH_SIZE: 10,
    
    // Maximum concurrent narration generations
    MAX_CONCURRENT_GENERATIONS: 3
  },
  
  // Achievement thresholds
  ACHIEVEMENTS: {
    FIRST_RECORDING: 1,
    EMOTION_EXPLORER: 5,
    VOICE_MASTER: 10,
    EXPRESSIVE_EXPERT: {
      threshold: 8,
      minQuality: 0.8
    }
  },
  
  // Gamification messages
  MESSAGES: {
    UNLOCK_MESSAGES: [
      'Great job! You\'ve unlocked the {emotion} emotion!',
      'Fantastic! Your voice range is expanding!',
      'Amazing expression! Keep going!',
      'You\'re becoming a voice acting pro!'
    ],
    ACHIEVEMENT_MESSAGES: {
      FIRST_RECORDING: 'Voice Journey Begun! You\'ve taken your first step.',
      EMOTION_EXPLORER: 'Emotion Explorer! You\'ve recorded 5 different emotions.',
      VOICE_MASTER: 'Voice Master! All emotions unlocked!',
      EXPRESSIVE_EXPERT: 'Expressive Expert! Your voice quality is exceptional!'
    }
  }
};

export type VoiceAchievement = keyof typeof EPHEMERAL_VOICE_CONFIG.ACHIEVEMENTS;