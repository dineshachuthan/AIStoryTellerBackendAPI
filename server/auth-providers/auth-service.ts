import { Express } from 'express';
import passport from 'passport';
import { authRegistry } from './auth-registry';
import { AuthProviderInfo } from './auth-provider-interface';
import { storage } from '../storage';

export class AuthService {
  
  /**
   * Setup authentication providers and strategies
   * This ensures consistent behavior regardless of which providers are enabled
   */
  async setupAuthentication(app: Express): Promise<void> {
    // Initialize passport strategies for all enabled providers
    const enabledProviders = authRegistry.getEnabledProviders();
    
    for (const provider of enabledProviders) {
      const strategy = provider.getStrategy();
      passport.use(provider.name, strategy);
      
      // Setup routes for each provider
      provider.setupRoutes(app);
    }

    // Setup passport serialization/deserialization (consistent across all providers)
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await storage.getUser(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });
  }

  /**
   * Handle OAuth user creation/authentication (standardized behavior)
   * This function ensures the same user flow regardless of provider
   */
  async handleOAuthUser(authInfo: AuthProviderInfo): Promise<any> {
    try {
      // Check if user exists by provider
      let user = await storage.getUserByProvider(authInfo.provider, authInfo.providerId);

      if (user) {
        // User exists, return existing user
        return user;
      }

      // Check if user exists by email
      user = await storage.getUserByEmail(authInfo.email);

      if (user) {
        // User exists with same email, link accounts
        await storage.createUserProvider({
          userId: user.id,
          provider: authInfo.provider,
          providerId: authInfo.providerId
        });
        return user;
      }

      // Create new user
      const newUser = await storage.createUser({
        id: `${authInfo.provider}_${authInfo.providerId}`,
        email: authInfo.email,
        firstName: authInfo.firstName || '',
        lastName: authInfo.lastName || '',
        displayName: authInfo.displayName || authInfo.email,
        profileImageUrl: authInfo.avatarUrl || null
      });

      // Link provider to new user
      await storage.createUserProvider({
        userId: newUser.id,
        provider: authInfo.provider,
        providerId: authInfo.providerId
      });

      return newUser;
    } catch (error) {
      throw new Error(`OAuth user handling failed: ${error}`);
    }
  }

  /**
   * Get available authentication providers
   */
  getAvailableProviders(): Array<{name: string, enabled: boolean, authUrl: string}> {
    return authRegistry.getEnabledProviders().map(provider => ({
      name: provider.name,
      enabled: provider.isEnabled(),
      authUrl: provider.getAuthUrl()
    }));
  }

  /**
   * Get auth URL for specific provider with redirect
   */
  getProviderAuthUrl(providerName: string, redirectUrl?: string): string | null {
    const provider = authRegistry.getProvider(providerName);
    return provider ? provider.getAuthUrl(redirectUrl) : null;
  }
}

// Singleton instance
export const authService = new AuthService();