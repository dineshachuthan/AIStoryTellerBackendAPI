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

## Future Roadmap

### User Emotion Images (Future Enhancement)
- **Feature**: Allow users to upload their own images for each emotion
- **Purpose**: Personalized emotion representation in stories and roleplays
- **Technical Notes**: Would extend the current image caching system to handle user-uploaded content
- **Priority**: Medium (requested but deferred for future implementation)

## Changelog
- June 25, 2025: Fixed Kling API authentication and parameter validation
  - Resolved JWT token generation to match Python/Java patterns exactly
  - Authentication now working with proper KLING_ACCESS_KEY and KLING_SECRET_KEY
  - Removed invalid duration parameter based on API testing
  - System ready for video generation with real API calls
- June 25, 2025: Implemented plug-and-play video provider architecture
  - Created IVideoProvider interface for true plug-and-play compatibility
  - Built VideoProviderRegistry for configuration-based provider management
  - Implemented provider-agnostic routes that work with any enabled provider
  - Providers auto-configure from environment variables with health checks
  - Generic video service abstracts all provider differences from routes
  - Routes remain constant regardless of enabled providers (Kling, RunwayML, future providers)
  - Configuration flags enable/disable providers without code changes
  - Automatic fallback between providers on failure
  - Standardized error handling and status management across all providers
- June 25, 2025: Completed Kling AI integration with enhanced character and scene support
  - Disabled all other video providers (RunwayML, Pika, Luma) as requested
  - Implemented proper Kling API structure with signature-based authentication
  - Added comprehensive character personality and appearance integration in video prompts
  - Enhanced scene backgrounds with atmospheric details, lighting, and visual descriptions
  - Created cost-controlled testing environment (20-second max, low resolution)
  - Ready for video generation pending API credential verification
- June 24, 2025: Implemented video regeneration functionality with cache clearing and database cleanup
  - Added regenerate video button that appears when video exists
  - Implemented force regeneration with complete cache and database clearing
  - Enhanced video prompt generation with detailed story content and character descriptions
  - Added cost warning dialog for regeneration to prevent accidental API costs
  - Video regeneration now sends complete story narrative and character details to RunwayML
- June 24, 2025: Enhanced video generation with proper story content and audio integration
  - Restored story-focused prompt generation while avoiding character name mentions for content moderation
  - Added automatic audio generation from roleplay dialogues using existing audio service
  - Enhanced video generation to include character dialogue audio alongside visual content
  - Improved prompt creation to include setting, mood, and scene descriptions for better relevance
  - Video generation now produces both visual content and accompanying character audio
- June 24, 2025: Resolved RunwayML API integration issues and stabilized video generation
  - Fixed "promptImage: Invalid input" error by temporarily disabling image-to-video generation
  - Enhanced text-to-video prompts to include character descriptions for better results
  - Improved error handling and logging for better debugging of API issues
  - Video generation now works reliably with text-based prompts enhanced with character information
- June 24, 2025: Fixed application startup and implemented robust image caching system
  - Created comprehensive ImageAssetService for local image storage and caching
  - Fixed expired OpenAI image URL issues by implementing automatic local caching
  - Enhanced RunwayML provider with graceful fallback from image-to-video to text-to-video
  - Updated character image generation to automatically cache all generated images locally
  - Added proper static file serving for cached images with appropriate headers
  - Application now successfully starts and video generation works reliably
- June 24, 2025: Optimized RunwayML integration per official documentation requirements
  - Implemented proper aspect ratio mapping for Gen-3 Alpha Turbo (1280:768, 768:1280)
  - Added size validation with 3.3MB data URI limit and 16MB URL limit per RunwayML specs
  - Enhanced image handling with automatic fallback from data URI to direct URL for large images
  - Validated content types (JPEG, PNG, WebP) according to RunwayML input requirements
  - Maintained character image-to-video generation with proper format compliance
- June 24, 2025: Enhanced RunwayML with character image-to-video generation
  - Implemented character reference image support using RunwayML SDK imageToVideo method
  - Added automatic fallback from image-to-video to text-to-video based on character image availability
  - Enhanced video generation to use character images from roleplay analysis for more accurate character representation
  - Maintained 20-second video generation limit for cost protection
- June 24, 2025: Final RunwayML API integration fixes
  - Added required X-Runway-Version header (2024-11-06) to meet API requirements
  - Moved API version to configuration instead of hardcoding for maintainability
  - Fixed all RunwayML API authentication and header requirements per official documentation
  - Maintained 20-second video generation limit for cost protection
- June 23, 2025: Corrected RunwayML API integration with proper endpoint structure
  - Updated RunwayML provider to use correct API endpoint (api.dev.runwayml.com/v1/generate) based on official documentation
  - Fixed authentication to use Bearer token format instead of X-API-Key for consistency with API docs
  - Enhanced response handling to support multiple API response formats (direct URL, task-based, nested data)
  - Updated video generation to maintain 20-second duration limit for cost protection
  - Improved error handling and logging for better debugging of API issues
- June 23, 2025: Implemented configurable roleplay duration system
  - Added separate roleplay configuration (shared/roleplay-config.ts) with duration targets from 60-240 seconds
  - Enhanced roleplay analysis generation to use configurable duration specifications for precise content creation
  - Updated AI prompts to generate exact word counts, dialogue counts, and scene structures based on target duration
  - Maintained strict 20-second video generation limit for cost protection while allowing longer roleplay content
  - Added roleplay configuration API endpoint to display current duration settings to users
- June 23, 2025: Enhanced video generation with comprehensive roleplay data integration
  - Enhanced prompt generation to include detailed character information, voice assignments, scene dialogues, and emotional context
  - Improved scene building from roleplay analysis with rich dialogue extraction and mood inference
  - Added comprehensive error handling to prevent empty video URLs in database
  - Implemented emotion detection from dialogue text for enhanced video generation
- June 23, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.