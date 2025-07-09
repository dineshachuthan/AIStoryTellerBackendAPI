import jwt from 'jsonwebtoken';
import { getBaseUrl, getEnvironment } from './oauth-config';

interface InvitationPayload {
  invitationId: string;
  storyId: number;
  characterName?: string;
  expiresAt: Date;
}

interface InvitationUrlOptions {
  includeJWT?: boolean;
  expiresIn?: string; // e.g., '7d' for 7 days
}

/**
 * Build invitation URL with environment awareness and JWT support
 * @param invitationToken The invitation token from database
 * @param options Additional options for URL construction
 * @returns Complete invitation URL
 */
export function buildInvitationUrl(
  invitationToken: string,
  options: InvitationUrlOptions = {}
): string {
  const baseUrl = getBaseUrl();
  const environment = getEnvironment();
  
  // Use /narration/{invite_id} pattern as requested
  let url = `${baseUrl}/narration/${invitationToken}`;
  
  // Add JWT token if requested (for future use)
  if (options.includeJWT && process.env.JWT_SECRET) {
    const payload: InvitationPayload = {
      invitationId: invitationToken,
      storyId: 0, // Will be populated when needed
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
    };
    
    const jwtToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: options.expiresIn || '5d' }
    );
    
    url += `?token=${jwtToken}`;
  }
  
  // Add environment indicator for non-production
  if (environment !== 'production') {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}env=${environment}`;
  }
  
  return url;
}

/**
 * Parse invitation URL to extract token and validate JWT if present
 * @param url The full invitation URL
 * @returns Parsed invitation data
 */
export function parseInvitationUrl(url: string): {
  invitationToken: string;
  jwtPayload?: InvitationPayload;
  environment?: string;
} | null {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/narration\/([^/?]+)/);
    
    if (!pathMatch) {
      return null;
    }
    
    const invitationToken = pathMatch[1];
    const jwtToken = urlObj.searchParams.get('token');
    const environment = urlObj.searchParams.get('env');
    
    let jwtPayload: InvitationPayload | undefined;
    
    if (jwtToken && process.env.JWT_SECRET) {
      try {
        jwtPayload = jwt.verify(jwtToken, process.env.JWT_SECRET) as InvitationPayload;
      } catch (error) {
        console.warn('Invalid JWT token in invitation URL:', error);
      }
    }
    
    return {
      invitationToken,
      jwtPayload,
      environment: environment || undefined
    };
  } catch (error) {
    console.error('Failed to parse invitation URL:', error);
    return null;
  }
}

/**
 * Get invitation URL configuration for different environments
 */
export function getInvitationConfig() {
  const environment = getEnvironment();
  
  return {
    environment,
    baseUrl: getBaseUrl(),
    urlPattern: '/narration/{inviteId}',
    jwtEnabled: environment === 'production' && !!process.env.JWT_SECRET,
    jwtExpiresIn: process.env.INVITATION_JWT_EXPIRES_IN || '5d',
    invitationExpiresIn: process.env.INVITATION_EXPIRES_IN || '5d'
  };
}