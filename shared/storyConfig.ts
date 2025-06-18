// Story configuration settings
export interface StoryConfig {
  writtenStory: {
    minWords: number;
    maxWords: number;
    label: string;
  };
  voiceRecord: {
    maxDurationMinutes: number;
    label: string;
  };
  uploadText: {
    maxWords: number;
    label: string;
    supportedFormats: string[];
  };
  uploadAudio: {
    maxDurationMinutes: number;
    label: string;
    supportedFormats: string[];
  };
}

export const defaultStoryConfig: StoryConfig = {
  writtenStory: {
    minWords: 500,
    maxWords: 1000,
    label: "Write 500-1000 Word Story"
  },
  voiceRecord: {
    maxDurationMinutes: 1,
    label: "Voice Record Short Story"
  },
  uploadText: {
    maxWords: 1000,
    label: "Upload Text/PDF (<1000 words)",
    supportedFormats: ['.txt', '.pdf', '.doc', '.docx']
  },
  uploadAudio: {
    maxDurationMinutes: 7, // ~1000 words at average speaking pace (140-150 words/minute)
    label: "Upload Audio (<7 min)",
    supportedFormats: ['.mp3', '.wav', '.m4a', '.ogg']
  }
};

// Helper functions
export const getWordCount = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} seconds`;
  }
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
};

export const validateStoryLength = (text: string, config: StoryConfig['writtenStory']): { isValid: boolean; message?: string } => {
  const wordCount = getWordCount(text);
  
  if (wordCount < config.minWords) {
    return {
      isValid: false,
      message: `Story must be at least ${config.minWords} words. Current: ${wordCount} words.`
    };
  }
  
  if (wordCount > config.maxWords) {
    return {
      isValid: false,
      message: `Story exceeds maximum ${config.maxWords} words. Current: ${wordCount} words.`
    };
  }
  
  return { isValid: true };
};

export const validateUploadLength = (text: string, config: StoryConfig['uploadText']): { isValid: boolean; message?: string } => {
  const wordCount = getWordCount(text);
  
  if (wordCount > config.maxWords) {
    return {
      isValid: false,
      message: `Uploaded content exceeds maximum ${config.maxWords} words. Current: ${wordCount} words.`
    };
  }
  
  return { isValid: true };
};

export const validateAudioDuration = (durationMinutes: number, config: StoryConfig['uploadAudio']): { isValid: boolean; message?: string } => {
  if (durationMinutes > config.maxDurationMinutes) {
    return {
      isValid: false,
      message: `Audio duration exceeds maximum ${config.maxDurationMinutes} minutes. Current: ${Math.round(durationMinutes * 10) / 10} minutes.`
    };
  }
  
  return { isValid: true };
};

export const estimateWordsFromAudioDuration = (durationMinutes: number): number => {
  // Average speaking pace is 140-150 words per minute
  const averageWordsPerMinute = 145;
  return Math.round(durationMinutes * averageWordsPerMinute);
};