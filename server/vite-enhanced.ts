/**
 * Enhanced Vite Setup with Strategic API Route Exclusion
 * 
 * This module implements the strategic solution to exclude /api/* routes
 * from Vite's internal routing system, solving the core middleware issue.
 */

import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";


const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Strategic Enhanced Vite Setup
 * 
 * This function implements the proper solution by integrating the API exclusion plugin
 * directly into Vite's configuration, ensuring API routes are handled before
 * Vite's internal middleware processes them.
 */
export async function setupViteEnhanced(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  console.log("🎯 Setting up Vite...");

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // Don't exit process - let Vite handle errors naturally
      },
    },
    server: serverOptions,
    appType: "custom",
    plugins: [
      ...(viteConfig.plugins || [])
    ]
  });

  // Use Vite's middleware (which now includes our API exclusion plugin)
  app.use(vite.middlewares);
  
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // If this is an API route, it should have been handled already
    if (url.startsWith('/api/')) {
      return res.status(404).json({ error: "API endpoint not found" });
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      const htmlTemplate = await fs.promises.readFile(clientTemplate, "utf-8");
      const rendered = await vite.transformIndexHtml(url, htmlTemplate);
      const withNonce = rendered.replace(
        /<script/g,
        `<script nonce="${nanoid()}"`,
      );

      res.status(200).set({ "Content-Type": "text/html" }).end(withNonce);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  console.log("✅ Vite setup complete");
}

/**
 * Fallback to original setupVite function
 * This maintains backward compatibility if the enhanced version fails
 */
export async function setupVite(app: Express, server: Server) {
  try {
    await setupViteEnhanced(app, server);
  } catch (error) {
    console.error("Enhanced Vite setup failed, falling back to original:", error);
    // Import and use original setupVite if enhanced version fails
    const { setupVite: originalSetupVite } = await import("./vite");
    await originalSetupVite(app, server);
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the frontend build! Expected it to be at ${distPath}. Did you forget to run \`npm run build\`?`,
    );
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}