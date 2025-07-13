// User session metadata types
export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  osVersion?: string;
  brand?: string; // Samsung, Apple, etc.
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
}

export interface NetworkInfo {
  connection?: string;
  effectiveType?: string;
}

export interface UserSessionMetadata {
  userId: string;
  deviceInfo: DeviceInfo;
  browserInfo: BrowserInfo;
  networkInfo: NetworkInfo;
  capabilities: {
    webRTC: boolean;
    mediaRecorder: boolean;
    audioContext: boolean;
    serviceWorker: boolean;
  };
  preferences: {
    audioQuality: 'high' | 'medium' | 'low';
    autoPlay: boolean;
    dataUsage: 'unlimited' | 'limited';
  };
  sessionId: string;
  timestamp: number;
}

export interface SessionBasedConfig {
  audio: {
    preferredFormats: string[];
    fallbackFormats: string[];
    bitRate: number;
    sampleRate: number;
    chunkInterval: number;
  };
  ui: {
    showAdvancedControls: boolean;
    enableVisualFeedback: boolean;
    adaptiveLayout: boolean;
  };
  network: {
    enableCaching: boolean;
    compressionLevel: number;
    retryAttempts: number;
  };
}

// Configuration rules based on session metadata
export interface ConfigurationRule {
  id: string;
  priority: number;
  conditions: {
    deviceType?: string[];
    browserName?: string[];
    osName?: string[];
    networkType?: string[];
  };
  config: Partial<SessionBasedConfig>;
  description: string;
}