import type { 
  UserSessionMetadata, 
  SessionBasedConfig, 
  ConfigurationRule 
} from '@shared/userSession';
import type { PlatformAudioConfig } from '@shared/audioConfig';

export class ConfigurationEngine {
  private rules: ConfigurationRule[] = [];
  private defaultConfig: SessionBasedConfig;

  constructor() {
    this.defaultConfig = {
      audio: {
        preferredFormats: ['audio/webm;codecs=opus', 'audio/mp4'],
        fallbackFormats: ['audio/wav'],
        bitRate: 128000,
        sampleRate: 44100,
        chunkInterval: 1000
      },
      ui: {
        showAdvancedControls: true,
        enableVisualFeedback: true,
        adaptiveLayout: false
      },
      network: {
        enableCaching: true,
        compressionLevel: 5,
        retryAttempts: 3
      }
    };

    this.initializeRules();
  }

  private initializeRules(): void {
    this.rules = [
      {
        id: 'ios_safari_optimization',
        priority: 1,
        conditions: {
          deviceType: ['mobile', 'tablet'],
          browserName: ['Safari'],
          osName: ['iOS', 'iPadOS']
        },
        config: {
          audio: {
            preferredFormats: ['audio/mp4', 'audio/wav'],
            fallbackFormats: ['audio/webm'],
            bitRate: 96000,
            sampleRate: 44100,
            chunkInterval: 2000
          },
          ui: {
            adaptiveLayout: true,
            showAdvancedControls: false,
            enableVisualFeedback: true
          }
        },
        description: 'iOS Safari optimizations for audio recording'
      },
      {
        id: 'android_chrome_optimization',
        priority: 2,
        conditions: {
          deviceType: ['mobile'],
          browserName: ['Chrome'],
          osName: ['Android']
        },
        config: {
          audio: {
            preferredFormats: ['audio/webm;codecs=opus', 'audio/webm'],
            fallbackFormats: ['audio/mp4'],
            bitRate: 128000,
            sampleRate: 44100,
            chunkInterval: 1000
          },
          network: {
            enableCaching: true,
            compressionLevel: 7,
            retryAttempts: 3
          }
        },
        description: 'Android Chrome optimizations'
      },
      {
        id: 'samsung_device_optimization',
        priority: 3,
        conditions: {
          deviceType: ['mobile'],
          osName: ['Android']
        },
        config: {
          audio: {
            preferredFormats: ['audio/webm', 'audio/mp4'],
            fallbackFormats: ['audio/wav'],
            bitRate: 96000,
            sampleRate: 44100,
            chunkInterval: 1000
          },
          ui: {
            showAdvancedControls: true,
            enableVisualFeedback: true,
            adaptiveLayout: true
          }
        },
        description: 'Samsung Android device optimizations'
      },
      {
        id: 'low_bandwidth_optimization',
        priority: 4,
        conditions: {
          networkType: ['2g', 'slow-2g', 'limited']
        },
        config: {
          audio: {
            preferredFormats: ['audio/webm', 'audio/mp4'],
            fallbackFormats: ['audio/wav'],
            bitRate: 64000,
            sampleRate: 22050,
            chunkInterval: 2000
          },
          network: {
            enableCaching: true,
            compressionLevel: 9,
            retryAttempts: 5
          },
          ui: {
            showAdvancedControls: false,
            enableVisualFeedback: false,
            adaptiveLayout: true
          }
        },
        description: 'Low bandwidth network optimizations'
      },
      {
        id: 'desktop_firefox_optimization',
        priority: 5,
        conditions: {
          deviceType: ['desktop'],
          browserName: ['Firefox']
        },
        config: {
          audio: {
            preferredFormats: ['audio/ogg;codecs=opus', 'audio/webm'],
            fallbackFormats: ['audio/wav'],
            bitRate: 128000
          }
        },
        description: 'Desktop Firefox optimizations'
      },
      {
        id: 'high_quality_desktop',
        priority: 6,
        conditions: {
          deviceType: ['desktop']
        },
        config: {
          audio: {
            bitRate: 192000,
            sampleRate: 48000,
            chunkInterval: 500
          },
          ui: {
            showAdvancedControls: true,
            enableVisualFeedback: true
          },
          network: {
            compressionLevel: 3
          }
        },
        description: 'High quality settings for desktop'
      }
    ];
  }

  generateConfig(sessionMetadata: UserSessionMetadata): SessionBasedConfig {
    const applicableRules = this.findApplicableRules(sessionMetadata);
    
    // Start with default config
    let finalConfig = this.deepClone(this.defaultConfig);
    
    // Apply rules in priority order (lower number = higher priority)
    applicableRules
      .sort((a, b) => a.priority - b.priority)
      .forEach(rule => {
        finalConfig = this.mergeConfigs(finalConfig, rule.config);
      });

    // Apply user preferences
    finalConfig = this.applyUserPreferences(finalConfig, sessionMetadata);
    
    return finalConfig;
  }

  private findApplicableRules(sessionMetadata: UserSessionMetadata): ConfigurationRule[] {
    return this.rules.filter(rule => this.isRuleApplicable(rule, sessionMetadata));
  }

  private isRuleApplicable(rule: ConfigurationRule, sessionMetadata: UserSessionMetadata): boolean {
    const { conditions } = rule;
    const { deviceInfo, browserInfo, networkInfo } = sessionMetadata;

    // Check device type
    if (conditions.deviceType && !conditions.deviceType.includes(deviceInfo.type)) {
      return false;
    }

    // Check browser name
    if (conditions.browserName && !conditions.browserName.includes(browserInfo.name)) {
      return false;
    }

    // Check OS name
    if (conditions.osName && !conditions.osName.includes(deviceInfo.os)) {
      return false;
    }

    // Check network type
    if (conditions.networkType) {
      const networkType = networkInfo.effectiveType || 'unknown';
      if (!conditions.networkType.includes(networkType)) {
        return false;
      }
    }

    return true;
  }

  private mergeConfigs(base: SessionBasedConfig, override: Partial<SessionBasedConfig>): SessionBasedConfig {
    const merged = this.deepClone(base);
    
    if (override.audio) {
      merged.audio = { ...merged.audio, ...override.audio };
    }
    
    if (override.ui) {
      merged.ui = { ...merged.ui, ...override.ui };
    }
    
    if (override.network) {
      merged.network = { ...merged.network, ...override.network };
    }
    
    return merged;
  }

  private applyUserPreferences(config: SessionBasedConfig, sessionMetadata: UserSessionMetadata): SessionBasedConfig {
    const { preferences } = sessionMetadata;
    const adjustedConfig = this.deepClone(config);

    // Adjust based on audio quality preference
    if (preferences.audioQuality === 'low') {
      adjustedConfig.audio.bitRate = Math.min(adjustedConfig.audio.bitRate, 64000);
      adjustedConfig.audio.sampleRate = Math.min(adjustedConfig.audio.sampleRate, 22050);
    } else if (preferences.audioQuality === 'medium') {
      adjustedConfig.audio.bitRate = Math.min(adjustedConfig.audio.bitRate, 128000);
      adjustedConfig.audio.sampleRate = Math.min(adjustedConfig.audio.sampleRate, 44100);
    }

    // Adjust based on data usage preference
    if (preferences.dataUsage === 'limited') {
      adjustedConfig.audio.bitRate = Math.min(adjustedConfig.audio.bitRate, 96000);
      adjustedConfig.network.enableCaching = true;
      adjustedConfig.network.compressionLevel = Math.max(adjustedConfig.network.compressionLevel, 7);
    }

    return adjustedConfig;
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  // Add custom rule at runtime
  addRule(rule: ConfigurationRule): void {
    this.rules.push(rule);
  }

  // Remove rule by ID
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  // Get applicable rules for debugging
  getApplicableRules(sessionMetadata: UserSessionMetadata): ConfigurationRule[] {
    return this.findApplicableRules(sessionMetadata);
  }
}