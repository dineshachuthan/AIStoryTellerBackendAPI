import { Strategy } from 'passport';
import { Express } from 'express';

export interface AuthProviderConfig {
  name: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope?: string[];
  additionalConfig?: Record<string, any>;
}

export interface AuthProviderInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  provider: string;
  providerId: string;
}

export interface IAuthProvider {
  name: string;
  isEnabled(): boolean;
  getStrategy(): Strategy;
  setupRoutes(app: Express): void;
  extractUserInfo(profile: any): AuthProviderInfo;
  getAuthUrl(redirectUrl?: string): string;
}

export interface AuthProviderRegistry {
  getEnabledProviders(): IAuthProvider[];
  getProvider(name: string): IAuthProvider | undefined;
  registerProvider(provider: IAuthProvider): void;
}