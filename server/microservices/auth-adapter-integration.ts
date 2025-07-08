/**
 * Auth Adapter Integration
 * Integrates Identity Service Adapter into existing authentication routes
 * Maintains backward compatibility while adding event-driven capabilities
 */

import { Express } from "express";
import { IdentityServiceAdapter } from "./identity-service-adapter";
import { getGlobalEventBus } from "./event-bus";
import { storage } from "../storage";

class AuthAdapterIntegration {
  private identityAdapter: IdentityServiceAdapter;
  private eventBus = getGlobalEventBus();
  private enabled = false;

  constructor() {
    this.identityAdapter = new IdentityServiceAdapter();
  }

  /**
   * Initialize the integration
   */
  async initialize(): Promise<void> {
    // Check if microservices feature is enabled
    this.enabled = process.env.ENABLE_MICROSERVICES === 'true';
    
    if (this.enabled) {
      await this.identityAdapter.initialize();
      console.log('[AuthAdapter] Microservices integration enabled');
    } else {
      console.log('[AuthAdapter] Running in monolith mode');
    }
  }

  /**
   * Enhance existing user registration with events
   */
  async handleUserRegistration(userData: any): Promise<any> {
    // Use existing storage method
    const user = await storage.createUser(userData);
    
    // Publish event if microservices enabled
    if (this.enabled) {
      await this.eventBus.publish({
        type: 'user.registered',
        serviceName: 'monolith',
        timestamp: new Date().toISOString(),
        payload: {
          userId: user.id,
          email: user.email,
          provider: userData.provider || 'local'
        }
      });
    }
    
    return user;
  }

  /**
   * Enhance OAuth callback with events
   */
  async handleOAuthCallback(provider: string, providerId: string, profile: any): Promise<any> {
    // Check if user exists with this provider
    const existingUser = await storage.getUserByProvider(provider, providerId);
    
    if (existingUser) {
      // Update last login
      await storage.updateUser(existingUser.id, {
        lastLoginAt: new Date()
      });
      
      // Publish event if microservices enabled
      if (this.enabled) {
        await this.eventBus.publish({
          type: 'user.login',
          serviceName: 'monolith',
          timestamp: new Date().toISOString(),
          payload: {
            userId: existingUser.id,
            provider
          }
        });
      }
      
      return { user: existingUser, isNew: false };
    }
    
    // Check if user exists by email
    let user = await storage.getUserByEmail(profile.email);
    
    if (user) {
      // User exists with same email, link accounts
      await storage.createUserProvider({
        userId: user.id,
        provider,
        providerId,
        providerData: profile
      });
      
      // Publish event if microservices enabled
      if (this.enabled) {
        await this.eventBus.publish({
          type: 'user.oauth.linked',
          serviceName: 'monolith',
          timestamp: new Date().toISOString(),
          payload: {
            userId: user.id,
            provider
          }
        });
      }
      
      return { user, isNew: false };
    }
    
    // Create new user
    const userId = `${provider}_${providerId}`;
    user = await storage.createUser({
      id: userId,
      email: profile.email,
      displayName: profile.displayName || profile.email,
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      profileImageUrl: profile.profileImageUrl || null,
      externalId: profile.externalId,
      language: profile.language || 'en',
      isEmailVerified: true,
      lastLoginAt: new Date()
    });
    
    // Create provider link
    await storage.createUserProvider({
      userId: user.id,
      provider,
      providerId,
      providerData: profile
    });
    
    // Publish events if microservices enabled
    if (this.enabled) {
      await this.eventBus.publish({
        type: 'user.registered',
        serviceName: 'monolith',
        timestamp: new Date().toISOString(),
        payload: {
          userId: user.id,
          email: user.email,
          provider
        }
      });
      
      await this.eventBus.publish({
        type: 'user.oauth.linked',
        serviceName: 'monolith',
        timestamp: new Date().toISOString(),
        payload: {
          userId: user.id,
          provider
        }
      });
    }
    
    return { user, isNew: true };
  }

  /**
   * Enhance user update with events
   */
  async handleUserUpdate(userId: string, updates: any, updatedBy?: string): Promise<any> {
    const user = await storage.updateUser(userId, updates);
    
    // Publish event if microservices enabled
    if (this.enabled && user) {
      await this.eventBus.publish({
        type: 'user.updated',
        serviceName: 'monolith',
        timestamp: new Date().toISOString(),
        payload: {
          userId,
          updates,
          updatedBy: updatedBy || userId
        }
      });
    }
    
    return user;
  }

  /**
   * Get event log for debugging
   */
  getEventLog() {
    return this.eventBus.getEventLog();
  }
  
  /**
   * Get event bus instance
   */
  getEventBus() {
    return this.eventBus;
  }
}

// Export singleton instance
export const authAdapterIntegration = new AuthAdapterIntegration();