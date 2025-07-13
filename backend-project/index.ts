import express, { type Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import yaml from 'js-yaml';
import { registerRoutes } from "./routes.js";
import { db } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT;

// Dynamic URL configuration - no hardcoded domains
const REPLIT_DOMAIN = process.env.REPLIT_DOMAINS;
const FRONTEND_URL = REPLIT_DOMAIN ? `https://${REPLIT_DOMAIN}` : process.env.FRONTEND_URL;
const BACKEND_URL = REPLIT_DOMAIN ? `https://${REPLIT_DOMAIN}` : process.env.BACKEND_URL;

// Store dynamic URLs in memory for use across the application
global.DYNAMIC_CONFIG = {
  REPLIT_DOMAIN,
  FRONTEND_URL,
  BACKEND_URL,
  IS_REPLIT: !!REPLIT_DOMAIN
};

// CORS middleware - allow frontend to access backend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_URL);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root route - redirect to API documentation
app.get('/', (req: Request, res: Response) => {
  res.redirect('/api-docs');
});

// Load OpenAPI specification from YAML file
const openApiPath = join(__dirname, 'openapi.yaml');
const openApiYaml = readFileSync(openApiPath, 'utf8');
const swaggerSpec = yaml.load(openApiYaml) as any;

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
}));

// Setup authentication (temporarily disabled for testing)
// import { setupAuth } from './replitAuth';
// await setupAuth(app);

// API routes
app.use('/api', registerRoutes());

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Health check: ${BACKEND_URL}/health`);
  console.log(`📖 API docs: ${BACKEND_URL}/api-docs`);
  console.log(`🌐 Dynamic domain: ${REPLIT_DOMAIN || 'localhost (development)'}`);
  console.log(`🔧 Runtime config stored in memory`);
});

export default app;