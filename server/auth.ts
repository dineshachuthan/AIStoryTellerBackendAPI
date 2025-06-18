import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';
import { pool } from './db';
import { getOAuthConfig } from './oauth-config';

// Session configuration
export function getSession() {
  const PgSession = ConnectPgSimple(session);
  const sessionStore = new PgSession({
    pool: pool,
    createTableIfMissing: true,
    tableName: 'sessions',
  });

  return session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  });
}

// Passport configuration
export async function setupAuth(app: Express) {
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Local strategy for email/password authentication
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const localUser = await storage.getLocalUser(user.id);
        if (!localUser) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isValidPassword = await bcrypt.compare(password, localUser.passwordHash);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Update last login time
        await storage.updateUser(user.id, { lastLoginAt: new Date() });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  const oauthConfig = getOAuthConfig();
  
  // Log configuration for debugging
  console.log(`[Auth] Environment: ${oauthConfig.environment}`);
  console.log(`[Auth] Base URL: ${oauthConfig.baseUrl}`);
  console.log(`[Auth] Google OAuth configured: ${!!(oauthConfig.google.clientID && oauthConfig.google.clientSecret)}`);
  console.log(`[Auth] Google callback URL: ${oauthConfig.google.callbackURL}`);

  // Google OAuth strategy
  if (oauthConfig.google.clientID && oauthConfig.google.clientSecret) {
    console.log(`[Auth] Google Client ID: ${oauthConfig.google.clientID.substring(0, 20)}...`);
    console.log(`[Auth] Google Callback URL: ${oauthConfig.google.callbackURL}`);
    
    passport.use(new GoogleStrategy(
      {
        clientID: oauthConfig.google.clientID,
        clientSecret: oauthConfig.google.clientSecret,
        callbackURL: oauthConfig.google.callbackURL,
        scope: ['profile', 'email'],
      },
      async (accessToken: any, refreshToken: any, profile: any, done: any) => {
        try {
          // Check if user exists with this Google provider
          let user = await storage.getUserByProvider('google', profile.id);
          
          if (user) {
            // Update last login time
            await storage.updateUser(user.id, { lastLoginAt: new Date() });
            return done(null, user);
          }

          // Check if user exists with same email
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await storage.getUserByEmail(email);
            if (user) {
              // Link Google account to existing user
              await storage.createUserProvider({
                userId: user.id,
                provider: 'google',
                providerId: profile.id,
                providerData: profile._json,
              });
              await storage.updateUser(user.id, { lastLoginAt: new Date() });
              return done(null, user);
            }
          }

          // Create new user
          const newUser = await storage.createUser({
            id: `google_${profile.id}`,
            email: email || null,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            displayName: profile.displayName || null,
            profileImageUrl: profile.photos?.[0]?.value || null,
            isEmailVerified: email ? true : false,
            lastLoginAt: new Date(),
          });

          // Create provider link
          await storage.createUserProvider({
            userId: newUser.id,
            provider: 'google',
            providerId: profile.id,
            providerData: profile._json,
          });

          return done(null, newUser);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }

  // Facebook OAuth strategy
  if (oauthConfig.facebook.clientID && oauthConfig.facebook.clientSecret) {
    passport.use(new FacebookStrategy(
      {
        clientID: oauthConfig.facebook.clientID,
        clientSecret: oauthConfig.facebook.clientSecret,
        callbackURL: oauthConfig.facebook.callbackURL,
        profileFields: oauthConfig.facebook.profileFields,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this Facebook provider
          let user = await storage.getUserByProvider('facebook', profile.id);
          
          if (user) {
            // Update last login time
            await storage.updateUser(user.id, { lastLoginAt: new Date() });
            return done(null, user);
          }

          // Check if user exists with same email
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await storage.getUserByEmail(email);
            if (user) {
              // Link Facebook account to existing user
              await storage.createUserProvider({
                userId: user.id,
                provider: 'facebook',
                providerId: profile.id,
                providerData: profile._json,
              });
              await storage.updateUser(user.id, { lastLoginAt: new Date() });
              return done(null, user);
            }
          }

          // Create new user
          const newUser = await storage.createUser({
            id: `facebook_${profile.id}`,
            email: email || null,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            displayName: profile.displayName || null,
            profileImageUrl: profile.photos?.[0]?.value || null,
            isEmailVerified: email ? true : false,
            lastLoginAt: new Date(),
          });

          // Create provider link
          await storage.createUserProvider({
            userId: newUser.id,
            provider: 'facebook',
            providerId: profile.id,
            providerData: profile._json,
          });

          return done(null, newUser);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }

  // Microsoft OAuth strategy
  if (oauthConfig.microsoft.clientID && oauthConfig.microsoft.clientSecret) {
    passport.use(new MicrosoftStrategy(
      {
        clientID: oauthConfig.microsoft.clientID,
        clientSecret: oauthConfig.microsoft.clientSecret,
        callbackURL: oauthConfig.microsoft.callbackURL,
        scope: oauthConfig.microsoft.scope,
      },
      async (accessToken: any, refreshToken: any, profile: any, done: any) => {
        try {
          // Check if user exists with this Microsoft provider
          let user = await storage.getUserByProvider('microsoft', profile.id);
          
          if (user) {
            // Update last login time
            await storage.updateUser(user.id, { lastLoginAt: new Date() });
            return done(null, user);
          }

          // Check if user exists with same email
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await storage.getUserByEmail(email);
            if (user) {
              // Link Microsoft account to existing user
              await storage.createUserProvider({
                userId: user.id,
                provider: 'microsoft',
                providerId: profile.id,
                providerData: profile._json,
              });
              await storage.updateUser(user.id, { lastLoginAt: new Date() });
              return done(null, user);
            }
          }

          // Create new user
          const newUser = await storage.createUser({
            id: `microsoft_${profile.id}`,
            email: email || null,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            displayName: profile.displayName || null,
            profileImageUrl: profile.photos?.[0]?.value || null,
            isEmailVerified: email ? true : false,
            lastLoginAt: new Date(),
          });

          // Create provider link
          await storage.createUserProvider({
            userId: newUser.id,
            provider: 'microsoft',
            providerId: profile.id,
            providerData: profile._json,
          });

          return done(null, newUser);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }
}

// Authentication middleware
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

// Admin middleware
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && (req.user as any)?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
};

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}