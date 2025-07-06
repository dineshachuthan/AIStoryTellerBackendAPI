/**
 * Strategic Solution: Vite Plugin to Exclude API Routes from Internal Routing
 * 
 * This plugin prevents Vite's internal middleware from processing /api/* routes,
 * allowing Express routes to handle them directly. This solves the fundamental
 * issue where Vite's middleware intercepts API calls before Express routes can process them.
 */

export function createApiExclusionPlugin() {
  return {
    name: 'api-routes-exclusion',
    configureServer(server: any) {
      // This middleware runs BEFORE Vite's internal middlewares
      // It's the strategic solution to ensure API routes bypass Vite's transform pipeline
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url?.startsWith('/api/')) {
          // Strategic exclusion: Skip Vite's internal routing for API calls
          // This allows Express routes registered in registerRoutes() to handle them
          console.log(`🎯 API route excluded from Vite processing: ${req.url}`);
          return next('route'); // Skip to next router (Express)
        }
        next(); // Continue with Vite's normal processing for non-API routes
      });
    }
  };
}

/**
 * Alternative implementation using path-based filtering
 * This provides more granular control over which routes Vite should process
 */
export function createAdvancedApiExclusionPlugin() {
  const excludedPaths = ['/api/', '/auth/', '/uploads/', '/cache/'];
  
  return {
    name: 'advanced-api-exclusion',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const shouldExclude = excludedPaths.some(path => req.url?.startsWith(path));
        
        if (shouldExclude) {
          console.log(`🎯 Path excluded from Vite processing: ${req.url}`);
          return next('route'); // Let Express handle this route
        }
        
        next(); // Let Vite handle frontend routes
      });
    }
  };
}