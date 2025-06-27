// Audio processing configuration
export interface AudioFormatSignature {
  name: string;
  extension: string;
  signatures: Array<{
    offset: number;
    pattern: string | Buffer;
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
        pattern: Buffer.from([0xFF, 0xE0]),
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
        pattern: Buffer.from([0x1A, 0x45, 0xDF, 0xA3]),
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
  
  // Minimum transcription length before considering it low quality
  minimumTranscriptionLength: 5,
  
  // Maximum file size for processing (in bytes)
  maxFileSizeBytes: 25 * 1024 * 1024, // 25MB - OpenAI's limit
  
  // Error messages
  errorMessages: {
    noSpeechDetected: "No clear speech was detected in your audio recording. Please ensure you speak clearly and loudly enough, and try again.",
    fileTooLarge: "Audio file is too large. Please upload a file smaller than 25MB.",
    unsupportedFormat: "Unsupported audio format. Please use one of: WAV, MP3, M4A, OGG, FLAC, or WebM."
  }
};