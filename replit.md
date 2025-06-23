# Storytelling App - Collaborative Roleplay Platform

## Overview

This is a full-stack collaborative storytelling platform that enables users to create, analyze, and perform stories through AI-powered narrative analysis and voice-based roleplay. The application combines modern web technologies with AI services to provide an immersive storytelling experience.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with Tailwind CSS styling
- **State Management**: TanStack Query for server state management
- **Routing**: Client-side routing with React components

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints with session-based authentication
- **File Handling**: Multer for multipart form data and file uploads
- **Audio Processing**: OpenAI TTS integration with custom voice matching system

### Database Layer
- **Primary Database**: PostgreSQL with connection pooling
- **ORM**: Drizzle ORM with type-safe queries
- **Migration Management**: Drizzle Kit for schema migrations
- **Session Storage**: PostgreSQL-backed session store using connect-pg-simple

## Key Components

### Authentication System
- **OAuth Integration**: Google, Facebook, and Microsoft OAuth providers
- **Session Management**: Express sessions with PostgreSQL storage
- **User Profiles**: Avatar support and profile management
- **Local Authentication**: Optional email/password authentication with bcrypt

### AI-Powered Story Analysis
- **Content Analysis**: OpenAI GPT-4o integration for story parsing
- **Character Extraction**: Automatic character identification with personality analysis
- **Emotion Detection**: Context-aware emotion mapping with intensity scoring
- **Voice Assignment**: Intelligent voice selection based on character attributes

### Audio Generation Service
- **Modular Design**: Centralized audio service with voice selection logic
- **Voice Matching**: Character-consistent voice assignment with user override priority
- **Emotion-Based Selection**: Speed and tone adjustments based on emotional context
- **Caching System**: File-based caching for generated audio with cleanup management

### Collaborative Features
- **Template System**: Convert stories into reusable roleplay templates
- **Invitation Management**: Character-specific invitations with unique tokens
- **Multi-Modal Notifications**: Email (SendGrid) and SMS (Twilio) integration
- **Participant Management**: Support for both registered and guest users

### Video Generation
- **Provider System**: Multi-provider architecture (RunwayML, Pika Labs, Luma AI)
- **Fallback Logic**: Automatic provider switching on failure
- **Cost Control**: Duration limits and cache-first strategy
- **Quality Options**: Configurable quality levels with appropriate API routing

## Data Flow

### Story Creation Flow
1. User creates story through multiple input methods (text, voice, file upload)
2. AI analysis extracts characters, emotions, and narrative structure
3. Results cached to prevent regeneration
4. Story stored with metadata and analysis results

### Roleplay Generation Flow
1. Story converted to roleplay template with scene breakdown
2. Character roles defined with required emotions and voice profiles
3. Invitations sent to participants with unique access tokens
4. Participants record character voices and submit media
5. Final video generation using collected assets

### Audio Generation Flow
1. Text input processed with emotion and character context
2. Voice selection prioritizes user recordings over AI voices
3. Audio generated and cached with metadata
4. Public URLs served through Express static middleware

## External Dependencies

### AI Services
- **OpenAI**: GPT-4o for content analysis, TTS for voice generation
- **Anthropic**: Claude integration for advanced content processing

### Communication Services
- **SendGrid**: Email delivery for invitations and notifications
- **Twilio**: SMS delivery for mobile notifications

### Video Generation
- **RunwayML**: Primary video generation provider
- **Pika Labs**: Secondary provider with different capabilities
- **Luma AI**: Tertiary provider for specialized content

### Infrastructure
- **Neon Database**: Managed PostgreSQL with serverless features
- **Replit**: Development and deployment platform
- **FFmpeg**: Audio processing and format conversion

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with hot reloading
- **Staging**: Preview deployments for testing
- **Production**: Auto-scaling deployment on Replit

### Build Process
1. Vite builds client-side React application
2. esbuild bundles server-side Node.js application
3. Assets processed and optimized for production
4. Database migrations applied automatically

### Cache Management
- **Environment-Specific**: Separate cache directories per environment
- **Size Limits**: Configurable cache limits (100MB dev, 2GB production)
- **Cleanup Jobs**: Automatic cleanup of expired cache files
- **Asset Serving**: Optimized static file serving with proper headers

## Changelog
- June 23, 2025: Enhanced video generation with comprehensive roleplay data integration
  - Fixed RunwayML authentication to use X-API-Key header consistently
  - Switched to /text_to_video endpoint for proper text-based prompts
  - Enhanced prompt generation to include detailed character information, voice assignments, scene dialogues, and emotional context
  - Improved scene building from roleplay analysis with rich dialogue extraction and mood inference
  - Added comprehensive error handling to prevent empty video URLs in database
  - Implemented emotion detection from dialogue text for enhanced video generation
- June 23, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.