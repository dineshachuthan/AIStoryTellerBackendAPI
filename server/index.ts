import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite-enhanced";
import { archetypeService } from "./character-archetype-service";
import { collaborativeRoutes } from "./routes-collaborative";
import videoRoutes from "./routes-video";
// Video provider routes removed
import { VoiceProviderRegistry } from "./voice-providers/provider-manager";
import { getVoiceConfig } from "./voice-config";
import referenceDataRoutes from "./routes-reference-data";
import { stateManager } from "../shared/state-manager";
import { createApiExclusionPlugin } from "./vite-api-exclusion-plugin";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// JWT Audio Serving Route (MUST be before authentication setup)
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs/promises';

/**
 * List available audio files for testing
 */
app.get('/api/audio/list', async (req, res) => {
  try {
    const voiceSamplesDir = path.join(process.cwd(), 'voice-samples');
    const files = [];
    
    // Check if voice-samples directory exists
    try {
      const categories = await fs.readdir(voiceSamplesDir);
      for (const category of categories) {
        const categoryPath = path.join(voiceSamplesDir, category);
        const stat = await fs.stat(categoryPath);
        if (stat.isDirectory()) {
          const categoryFiles = await fs.readdir(categoryPath);
          for (const file of categoryFiles) {
            if (file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.webm')) {
              files.push({
                category,
                file,
                relativePath: `./voice-samples/${category}/${file}`
              });
            }
          }
        }
      }
    } catch (error) {
      console.log('Voice samples directory not found or empty');
    }
    
    // Generate JWT signed URLs for each file
    const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000';
    const signedUrls = files.map(file => {
      const payload = {
        relativePath: file.relativePath,
        userId: 'google_117487073695002443567',
        purpose: 'external_api_access'
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'default-secret', { expiresIn: '30m' });
      return {
        ...file,
        signedUrl: `${baseUrl}/api/audio/serve/${token}`
      };
    });
    
    res.json({
      files: signedUrls,
      totalFiles: files.length,
      baseUrl,
      note: 'Each file includes a signedUrl that can be used to access the audio file with JWT authentication'
    });
  } catch (error) {
    console.error('Error listing audio files:', error);
    res.status(500).json({ error: 'Failed to list audio files' });
  }
});

/**
 * Serve audio files with JWT token authentication
 * Used by external APIs (ElevenLabs) to access audio files securely
 */
app.get('/api/audio/serve/:token', async (req, res) => {
  console.log('[JWT] Audio serve route hit with token:', req.params.token?.substring(0, 50) + '...');
  try {
    const { token } = req.params;
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
    
    console.log('[JWT] Decoded token payload:', JSON.stringify(decoded, null, 2));
    
    // Validate token structure (JWT payload uses 'relativePath')
    if (!decoded.relativePath || !decoded.userId || !decoded.purpose) {
      console.log('[JWT] Token validation failed - missing fields:', {
        hasRelativePath: !!decoded.relativePath,
        hasUserId: !!decoded.userId,
        hasPurpose: !!decoded.purpose
      });
      return res.status(401).json({ error: 'Invalid token structure' });
    }
    
    // Check if token is expired (already handled by jwt.verify but adding explicit check)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    // Validate purpose (allow external_api_access for ElevenLabs)
    if (decoded.purpose !== 'external_api_access' && decoded.purpose !== 'voice_training') {
      return res.status(403).json({ error: 'Invalid token purpose' });
    }
    
    // Get absolute file path
    const fullPath = path.join(process.cwd(), decoded.relativePath);
    
    // Check if file exists
    const fileExists = await fs.access(fullPath).then(() => true).catch(() => false);
    if (!fileExists) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Serve the file
    res.sendFile(fullPath);
    
  } catch (error: any) {
    console.error('Error serving audio file:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(500).json({ error: 'Failed to serve audio file' });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  
  // Add collaborative routes after authentication is set up
  app.use(collaborativeRoutes);
  
  // Add video generation routes
  app.use(videoRoutes);
  
  // Add video provider management routes
  // Video provider routes removed
  
  // Add reference data routes for the new architecture
  app.use('/api/reference-data', referenceDataRoutes);
  

  
  // Initialize state manager before other services
  try {
    await stateManager.initialize();
    console.log('State manager initialized successfully');
  } catch (error) {
    console.error('Failed to initialize state manager:', error);
  }
  
  // Initialize voice provider registry with configuration
  try {
    const voiceConfig = getVoiceConfig();
    await VoiceProviderRegistry.initialize(voiceConfig);
    console.log('Voice provider registry initialized successfully');
  } catch (error) {
    console.error('Failed to initialize voice providers:', error);
  }
  
  // Initialize character archetypes after server starts (optional, with delay)
  setTimeout(() => {
    archetypeService.initializeDefaultArchetypes().catch((error) => {
      console.log('Character archetype initialization skipped due to database limits');
    });
  }, 5000);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
