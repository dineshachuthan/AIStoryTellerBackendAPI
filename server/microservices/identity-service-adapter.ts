/**
 * Identity Service Adapter
 * Uses existing users, userProviders, localUsers, and sessions tables
 * Extends existing storage patterns without creating new database
 */

import { BaseMicroserviceAdapter } from "./base-microservice-adapter";
import { storage } from "../storage-postgres";
import express from "express";
import type { User, InsertUser, UpsertUser } from "@shared/schema";

export class IdentityServiceAdapter extends BaseMicroserviceAdapter {
  private app: express.Application;

  constructor() {
    super({
      serviceName: "identity-service",
      port: 3001,
      tables: ["users", "user_providers", "local_users", "sessions", "user_session_metadata"],
      readOnlyTables: ["app_states", "state_transitions"] // Can read state management
    });
    
    this.app = express();
    this.setupRoutes();
  }

  /**
   * Initialize identity service
   */
  async initialize(): Promise<void> {
    await this.eventBus.initialize();
    
    // Subscribe to relevant events
    await this.subscribeToEvent("subscription.created", async (event) => {
      // Update user metadata when subscription is created
      console.log(`Identity service received subscription created event:`, event);
    });
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    this.app.use(express.json());

    // Health check
    this.app.get("/health", async (req, res) => {
      const health = await this.healthCheck();
      res.status(health.status === "healthy" ? 200 : 503).json(health);
    });

    // Get user by ID (microservice endpoint - authentication handled by API gateway)
    this.app.get("/users/:id", async (req, res) => {
      try {
        const user = await this.storage.getUser(req.params.id);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
      } catch (error) {
        res.status(500).json({ error: "Failed to get user" });
      }
    });

    // Update user (microservice endpoint - authentication handled by API gateway)
    this.app.patch("/users/:id", async (req, res) => {
      try {
        const userId = req.params.id;
        const updates = req.body;

        const user = await this.storage.updateUser(userId, updates);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Publish event
        await this.publishEvent("user.updated", {
          userId,
          updates,
          updatedBy: userId
        });

        res.json(user);
      } catch (error) {
        res.status(500).json({ error: "Failed to update user" });
      }
    });

    // Get user providers (microservice endpoint - authentication handled by API gateway)
    this.app.get("/users/:id/providers", async (req, res) => {
      try {
        const userId = req.params.id;
        
        // Get all providers for user using existing storage
        const providers = await this.db
          .select()
          .from(userProviders)
          .where(eq(userProviders.userId, userId));
          
        res.json(providers);
      } catch (error) {
        res.status(500).json({ error: "Failed to get user providers" });
      }
    });

    // Session management
    this.app.post("/sessions/validate", async (req, res) => {
      try {
        const { sessionId } = req.body;
        
        // Use existing session validation logic
        const session = await this.db
          .select()
          .from(sessions)
          .where(eq(sessions.sid, sessionId))
          .limit(1);
          
        if (!session.length || new Date(session[0].expire) < new Date()) {
          return res.status(401).json({ valid: false });
        }
        
        res.json({ valid: true, session: session[0] });
      } catch (error) {
        res.status(500).json({ error: "Failed to validate session" });
      }
    });

    // User registration (extends existing logic)
    this.app.post("/users/register", async (req, res) => {
      try {
        const userData: InsertUser = req.body;
        
        // Use existing storage method
        const user = await this.storage.createUser(userData);
        
        // Publish event for other services
        await this.publishEvent("user.registered", {
          userId: user.id,
          email: user.email,
          provider: userData.provider || "local"
        });
        
        res.status(201).json(user);
      } catch (error) {
        res.status(500).json({ error: "Failed to register user" });
      }
    });

    // OAuth provider callback (extends existing OAuth logic)
    this.app.post("/oauth/callback", async (req, res) => {
      try {
        const { provider, providerId, profile } = req.body;
        
        // Check if user exists with this provider
        const existingUser = await this.storage.getUserByProvider(provider, providerId);
        
        if (existingUser) {
          // Update last login
          await this.storage.updateUser(existingUser.id, {
            lastLoginAt: new Date()
          });
          
          return res.json({ user: existingUser, isNew: false });
        }
        
        // Create new user using existing upsert logic
        const userData: UpsertUser = {
          email: profile.email,
          displayName: profile.displayName,
          firstName: profile.firstName,
          lastName: profile.lastName,
          profileImageUrl: profile.profileImageUrl,
          locale: profile.locale,
          language: profile.language?.substring(0, 2) || 'en'
        };
        
        const user = await this.storage.upsertUser(userData);
        
        // Create provider link
        await this.storage.createUserProvider({
          userId: user.id,
          provider,
          providerId,
          providerData: profile
        });
        
        // Publish event
        await this.publishEvent("user.oauth.linked", {
          userId: user.id,
          provider
        });
        
        res.json({ user, isNew: true });
      } catch (error) {
        res.status(500).json({ error: "OAuth callback failed" });
      }
    });
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    const port = this.config.port;
    this.app.listen(port, () => {
      console.log(`Identity service listening on port ${port}`);
    });
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    await this.eventBus.close();
  }
}

// Import required dependencies
import { userProviders, sessions } from "@shared/schema";
import { eq } from "drizzle-orm";