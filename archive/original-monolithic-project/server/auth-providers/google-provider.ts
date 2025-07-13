import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { AuthProviderInfo } from './auth-provider-interface';
import { getAuthConfig } from './auth-config';
import { BaseOAuthProvider } from './base-oauth-provider';
import { authService } from './auth-service';

export class GoogleAuthProvider extends BaseOAuthProvider {
  name = 'google';

  getStrategy(): GoogleStrategy {
    const config = getAuthConfig(this.name);
    if (!config) {
      throw new Error(`${this.name} auth configuration not found`);
    }

    return new GoogleStrategy(
      {
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const userInfo = this.extractUserInfo(profile);
          const user = await authService.handleOAuthUser(userInfo);
          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    );
  }

  extractUserInfo(profile: any): AuthProviderInfo {
    // Extract locale/language from Google profile
    const locale = profile._json?.locale || 'en'; // e.g., 'en-US', 'hi-IN', 'ta-IN'
    const language = locale.split('-')[0]; // Extract just the language code
    
    return {
      id: profile.id,
      email: profile.emails?.[0]?.value || '',
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      displayName: profile.displayName || '',
      avatarUrl: profile.photos?.[0]?.value || '',
      provider: this.name,
      providerId: profile.id,
      locale: locale,
      language: language,
    };
  }
}