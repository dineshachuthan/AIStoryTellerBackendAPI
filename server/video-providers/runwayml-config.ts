export interface RunwayMLConfig {
  apiVersion: string;
  supportedAspectRatios: {
    gen3a_turbo: string[];
    gen4_turbo: string[];
  };
  sizeLimits: {
    dataUriMaxSize: number; // in bytes
    urlMaxSize: number; // in bytes
  };
  supportedFormats: string[];
  aspectRatioMappings: Record<string, string>;
}

export const runwayMLConfig: RunwayMLConfig = {
  apiVersion: '2024-11-06',
  
  supportedAspectRatios: {
    gen3a_turbo: ['1280:768', '768:1280'],
    gen4_turbo: ['1280:720', '1584:672', '1104:832', '720:1280', '832:1104', '960:960']
  },
  
  sizeLimits: {
    dataUriMaxSize: 3.3 * 1024 * 1024, // 3.3MB for data URI (base64 overhead)
    urlMaxSize: 16 * 1024 * 1024 // 16MB for direct URLs
  },
  
  supportedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  
  aspectRatioMappings: {
    // Common ratios to RunwayML Gen-3 Alpha Turbo supported ratios
    '16:9': '1280:768',
    '9:16': '768:1280', 
    '1:1': '768:1280', // Default to portrait for square requests
    'landscape': '1280:768',
    'portrait': '768:1280'
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