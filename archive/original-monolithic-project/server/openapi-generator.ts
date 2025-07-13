/**
 * OpenAPI Specification Generator
 * Generates OpenAPI 3.0 specification from server routes and schemas
 */

import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as schemas from '../shared/schema';
import { 
  SignupRequest, 
  LoginRequest, 
  StoryCreateRequest,
  StoryUpdateRequest,
  InvitationCreateRequest
} from '../shared/types';

/**
 * Convert Zod schema to OpenAPI schema
 */
function zodToOpenAPISchema(schema: z.ZodSchema): any {
  const jsonSchema = zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'none'
  });
  
  // Remove the $schema property as it's not needed in OpenAPI
  const { $schema, ...openApiSchema } = jsonSchema as any;
  return openApiSchema;
}

/**
 * Generate OpenAPI specification for the API
 */
export function generateOpenAPISpec(): OpenAPIV3.Document {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Storytelling Platform API',
      version: '1.0.0',
      description: 'AI-powered collaborative storytelling platform with voice narration'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:5000',
        description: 'API Server'
      }
    ],
    paths: {
      '/api/auth/signup': {
        post: {
          summary: 'Create a new user account',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'User created successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/login': {
        post: {
          summary: 'Login with email and password',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/user': {
        get: {
          summary: 'Get current user',
          tags: ['Authentication'],
          security: [{ sessionAuth: [] }],
          responses: {
            '200': {
              description: 'Current user data',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            },
            '401': {
              description: 'Not authenticated',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        },
        put: {
          summary: 'Update user profile',
          tags: ['Authentication'],
          security: [{ sessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    language: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'User updated',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      },
      '/api/stories': {
        get: {
          summary: 'Get user stories',
          tags: ['Stories'],
          security: [{ sessionAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20 }
            },
            {
              name: 'status',
              in: 'query',
              schema: { 
                type: 'string',
                enum: ['draft', 'complete', 'published']
              }
            }
          ],
          responses: {
            '200': {
              description: 'List of stories',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Story'
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
          tags: ['Stories'],
          security: [{ sessionAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' }
            }
          ],
          responses: {
            '200': {
              description: 'Story details',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Story'
                  }
                }
              }
            },
            '404': {
              description: 'Story not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        },
        put: {
          summary: 'Update story',
          tags: ['Stories'],
          security: [{ sessionAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/StoryUpdateRequest'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Story updated',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Story'
                  }
                }
              }
            }
          }
        },
        delete: {
          summary: 'Delete story',
          tags: ['Stories'],
          security: [{ sessionAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' }
            }
          ],
          responses: {
            '200': {
              description: 'Story deleted',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/stories/draft': {
        post: {
          summary: 'Create draft story',
          tags: ['Stories'],
          security: [{ sessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    content: { type: 'string' },
                    uploadType: { 
                      type: 'string',
                      enum: ['text', 'voice', 'audio']
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Draft created',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Story'
                  }
                }
              }
            }
          }
        }
      },
      '/api/invitations/{token}': {
        get: {
          summary: 'Get invitation details',
          tags: ['Invitations'],
          parameters: [
            {
              name: 'token',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Invitation details',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Invitation'
                  }
                }
              }
            },
            '404': {
              description: 'Invitation not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
            language: { type: 'string' },
            locale: { type: 'string', nullable: true },
            nativeLanguage: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'email', 'language', 'createdAt', 'updatedAt']
        },
        Story: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string', nullable: true },
            status: { 
              type: 'string',
              enum: ['draft', 'complete', 'published']
            },
            processingStatus: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed']
            },
            analysis: { type: 'object', nullable: true },
            characters: { 
              type: 'array',
              items: { type: 'object' }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'userId', 'title', 'status', 'processingStatus', 'createdAt', 'updatedAt']
        },
        Invitation: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            storyId: { type: 'integer' },
            inviteToken: { type: 'string' },
            inviteeEmail: { type: 'string', nullable: true },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'rejected', 'expired']
            },
            conversationStyle: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            expiresAt: { type: 'string', format: 'date-time' },
            story: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' }
              }
            }
          },
          required: ['id', 'storyId', 'inviteToken', 'status', 'createdAt', 'expiresAt']
        },
        StoryUpdateRequest: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            status: {
              type: 'string',
              enum: ['draft', 'complete', 'published']
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          },
          required: ['message']
        }
      },
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication using cookies'
        }
      }
    }
  };
}

/**
 * Export OpenAPI spec as JSON
 */
export function getOpenAPIJSON(): string {
  return JSON.stringify(generateOpenAPISpec(), null, 2);
}