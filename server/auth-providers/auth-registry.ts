import { IAuthProvider, AuthProviderRegistry } from './auth-provider-interface';
import { GoogleAuthProvider } from './google-provider';

class AuthProviderRegistryImpl implements AuthProviderRegistry {
  private providers: Map<string, IAuthProvider> = new Map();

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    // Register Google provider
    const googleProvider = new GoogleAuthProvider();
    if (googleProvider.isEnabled()) {
      this.registerProvider(googleProvider);
    }

    // Future providers will be registered here:
    // - FacebookAuthProvider
    // - MicrosoftAuthProvider  
    // - LinkedInAuthProvider
    // - TwitterAuthProvider
  }

  registerProvider(provider: IAuthProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): IAuthProvider | undefined {
    return this.providers.get(name);
  }

  getEnabledProviders(): IAuthProvider[] {
    return Array.from(this.providers.values()).filter(provider => provider.isEnabled());
  }

  getAllProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
export const authRegistry = new AuthProviderRegistryImpl();