import express, { type Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { registerRoutes } from "./routes.js";
import { db } from "./db.js";

const app = express();
const PORT = process.env.PORT || 5000;

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

// Swagger API Documentation
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'AI Storytelling Backend API',
    version: '1.0.0',
    description: 'RESTful API for collaborative storytelling platform with AI-powered voice narration and content generation',
    contact: {
      name: 'API Support',
      url: 'https://github.com/yourusername/storytelling-platform'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check endpoint',
        description: 'Returns the current status of the API server',
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'OK' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/users': {
      get: {
        summary: 'Get all users',
        description: 'Retrieve a list of all registered users',
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          email: { type: 'string' },
                          name: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/stories': {
      get: {
        summary: 'Get all stories',
        description: 'Retrieve a list of all stories ordered by creation date',
        responses: {
          '200': {
            description: 'List of stories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          title: { type: 'string' },
                          content: { type: 'string' },
                          summary: { type: 'string' },
                          genre: { type: 'string' },
                          category: { type: 'string' },
                          status: { type: 'string', enum: ['draft', 'published'] },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create a new story',
        description: 'Create a new story with title, content, and optional metadata',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'content'],
                properties: {
                  title: { type: 'string', example: 'My Amazing Story' },
                  content: { type: 'string', example: 'Once upon a time...' },
                  summary: { type: 'string' },
                  genre: { type: 'string' },
                  category: { type: 'string' },
                  status: { type: 'string', enum: ['draft', 'published'], default: 'draft' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Story created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        content: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/stories/{id}': {
      get: {
        summary: 'Get story by ID',
        description: 'Retrieve a specific story by its ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Story ID'
          }
        ],
        responses: {
          '200': {
            description: 'Story details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        content: { type: 'string' },
                        summary: { type: 'string' },
                        genre: { type: 'string' },
                        category: { type: 'string' },
                        status: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Story not found'
          }
        }
      }
    },
    '/api/user/{userId}/voice-recordings': {
      get: {
        summary: 'Get user voice recordings',
        description: 'Retrieve all voice recordings for a specific user',
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'User ID'
          }
        ],
        responses: {
          '200': {
            description: 'List of voice recordings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          userId: { type: 'integer' },
                          emotion: { type: 'string' },
                          audioUrl: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Storytelling API Documentation'
}));

// API routes
app.use('/api', registerRoutes());

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;