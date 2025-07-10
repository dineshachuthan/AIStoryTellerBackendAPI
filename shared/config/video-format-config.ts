/**
 * Video Format Detection Configuration
 * Provides data-driven format detection to eliminate hardcoded extensions
 */

export interface VideoFormatSignature {
  offset: number;
  pattern: number[] | string;
}

export interface VideoFormatConfig {
  name: string;
  extension: string;
  mimeType: string;
  signatures: VideoFormatSignature[];
  isSupported: boolean;
  quality: 'low' | 'medium' | 'high';
  compatibility: {
    web: boolean;
    mobile: boolean;
    desktop: boolean;
  };
}

export const VIDEO_FORMAT_CONFIG: VideoFormatConfig[] = [
  {
    name: 'MP4',
    extension: 'mp4',
    mimeType: 'video/mp4',
    signatures: [
      { offset: 4, pattern: 'ftyp' }, // ISO Base Media file format
      { offset: 4, pattern: [0x66, 0x74, 0x79, 0x70] }, // 'ftyp' in bytes
    ],
    isSupported: true,
    quality: 'high',
    compatibility: { web: true, mobile: true, desktop: true }
  },
  {
    name: 'WebM',
    extension: 'webm',
    mimeType: 'video/webm',
    signatures: [
      { offset: 0, pattern: [0x1A, 0x45, 0xDF, 0xA3] }, // EBML signature
    ],
    isSupported: true,
    quality: 'high',
    compatibility: { web: true, mobile: false, desktop: true }
  },
  {
    name: 'AVI',
    extension: 'avi',
    mimeType: 'video/x-msvideo',
    signatures: [
      { offset: 0, pattern: 'RIFF' },
      { offset: 8, pattern: 'AVI ' },
    ],
    isSupported: false,
    quality: 'medium',
    compatibility: { web: false, mobile: false, desktop: true }
  },
  {
    name: 'MOV',
    extension: 'mov',
    mimeType: 'video/quicktime',
    signatures: [
      { offset: 4, pattern: 'moov' },
      { offset: 4, pattern: 'mdat' },
      { offset: 4, pattern: 'free' },
    ],
    isSupported: false,
    quality: 'high',
    compatibility: { web: false, mobile: true, desktop: true }
  },
  {
    name: 'MKV',
    extension: 'mkv',
    mimeType: 'video/x-matroska',
    signatures: [
      { offset: 0, pattern: [0x1A, 0x45, 0xDF, 0xA3] }, // EBML signature (same as WebM)
    ],
    isSupported: false,
    quality: 'high',
    compatibility: { web: false, mobile: false, desktop: true }
  }
];

/**
 * Detect video format from buffer content
 */
export function detectVideoFormat(buffer: Buffer): VideoFormatConfig | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  const header = buffer.subarray(0, 32); // Check first 32 bytes

  for (const format of VIDEO_FORMAT_CONFIG) {
    let matches = true;

    for (const signature of format.signatures) {
      let signatureBuffer: Buffer;
      
      if (typeof signature.pattern === 'string') {
        signatureBuffer = Buffer.from(signature.pattern, 'ascii');
      } else {
        signatureBuffer = Buffer.from(signature.pattern);
      }

      const headerSection = header.subarray(
        signature.offset, 
        signature.offset + signatureBuffer.length
      );

      if (headerSection.length < signatureBuffer.length || !headerSection.equals(signatureBuffer)) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return format;
    }
  }

  return null;
}

/**
 * Get format from file extension (fallback method)
 */
export function getFormatFromExtension(extension: string): VideoFormatConfig | null {
  const cleanExt = extension.toLowerCase().replace('.', '');
  return VIDEO_FORMAT_CONFIG.find(format => format.extension === cleanExt) || null;
}

/**
 * Get preferred format for web delivery
 */
export function getPreferredWebFormat(): VideoFormatConfig {
  return VIDEO_FORMAT_CONFIG.find(format => 
    format.extension === 'mp4' && format.isSupported
  )!;
}

/**
 * Detect format from buffer with filename fallback
 */
export function detectFormatWithFallback(buffer: Buffer, fileName?: string): VideoFormatConfig | null {
  // Try buffer detection first
  const bufferFormat = detectVideoFormat(buffer);
  if (bufferFormat) {
    return bufferFormat;
  }

  // Fallback to extension detection
  if (fileName) {
    const extension = fileName.split('.').pop();
    if (extension) {
      return getFormatFromExtension(extension);
    }
  }

  return null;
}

/**
 * Video format validation settings
 */
export const VIDEO_FORMAT_VALIDATION = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MIN_FILE_SIZE: 1024, // 1KB
  SUPPORTED_FORMATS: VIDEO_FORMAT_CONFIG.filter(f => f.isSupported).map(f => f.extension),
  WEB_SAFE_FORMATS: VIDEO_FORMAT_CONFIG.filter(f => f.compatibility.web).map(f => f.extension),
  PREFERRED_FORMAT: 'mp4'
};