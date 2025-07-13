# Collaborative Storytelling Platform

## Overview

This is a full-stack collaborative storytelling platform that enables users to create AI-powered stories with voice narration, collaborative features, and multi-modal content generation. The application has been architected as separate frontend and backend projects for scalability and maintainability.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and ES modules
- **Build System**: Vite for fast development and optimized production builds
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management with optimistic updates
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Dark/light mode support with CSS variables
- **Development Port**: 3000 with API proxy configuration

### Backend Architecture
- **Runtime**: Node.js 18+ with Express.js framework
- **Language**: TypeScript with ES modules throughout
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Session Management**: Express sessions with potential PostgreSQL backing
- **API Design**: RESTful endpoints with comprehensive error handling
- **Development Port**: 5000 with health check endpoints

### Database Design
- **ORM**: Drizzle ORM with Neon serverless PostgreSQL connection
- **Schema Management**: Drizzle Kit for migrations and schema generation
- **Core Tables**: Users, Stories, ESM reference data, and user recordings
- **Data Validation**: Zod schemas integrated with Drizzle for runtime validation

## Key Components

### AI Service Integrations
- **OpenAI GPT-4**: Story analysis and content generation
- **Anthropic Claude**: Alternative AI provider for content analysis
- **ElevenLabs**: Voice cloning and text-to-speech synthesis
- **Multiple Video Providers**: RunwayML, Pika Labs, and Luma AI for video generation

### Communication Services
- **Email**: MailGun (primary) and SendGrid (fallback) for transactional emails
- **SMS**: Twilio (primary) and MessageBird (fallback) for notifications
- **Real-time**: WebSocket support for cache invalidation and live updates

### Payment Integration
- **Stripe**: Complete payment processing with subscription management
- **Frontend**: Stripe React components for secure payment flows

### Microservices Architecture
The backend implements an adapter pattern for gradual microservices migration:
- **Identity Service**: User authentication and profile management
- **Story Service**: Story creation, editing, and AI-powered analysis
- **Collaboration Service**: User invitations and roleplay management
- **Narration Service**: Voice cloning and audio generation workflows
- **Video Service**: Multi-provider video generation with fallback support
- **Notification Service**: Event-driven email and SMS notifications
- **Subscription Service**: Payment processing and plan management

## Data Flow

### Story Creation Workflow
1. User creates story draft through React frontend
2. Frontend sends POST request to `/api/stories` endpoint
3. Backend validates data using Zod schemas
4. Story saved to PostgreSQL with draft status
5. Optional AI analysis triggered for content enhancement
6. Real-time updates sent via WebSocket for collaborative editing

### Voice Narration Pipeline
1. User selects ESM (Emotion/Sound/Modulation) preferences
2. Story content processed through voice style orchestrator
3. ElevenLabs API called for voice synthesis with conversation styles
4. Audio files stored and linked to story records
5. Frontend receives audio URLs for playback

### Authentication Flow
1. User submits credentials through React login form
2. Backend validates against PostgreSQL user table
3. JWT token generated and returned to frontend
4. Frontend stores token and includes in API requests
5. Middleware validates tokens on protected routes

## External Dependencies

### Core Infrastructure
- **Database**: Neon serverless PostgreSQL
- **File Storage**: Local filesystem (extensible to cloud storage)
- **Environment Variables**: Dotenv for configuration management

### AI and Content Services
- **OpenAI**: GPT-4 API for story analysis and generation
- **Anthropic**: Claude API for alternative AI processing
- **ElevenLabs**: Voice cloning and TTS synthesis
- **Video Generation**: Multiple providers (RunwayML, Pika Labs, Luma AI)

### Communication and Payments
- **Email**: MailGun and SendGrid APIs
- **SMS**: Twilio and MessageBird APIs
- **Payments**: Stripe API with React integration
- **Real-time**: WebSocket connections for live updates

### Development and Deployment
- **Package Management**: npm with lockfile for consistent dependencies
- **Type Safety**: TypeScript with strict configuration
- **Code Quality**: ESLint for linting and formatting
- **Build Process**: Vite for frontend, tsc for backend compilation

## Deployment Strategy

### Frontend Deployment
- **Build Target**: Static files generated by Vite
- **Deployment**: Can be deployed to any static hosting service
- **Environment**: Production API URL configured via environment variables
- **Performance**: Code splitting and lazy loading implemented

### Backend Deployment
- **Build Process**: TypeScript compilation to JavaScript
- **Runtime**: Node.js with Express server
- **Database**: PostgreSQL connection via environment variables
- **Process Management**: Graceful shutdown handling for SIGTERM/SIGINT
- **Health Checks**: `/health` endpoint for monitoring

### Database Setup
- **Migration Scripts**: Located in `backend-project/DB_SCRIPTS/`
- **Initialization**: DDL scripts for table creation
- **Reference Data**: Automated loading of ESM and configuration data
- **Backup Strategy**: Standard PostgreSQL backup procedures

### Environment Configuration
- **Frontend**: `VITE_API_URL` for backend connection
- **Backend**: Database URLs, API keys, and service configurations
- **Security**: JWT secrets and encryption keys managed via environment variables
- **Monitoring**: Health check endpoints and error logging systems

The architecture supports both monolithic deployment and gradual migration to microservices, with clear separation of concerns and comprehensive error handling throughout the system.