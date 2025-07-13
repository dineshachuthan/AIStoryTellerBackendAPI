// OAuth configuration utility
export function getEnvironment(): 'development' | 'staging' | 'production' {
  const env = process.env.NODE_ENV?.toLowerCase();
  const replitUrl = process.env.REPLIT_DOMAINS?.split(',')[0];
  
  // If NODE_ENV is explicitly set, use it
  if (env === 'production' || env === 'staging' || env === 'development') {
    return env;
  }
  
  // Determine environment based on domain patterns
  if (replitUrl) {
    if (replitUrl.includes('-prod-') || replitUrl.includes('.prod.')) {
      return 'production';
    } else if (replitUrl.includes('-staging-') || replitUrl.includes('.staging.')) {
      return 'staging';
    } else {
      return 'development';
    }
  }
  
  return 'development';
}

export function getBaseUrl(): string {
  const environment = getEnvironment();
  const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
  
  // Environment-specific base URLs
  switch (environment) {
    case 'production':
      return process.env.PRODUCTION_URL || (replitDomain ? `https://${replitDomain}` : 'http://localhost:5000');
    case 'staging':
      return process.env.STAGING_URL || (replitDomain ? `https://${replitDomain}` : 'http://localhost:5000');
    case 'development':
    default:
      return process.env.DEVELOPMENT_URL || (replitDomain ? `https://${replitDomain}` : 'http://localhost:5000');
  }
}

export function getOAuthConfig() {
  const environment = getEnvironment();
  const baseUrl = getBaseUrl();
  
  // Environment-specific OAuth client IDs (if needed)
  const getEnvSpecificSecret = (baseKey: string) => {
    const envKey = `${baseKey}_${environment.toUpperCase()}`;
    return process.env[envKey] || process.env[baseKey];
  };

  return {
    environment,
    baseUrl,
    google: {
      clientID: getEnvSpecificSecret('GOOGLE_CLIENT_ID'),
      clientSecret: getEnvSpecificSecret('GOOGLE_CLIENT_SECRET'), 
      callbackURL: `${baseUrl}/api/auth/google/callback`,
      scope: ['profile', 'email'],
      passReqToCallback: false,
    },
    facebook: {
      clientID: getEnvSpecificSecret('FACEBOOK_APP_ID'),
      clientSecret: getEnvSpecificSecret('FACEBOOK_APP_SECRET'),
      callbackURL: `${baseUrl}/api/auth/facebook/callback`,
      profileFields: ['id', 'emails', 'name', 'picture'],
    },
    microsoft: {
      clientID: getEnvSpecificSecret('MICROSOFT_CLIENT_ID'),
      clientSecret: getEnvSpecificSecret('MICROSOFT_CLIENT_SECRET'),
      callbackURL: `${baseUrl}/api/auth/microsoft/callback`,
      scope: ['user.read'],
    },
  };
}