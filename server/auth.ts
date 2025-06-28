import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';
import { pool } from './db';
import { authService } from './auth-providers/auth-service';

// Session configuration
export function getSession() {
  const PgSession = ConnectPgSimple(session);
  const sessionStore = new PgSession({
    pool: pool,
    createTableIfMissing: true,
    tableName: 'sessions',
    // Add configuration to reduce database pressure
    pruneSessionInterval: 60 * 15, // 15 minutes
    errorLog: (error: any) => {
      // Only log non-rate-limit errors
      if (!error.message?.includes('rate limit') && !error.message?.includes('Control plane')) {
        console.error('Session store error:', error.message);
      }
    },
  });

  return session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Extend session on activity
    cookie: {
      secure: false, // Set to false for development to work with HTTP
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax', // Add sameSite for better compatibility
    },
    name: 'connect.sid', // Explicit session name
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

  // Setup modular authentication providers
  await authService.setupAuthentication(app);

}

// Authentication middleware
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Store the original URL for redirect after login
  const originalUrl = req.originalUrl;
  const redirectUrl = `/login?redirect=${encodeURIComponent(originalUrl)}`;
  
  // For API requests, return JSON with redirect URL
  if (req.headers.accept?.includes('application/json') || req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ 
      message: 'Authentication required',
      redirectUrl: redirectUrl
    });
  }
  
  // For non-API requests, redirect to login page
  res.redirect(redirectUrl);
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