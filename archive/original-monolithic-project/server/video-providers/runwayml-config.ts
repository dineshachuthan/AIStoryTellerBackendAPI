export interface RunwayMLConfig {
  apiVersion: string;
  baseUrl: string;
  maxDuration: number;
  defaultDuration: number;
  models: {
    gen3a_turbo: {
      name: string;
      supportedAspectRatios: string[];
      costMultiplier: number;
      available: boolean;
    };
  };
  sizeLimits: {
    dataUriMaxSize: number; // in bytes
    urlMaxSize: number; // in bytes
  };
  supportedFormats: string[];
  resolution: {
    low: {
      width: number;
      height: number;
      aspectRatios: Record<string, string>;
    };
    standard: {
      width: number;
      height: number;
      aspectRatios: Record<string, string>;
    };
    high: {
      width: number;
      height: number;
      aspectRatios: Record<string, string>;
    };
  };
  defaultResolution: 'low' | 'standard' | 'high';
  defaultModel: 'gen3a_turbo';
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  timeout: {
    requestTimeout: number;
    generationTimeout: number;
  };
}

export const runwayMLConfig: RunwayMLConfig = {
  apiVersion: '2024-11-06',
  baseUrl: 'https://api.dev.runwayml.com',
  
  // Cost control settings
  maxDuration: 10, // Maximum video duration in seconds
  defaultDuration: 5, // Default duration for requests
  
  // Available models for image_to_video endpoint
  models: {
    gen3a_turbo: {
      name: 'gen3a_turbo',
      supportedAspectRatios: ['1280:768', '768:1280'],
      costMultiplier: 1.0,
      available: true
    }
  },
  
  sizeLimits: {
    dataUriMaxSize: 3.3 * 1024 * 1024, // 3.3MB for data URI (base64 overhead)
    urlMaxSize: 16 * 1024 * 1024 // 16MB for direct URLs
  },
  
  supportedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  
  // Resolution settings - configurable for cost control
  resolution: {
    // Low resolution for cost savings (50% of standard)
    low: {
      width: 640,
      height: 384,
      aspectRatios: {
        '16:9': '640:384',
        '9:16': '384:640', 
        '1:1': '512:512',
        '4:3': '512:384',
        '3:4': '384:512'
      }
    },
    // Standard resolution 
    standard: {
      width: 1280,
      height: 768,
      aspectRatios: {
        '16:9': '1280:768',
        '9:16': '768:1280', 
        '1:1': '1024:1024',
        '4:3': '1024:768',
        '3:4': '768:1024'
      }
    },
    // High resolution (RunwayML native resolution)
    high: {
      width: 1280,
      height: 768,
      aspectRatios: {
        '16:9': '1280:768',
        '9:16': '768:1280', 
        '1:1': '1280:768', // Use landscape for square on high
        '4:3': '1280:768',
        '3:4': '768:1280'
      }
    }
  },
  
  // Default resolution tier (change this to control cost)
  defaultResolution: 'low', // Options: 'low', 'standard', 'high'
  
  // Default model (change this to control cost and quality)
  defaultModel: 'gen3a_turbo', // Currently only gen3a_turbo is available
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: 10,
    burstLimit: 3
  },
  
  // Timeout settings
  timeout: {
    requestTimeout: 30000, // 30 seconds for API requests
    generationTimeout: 300000 // 5 minutes for video generation
  }
};

export const runwayMLGen4Config = {
  ...runwayMLConfig,
  aspectRatioMappings: {
    // Gen-4 Turbo specific mappings
    '16:9': '1280:720',
    '9:16': '720:1280',
    '1:1': '960:960',
    'landscape': '1280:720',
    'portrait': '720:1280'
  }
};