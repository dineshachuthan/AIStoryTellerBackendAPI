// Configuration-driven collaborative roleplay system
export interface CollaborativeConfig {
  template: {
    maxCharacters: number;
    minCharacters: number;
    defaultEstimatedDuration: number; // minutes
    supportedGenres: string[];
  };
  
  instance: {
    statusFlow: Record<string, string[]>; // valid transitions
    progressThresholds: {
      voice: number; // percentage for voice completion
      photo: number; // percentage for photo completion
      minimum: number; // minimum progress to mark as complete
    };
    maxParticipants: number;
    invitationTokenLength: number;
    invitationExpiryDays: number;
  };
  
  participation: {
    userTypes: {
      registered: {
        canCreateTemplates: boolean;
        canCreateInstances: boolean;
        voiceStorageLimit: number; // MB
        photoStorageLimit: number; // MB
        features: string[];
      };
      guest: {
        canCreateTemplates: boolean;
        canCreateInstances: boolean;
        voiceStorageLimit: number; // MB
        photoStorageLimit: number; // MB
        features: string[];
        sessionExpiryHours: number;
      };
    };
    requiredFields: {
      registered: string[];
      guest: string[];
    };
  };
  
  media: {
    voice: {
      supportedFormats: string[];
      maxFileSize: number; // MB
      maxDuration: number; // seconds
      sampleRate: number;
      quality: string;
    };
    photo: {
      supportedFormats: string[];
      maxFileSize: number; // MB
      maxDimensions: { width: number; height: number };
      quality: number; // 0-100
    };
  };
  
  emotions: {
    defaults: Array<{
      name: string;
      defaultIntensity: number;
      category: string;
      aiVoiceMapping: Record<string, string>; // character type -> voice
    }>;
    intensityRange: { min: number; max: number };
    maxEmotionsPerCharacter: number;
  };
  
  notifications: {
    templates: Record<string, {
      title: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error';
    }>;
  };
  
  ui: {
    theme: {
      primaryColor: string;
      gradients: Record<string, string>;
      iconMappings: Record<string, string>;
    };
    layout: {
      cardGridCols: { mobile: number; tablet: number; desktop: number };
      maxContentWidth: string;
      spacingUnit: number;
    };
  };
}

export const defaultCollaborativeConfig: CollaborativeConfig = {
  template: {
    maxCharacters: 8,
    minCharacters: 2,
    defaultEstimatedDuration: 15,
    supportedGenres: [
      'fantasy', 'science-fiction', 'mystery', 'romance', 'adventure',
      'comedy', 'drama', 'horror', 'historical', 'contemporary'
    ]
  },
  
  instance: {
    // Status flow moved to database-driven StateManager
    // Use stateManager.getValidTransitionsFrom('story_instance', currentState) instead
    progressThresholds: {
      voice: 70,
      photo: 30,
      minimum: 90
    },
    maxParticipants: 8,
    invitationTokenLength: 32,
    invitationExpiryDays: 30
  },
  
  participation: {
    userTypes: {
      registered: {
        canCreateTemplates: true,
        canCreateInstances: true,
        voiceStorageLimit: 100,
        photoStorageLimit: 50,
        features: [
          'unlimited_stories', 'advanced_editing', 'collaboration_management',
          'export_options', 'premium_voices', 'custom_emotions'
        ]
      },
      guest: {
        canCreateTemplates: false,
        canCreateInstances: false,
        voiceStorageLimit: 10,
        photoStorageLimit: 5,
        features: ['basic_recording', 'single_story_access'],
        sessionExpiryHours: 48
      }
    },
    requiredFields: {
      registered: ['userId'],
      guest: ['guestName']
    }
  },
  
  media: {
    voice: {
      supportedFormats: ['wav', 'mp3', 'ogg', 'webm'],
      maxFileSize: 10,
      maxDuration: 30,
      sampleRate: 44100,
      quality: 'high'
    },
    photo: {
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      maxFileSize: 5,
      maxDimensions: { width: 1920, height: 1080 },
      quality: 85
    }
  },
  
  emotions: {
    // Emotion defaults moved to database-driven ESM system
    // Use database queries on user_esm table for emotion categories and mappings
    intensityRange: { min: 1, max: 10 },
    maxEmotionsPerCharacter: 5
  },
  
  notifications: {
    templates: {
      invitationAccepted: {
        title: 'Invitation Accepted',
        message: 'You can now record your voice samples and upload your character photo.',
        type: 'success'
      },
      voiceRecorded: {
        title: 'Voice Sample Recorded',
        message: 'Voice sample for {emotion} emotion recorded successfully!',
        type: 'success'
      },
      photoUploaded: {
        title: 'Photo Uploaded',
        message: 'Character photo uploaded successfully!',
        type: 'success'
      },
      allCompleted: {
        title: 'Recording Complete',
        message: 'All requirements completed! Your story is being processed.',
        type: 'success'
      },
      invitationError: {
        title: 'Invitation Error',
        message: 'Invalid or expired invitation link.',
        type: 'error'
      },
      guestLimitation: {
        title: 'Guest Access',
        message: 'As a guest, your recordings are temporary and only accessible for this story.',
        type: 'warning'
      }
    }
  },
  
  ui: {
    theme: {
      primaryColor: 'purple',
      gradients: {
        background: 'from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800',
        card: 'from-white to-gray-50 dark:from-gray-800 dark:to-gray-900',
        button: 'from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
      },
      iconMappings: {
        user: 'User',
        voice: 'Mic',
        photo: 'Camera',
        success: 'CheckCircle',
        time: 'Clock',
        email: 'Mail'
      }
    },
    layout: {
      cardGridCols: { mobile: 1, tablet: 2, desktop: 3 },
      maxContentWidth: '4xl',
      spacingUnit: 4
    }
  }
};

// Environment-specific configuration overrides
export const getCollaborativeConfig = (): CollaborativeConfig => {
  const baseConfig = { ...defaultCollaborativeConfig };
  
  // Apply environment-specific overrides
  if (typeof window !== 'undefined') {
    // Client-side environment variables
    const env = import.meta.env;
    
    if (env.VITE_MAX_VOICE_FILE_SIZE) {
      baseConfig.media.voice.maxFileSize = parseInt(env.VITE_MAX_VOICE_FILE_SIZE);
    }
    
    if (env.VITE_MAX_PHOTO_FILE_SIZE) {
      baseConfig.media.photo.maxFileSize = parseInt(env.VITE_MAX_PHOTO_FILE_SIZE);
    }
  } else {
    // Server-side environment variables
    const env = process.env;
    
    if (env.MAX_PARTICIPANTS) {
      baseConfig.instance.maxParticipants = parseInt(env.MAX_PARTICIPANTS);
    }
    
    if (env.INVITATION_EXPIRY_DAYS) {
      baseConfig.instance.invitationExpiryDays = parseInt(env.INVITATION_EXPIRY_DAYS);
    }
    
    if (env.GUEST_SESSION_HOURS) {
      baseConfig.participation.userTypes.guest.sessionExpiryHours = parseInt(env.GUEST_SESSION_HOURS);
    }
  }
  
  return baseConfig;
};

// Utility functions for configuration-driven behavior
export const getNotificationTemplate = (key: string, variables: Record<string, string> = {}) => {
  const config = getCollaborativeConfig();
  const template = config.notifications.templates[key];
  
  if (!template) return null;
  
  let message = template.message;
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(`{${key}}`, value);
  });
  
  return { ...template, message };
};

export const validateMediaFile = (file: File, type: 'voice' | 'photo') => {
  const config = getCollaborativeConfig();
  const mediaConfig = config.media[type];
  
  const errors: string[] = [];
  
  // Check file size
  if (file.size > mediaConfig.maxFileSize * 1024 * 1024) {
    errors.push(`File size must be less than ${mediaConfig.maxFileSize}MB`);
  }
  
  // Check file format
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !mediaConfig.supportedFormats.includes(extension)) {
    errors.push(`Supported formats: ${mediaConfig.supportedFormats.join(', ')}`);
  }
  
  return { isValid: errors.length === 0, errors };
};

export const canUserPerformAction = (userType: 'registered' | 'guest', action: string) => {
  const config = getCollaborativeConfig();
  return config.participation.userTypes[userType].features.includes(action);
};

export const getProgressThreshold = (type: 'voice' | 'photo' | 'minimum') => {
  const config = getCollaborativeConfig();
  return config.instance.progressThresholds[type];
};

export const getDefaultEmotionsForCharacter = (characterType: string) => {
  const config = getCollaborativeConfig();
  return config.emotions.defaults.map(emotion => ({
    ...emotion,
    aiVoice: emotion.aiVoiceMapping[characterType] || emotion.aiVoiceMapping['adult']
  }));
};