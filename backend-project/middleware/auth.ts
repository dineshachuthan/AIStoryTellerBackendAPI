import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { users } from '../schema.js';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

export interface TokenPayload {
  sub: string; // user ID
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware to authenticate JWT tokens from Authorization header
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'No token provided in Authorization header' 
    });
  }

  try {
    // Verify the token with the same secret used to sign it
    const decoded = jwt.verify(token, 'dev-secret') as TokenPayload;
    
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token could not be decoded or missing user ID' 
      });
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.sub))
      .limit(1);

    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'User associated with token does not exist' 
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || decoded.email,
      firstName: user.firstName || decoded.firstName,
      lastName: user.lastName || decoded.lastName,
      profileImageUrl: user.profileImageUrl || decoded.profileImageUrl,
    };

    next();
  } catch (error) {
    console.error('Token authentication error:', error);
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Token verification failed' 
    });
  }
};

/**
 * Optional authentication - sets user if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // No token, continue without user
  }

  try {
    const decoded = jwt.decode(token) as TokenPayload;
    
    if (decoded && decoded.sub) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.sub))
        .limit(1);

      if (user) {
        req.user = {
          id: user.id,
          email: user.email || decoded.email,
          firstName: user.firstName || decoded.firstName,
          lastName: user.lastName || decoded.lastName,
          profileImageUrl: user.profileImageUrl || decoded.profileImageUrl,
        };
      }
    }
  } catch (error) {
    console.error('Optional auth error:', error);
    // Continue without user if token is invalid
  }

  next();
};