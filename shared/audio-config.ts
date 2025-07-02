// Audio processing configuration
export interface AudioFormatSignature {
  name: string;
  extension: string;
  signatures: Array<{
    offset: number;
    pattern: string | Uint8Array;
    description: string;
  }>;
}

export const AUDIO_FORMAT_CONFIG: AudioFormatSignature[] = [
  {
    name: 'WAV',
    extension: 'wav',
    signatures: [
      {
        offset: 0,
        pattern: 'RIFF',
        description: 'RIFF header'
      },
      {
        offset: 8,
        pattern: 'WAVE',
        description: 'WAVE format'
      }
    ]
  },
  {
    name: 'MP3',
    extension: 'mp3',
    signatures: [
      {
        offset: 0,
        pattern: 'ID3',
        description: 'ID3 tag'
      },
      {
        offset: 0,
        pattern: new Uint8Array([0xFF, 0xE0]),
        description: 'MP3 frame sync (partial)'
      }
    ]
  },
  {
    name: 'M4A',
    extension: 'm4a',
    signatures: [
      {
        offset: 4,
        pattern: 'ftyp',
        description: 'MP4 file type box'
      }
    ]
  },
  {
    name: 'OGG',
    extension: 'ogg',
    signatures: [
      {
        offset: 0,
        pattern: 'OggS',
        description: 'Ogg page header'
      }
    ]
  },
  {
    name: 'FLAC',
    extension: 'flac',
    signatures: [
      {
        offset: 0,
        pattern: 'fLaC',
        description: 'FLAC signature'
      }
    ]
  },
  {
    name: 'WebM',
    extension: 'webm',
    signatures: [
      {
        offset: 0,
        pattern: new Uint8Array([0x1A, 0x45, 0xDF, 0xA3]),
        description: 'EBML/Matroska/WebM header'
      }
    ]
  }
];

export const AUDIO_PROCESSING_CONFIG = {
  // Default format when detection fails
  defaultFormat: 'wav',
  
  // Supported formats by OpenAI Whisper
  supportedFormats: ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'],
  
  // Preferred recording formats (in order of preference for MediaRecorder)
  preferredRecordingFormats: [
    'audio/wav',
    'audio/mp4', 
    'audio/ogg',
    'audio/webm'
  ],
  
  // Fallback recording format
  fallbackRecordingFormat: 'audio/webm',
  
  // Minimum transcription length before considering it low quality
  minimumTranscriptionLength: 5,
  
  // Maximum file size for processing (in bytes)
  maxFileSizeBytes: 25 * 1024 * 1024, // 25MB - OpenAI's limit
  
  // Voice recording configuration
  recording: {
    defaultDuration: 10, // seconds
    maxDuration: 60, // seconds
    defaultFormat: 'webm', // determined by browser capabilities
  },

  // API endpoints
  endpoints: {
    voiceModulations: '/api/voice-modulations/record',
    voiceModulationsDelete: '/api/voice-modulations/delete',
    voiceModulationsProgress: '/api/voice-modulations/progress',
    voiceModulationsTemplates: '/api/voice-modulations/templates',
  },

  // Error codes for i18n
  errorCodes: {
    noSpeechDetected: "NO_SPEECH_DETECTED",
    fileTooLarge: "FILE_TOO_LARGE", 
    unsupportedFormat: "UNSUPPORTED_FORMAT",
    saveVoiceModulationFailed: "VOICE_SAVE_FAILED",
    deleteVoiceModulationFailed: "VOICE_DELETE_FAILED",
    voiceCloningTriggerFailed: "VOICE_CLONING_TRIGGER_FAILED",
  },

  // Success codes for i18n
  successCodes: {
    voiceSaved: "VOICE_SAVED",
    voiceDeleted: "VOICE_DELETED",
  }
};