# Collaborative Storytelling Platform

## Overview

This is a collaborative storytelling platform that enables users to create AI-powered stories with voice narration, collaborative features, and multi-modal content generation. The application was originally a monolithic full-stack project but has been separated into independent frontend and backend applications for better scalability and deployment flexibility.

## User Preferences

Preferred communication style: Simple, everyday language.

## Development Philosophy

### API First Development - STRICTLY ENFORCED

**Core Principle**: The API specification is the single source of truth for all development.

**Mandatory Workflow**:
1. **API Design First**: All new features must start with OpenAPI/Swagger specification
2. **Specification Completeness**: Every endpoint must have complete request/response schemas before implementation
3. **Implementation Follows Spec**: Backend routes must match the API specification exactly
4. **Frontend Contracts**: Frontend development uses the API specification as the contract
5. **No Divergence**: Any changes to APIs must update the specification first, then implementation

**Quality Standards**:
- All endpoints must have complete Swagger documentation
- Request/response schemas must be detailed and accurate
- Parameter validation must match specification exactly
- Error responses must be documented and consistent
- Interactive testing must be available through Swagger UI

**Enforcement Rules**:
- Never implement endpoints without updating Swagger documentation first
- Never add functionality that isn't reflected in the API specification
- Always maintain specification-implementation synchronization
- All API changes require specification review and approval

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and ES modules
- **Build System**: Vite for fast development and optimized production builds
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query for server state management with optimistic updates and caching
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Dark/light mode support with CSS variables
- **Development**: Runs on port 3000 with API proxy configuration to backend

### Backend Architecture
- **Runtime**: Node.js 18+ with Express.js framework
- **Language**: TypeScript with ES modules throughout the codebase
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **API Design**: RESTful endpoints with comprehensive error handling and validation
- **API Documentation**: OpenAPI/Swagger specification as single source of truth
- **Development**: Runs on port 5000 with health check endpoints and interactive API docs

### Database Design
- **ORM**: Drizzle ORM with Neon serverless PostgreSQL connection
- **Schema Management**: Drizzle Kit for migrations and schema generation
- **Core Tables**: Users, Stories, ESM reference data (emotions/sounds/modulations), and user recordings
- **Data Validation**: Zod schemas integrated with Drizzle for runtime type validation

## Key Components

### AI Service Integrations
- **OpenAI GPT-4**: Primary AI service for story analysis and content generation
- **Anthropic Claude**: Alternative AI provider for content analysis and processing
- **ElevenLabs**: Voice cloning and advanced text-to-speech synthesis with customizable voice parameters
- **Video Generation**: Multiple providers including RunwayML, Pika Labs, and Luma AI for video content creation

### Communication Services
- **Email**: Dual-provider setup with MailGun (primary) and SendGrid (fallback) for transactional emails
- **SMS**: Twilio (primary) and MessageBird (fallback) for SMS notifications
- **Real-time Communication**: WebSocket support for cache invalidation and live collaboration features

### Payment Integration
- **Stripe**: Full payment processing with subscription management
- **Frontend**: Stripe React components for payment UI
- **Backend**: Stripe SDK for payment processing and webhook handling

### Voice and Audio Features
- **Voice Cloning**: ElevenLabs integration for creating custom voice profiles
- **Audio Processing**: Advanced voice synthesis with emotion, sound effects, and modulation controls
- **Conversation Styles**: Support for different speaking styles (respectful, business, jovial, playful, close_friends)
- **Sound Effects**: Pattern-based sound insertion for immersive storytelling

## Data Flow

### Story Creation Flow
1. User creates story through frontend interface
2. Story data sent to backend via REST API
3. Backend validates and stores story in PostgreSQL
4. AI analysis triggered for content processing
5. Results cached and returned to frontend

### Voice Generation Flow
1. User requests voice narration for completed story
2. Backend processes story content through AI analysis
3. Voice parameters calculated based on character emotions and context
4. ElevenLabs API called for audio generation
5. Generated audio stored and served to frontend

### Authentication Flow
1. User credentials validated against database
2. JWT token generated and returned to frontend
3. Token stored in browser and sent with API requests
4. Backend middleware validates token on protected routes

## External Dependencies

### AI Services
- OpenAI API for GPT-4 content generation
- Anthropic Claude API for alternative AI processing
- ElevenLabs API for voice synthesis and cloning

### Communication Services
- MailGun and SendGrid for email delivery
- Twilio and MessageBird for SMS notifications

### Infrastructure
- Neon PostgreSQL for database hosting
- Stripe for payment processing
- Various video generation APIs (RunwayML, Pika Labs, Luma AI)

## Deployment Strategy

### Backend Deployment
- **Environment**: Node.js production environment
- **Database**: PostgreSQL with connection pooling
- **Process Management**: PM2 or similar for production
- **Environment Variables**: Secure API keys and database credentials
- **Health Checks**: Built-in health check endpoints for monitoring

### Frontend Deployment
- **Build Process**: Vite production build with optimizations
- **Static Hosting**: Can be deployed to any static hosting service
- **Environment Configuration**: API URL configured via environment variables
- **CDN**: Recommended for static asset delivery

### Database Setup
- **Migration Scripts**: Located in backend-project/DB_SCRIPTS/
- **Reference Data**: Automated setup scripts for ESM data and application states
- **Schema Management**: Drizzle Kit for version-controlled database changes

The application uses a microservices-ready architecture with adapter patterns for gradual service separation, making it scalable for future growth while maintaining development simplicity.

## Recent Changes

### January 2025 - API First Development Implementation ✅
- **Date**: January 13, 2025
- **Status**: Successfully implemented and tested
- **Changes Made**:
  - Created comprehensive OpenAPI specification (`backend-project/openapi.yaml`) with 15 endpoints
  - Updated backend to use YAML specification as single source of truth
  - Implemented full CRUD operations for all resources (Authentication, Users, Stories, Voice Recordings)
  - Enhanced Swagger UI with interactive testing capabilities
  - Added strict API First development guidelines to replit.md
  - All endpoints now have complete request/response schemas with proper validation
- **Impact**: API specification now drives both backend implementation and frontend development
- **User Confirmation**: ✅ Verified working at http://localhost:5000/api-docs

### Project Architecture Status
- **Backend**: 15 fully documented API endpoints with interactive testing
- **Frontend**: React application with storytelling platform interface
- **Database**: PostgreSQL with Drizzle ORM and proper schema validation
- **Documentation**: OpenAPI/Swagger as single source of truth for all API contracts
- **Development**: Single workflow managing both projects independently