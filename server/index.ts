import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { archetypeService } from "./character-archetype-service";
import { collaborativeRoutes } from "./routes-collaborative";
import videoRoutes from "./routes-video";
// Video provider routes removed
import { VoiceProviderRegistry } from "./voice-providers/provider-manager";
import { getVoiceConfig } from "./voice-config";
import referenceDataRoutes from "./routes-reference-data";
import { stateManager } from "../shared/state-manager";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
