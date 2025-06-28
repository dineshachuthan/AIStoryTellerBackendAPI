import { AuthProviderConfig } from './auth-provider-interface';

function getBaseUrl(): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  const replitDomains = process.env.REPLIT_DOMAINS?.split(',') || [];
  const primaryDomain = replitDomains[0];
  
  if (primaryDomain) {
    return `https://${primaryDomain}`;
  }
  
  return 'http://localhost:5000';
}

const baseUrl = getBaseUrl();

export const authProviderConfigs: Record<string, AuthProviderConfig> = {
  google: {
    name: 'Google',
    enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: `${baseUrl}/api/auth/google/callback`,
    scope: ['profile', 'email'],
    additionalConfig: {
      prompt: 'select_account'
    }
  },
  
  facebook: {
    name: 'Facebook',
    enabled: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    clientId: process.env.FACEBOOK_APP_ID || '',
    clientSecret: process.env.FACEBOOK_APP_SECRET || '',
    callbackUrl: `${baseUrl}/api/auth/facebook/callback`,
    scope: ['email']
  },
  
  microsoft: {
    name: 'Microsoft',
    enabled: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    callbackUrl: `${baseUrl}/api/auth/microsoft/callback`,
    scope: ['user.read'],
    additionalConfig: {
      tenant: process.env.MICROSOFT_TENANT_ID || 'common'
    }
  },
  
  linkedin: {
    name: 'LinkedIn',
    enabled: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackUrl: `${baseUrl}/api/auth/linkedin/callback`,
    scope: ['r_liteprofile', 'r_emailaddress']
  },
  
  twitter: {
    name: 'Twitter',
    enabled: !!(process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET),
    clientId: process.env.TWITTER_CONSUMER_KEY || '',
    clientSecret: process.env.TWITTER_CONSUMER_SECRET || '',
    callbackUrl: `${baseUrl}/api/auth/twitter/callback`,
    scope: ['tweet.read', 'users.read']
  }
};

export function getAuthConfig(provider: string): AuthProviderConfig | undefined {
  return authProviderConfigs[provider];
}

export function getEnabledAuthProviders(): AuthProviderConfig[] {
  return Object.values(authProviderConfigs).filter(config => config.enabled);
}