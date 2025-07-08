import { Express } from 'express';
import passport from 'passport';
import { authRegistry } from './auth-registry';
import { AuthProviderInfo } from './auth-provider-interface';
import { storage } from '../storage';
import { authAdapterIntegration } from '../microservices/auth-adapter-integration';

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
        // User exists, return existing user and publish login event
        await storage.updateUser(user.id, { lastLoginAt: new Date() });
        
        // Use auth adapter to publish login event
        await authAdapterIntegration.handleOAuthCallback(
          authInfo.provider,
          authInfo.providerId,
          authInfo
        );
        
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

      // Generate anonymous external ID
      const { externalIdService } = await import('../external-id-service');
      const externalId = externalIdService.generateExternalId();

      // Use auth adapter to handle OAuth callback and publish events
      const result = await authAdapterIntegration.handleOAuthCallback(
        authInfo.provider,
        authInfo.providerId,
        {
          ...authInfo,
          email: authInfo.email,
          displayName: authInfo.displayName || authInfo.email,
          firstName: authInfo.firstName || '',
          lastName: authInfo.lastName || '',
          profileImageUrl: authInfo.avatarUrl || null,
          locale: authInfo.locale,
          language: authInfo.language || 'en',
          externalId: externalId
        }
      );
      
      const newUser = result.user;

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