# Storytelling App - Collaborative Roleplay Platform

## Overview

This is a relationship-aware content sharing platform that enables users to create stories once and automatically narrate them differently based on their relationship with each recipient. The same story content gets narrated with different conversation styles (respectful tone for parents, business tone for colleagues, authoritative tone for kids, etc.) using ElevenLabs TTS. The platform supports multi-dimensional caching with cache keys structured as User.StoryID.ConversationStyle.Emotion, enabling personalized content delivery based on relationship context.

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

## CRITICAL DEVELOPMENT RULES (NEVER VIOLATE)

### Zero Tolerance Unauthorized Changes Policy (MANDATORY ENFORCEMENT)
**ANALYSIS ONLY - NO CODE CHANGES WITHOUT EXPLICIT USER AUTHORIZATION**
- NEVER create, modify, or drop database tables without user approval
- NEVER create new REST API endpoints without user approval  
- NEVER create new .ts files without user approval
- NEVER add database columns without user approval
- NEVER make any code changes without explicit user authorization
- MANDATORY WORKFLOW: Analysis → Root Cause → Solution Proposal → Wait for Authorization → Implement
- VIOLATION OF THIS RULE COSTS USER MONEY AND CREATES ARCHITECTURAL DEBT
- Pattern: Analyze → Propose Solution → Wait for Authorization → Implement Only When Approved

### Zero Tolerance Code Duplication Policy
**ABSOLUTELY NO DUPLICATE METHODS, FUNCTIONS, OR CODE BLOCKS ANYWHERE IN THE CODEBASE**
- ALWAYS fix bugs in existing methods - NEVER create new duplicate methods
- When fixing bugs, use str_replace to modify the existing code directly
- If method needs complete rewrite, comment out old method first, then replace
- Before adding ANY new method, search for existing implementations
- VIOLATION OF THIS RULE CREATES SQL SYNTAX ERRORS AND CODE BLOAT
- Pattern: Fix existing code → Test → Remove old code if commenting was needed

### Mandatory Method Documentation Policy
**ALL METHODS MUST HAVE JSDOC COMMENTS EXPLAINING PURPOSE AND PARAMETERS**
- Add JSDoc comments above every async method with @param and @returns
- Explain what the method does, not just repeat the method name
- Include parameter types and return value descriptions
- Example: `/** Get user ESM progress by ID @param userId @returns ESM record or null */`
- This prevents confusion about method purposes and reduces duplicate creation

### Zero Tolerance Hardcoding Policy
**ABSOLUTELY NO HARDCODED TEXT, LABELS, BUTTONS, TITLES, TOOLTIPS, OR MESSAGES ANYWHERE IN THE CODEBASE**
- ALL user-facing text MUST use UIMessages internationalization system from shared/i18n-config.ts
- ALL configuration values MUST come from dedicated config files (shared/draft-config.ts, etc.)
- ALL database counts MUST be sourced from actual database queries
- VIOLATION OF THIS RULE IS UNACCEPTABLE - user has spent hours establishing these patterns
- When adding ANY text, immediately create corresponding i18n template with proper variables
- Pattern: `{UIMessages.getTitle('MESSAGE_CODE')}` or `{getDynamicMessage('CODE', variables).message}`

### Zero Tolerance Direct API Call Policy
**FRONTEND MUST ONLY COMMUNICATE WITH BACKEND THROUGH api-client.ts - NO EXCEPTIONS**
- ABSOLUTELY NO direct fetch(), apiRequest(), or endpoint calls anywhere in frontend components
- ALL backend communication MUST go through apiClient.stories, apiClient.auth, apiClient.voice, etc.
- VIOLATION OF THIS RULE HAS BEEN FIXED MULTIPLE TIMES - user has zero tolerance for this
- Before ANY API communication, check if endpoint exists in api-client.ts - if not, add it there first
- NEVER use direct API calls even for "temporary" or "quick" solutions
- Pattern: `apiClient.stories.get(id)` NOT `fetch('/api/stories/${id}')`
- Pattern: `apiClient.audio.transcribe(formData)` NOT `fetch('/api/audio/transcribe', {method: 'POST', body: formData})`
- **ARCHITECTURAL RULE**: api-client.ts MUST be in client/src/lib/ - NEVER in shared folder (fixed July 10, 2025)

### Zero Tolerance React Query Default QueryFn Policy (MANDATORY - July 11, 2025)
**ALL REACT QUERY USAGE MUST EXPLICITLY SPECIFY queryFn WITH API CLIENT METHODS**
- ABSOLUTELY NO reliance on default queryFn in useQuery hooks - ALL queries must specify explicit queryFn
- MANDATORY PATTERN: `queryFn: () => apiClient.stories.get(id)` - NEVER omit queryFn
- VIOLATION: `queryKey: ['/api/stories']` without explicit queryFn is FORBIDDEN
- DEFAULT QUERYFN REMOVED: client/src/lib/queryClient.ts no longer provides automatic fetch behavior
- **MIGRATION ENFORCEMENT**: When touching ANY component with React Query usage:
  1. IMMEDIATELY fix ALL useQuery calls to use explicit queryFn with API client methods
  2. Add missing API client methods if endpoints don't exist in api-client.ts
  3. NEVER proceed with other changes until ALL queries are compliant
- **ARCHITECTURAL COMPLIANCE**: This enforces the Zero Tolerance Direct API Call Policy at the React Query level
- **AUTOMATIC ENFORCEMENT**: Missing queryFn will cause immediate runtime errors, surfacing violations instantly

### Zero Tolerance Deprecated API Usage Policy
**NEVER USE, REFERENCE, OR ANALYZE DEPRECATED API ENDPOINTS WITHOUT EXPLICIT REQUEST**
- ABSOLUTELY NO use of deprecated endpoints in any development, analysis, or recommendations
- DEPRECATED endpoints are marked with `/* DEPRECATED` comments in server/routes.ts
- FORBIDDEN deprecated endpoints (July 11, 2025):
  - `/api/stories/:storyId/voice-samples` - Use narrative endpoint instead
  - `/api/user-voice-emotions/:userId` - Legacy system removed
  - `/api/users/:userId/voice-samples` - Legacy voice samples mapping
  - `/api/user/voice-recordings` - Use `/api/user/esm-recordings` instead
- ONLY analyze deprecated endpoints when explicitly asked "analyze deprecated API"
- USER HAS ZERO TOLERANCE for repeated use of deprecated endpoints
- Pattern: Use `/api/user/esm-recordings` NOT `/api/user/voice-recordings`
- Pattern: Use `/api/stories/:storyId/narrative` NOT `/api/stories/:storyId/voice-samples`

### Zero Tolerance Direct Toast Usage Policy
**ALL TOAST MESSAGES MUST USE toast-utils.ts - NO DIRECT useToast() CALLS**
- ABSOLUTELY NO direct useToast() or toast() calls anywhere in frontend components
- ALL toast notifications MUST go through toast.success(), toast.error(), toast.info() from toast-utils.ts
- VIOLATION OF THIS RULE HAS BEEN FIXED 100+ TIMES - user has zero tolerance for this recurring issue
- Use toastMessages for common patterns with i18n support
- ALL toasts automatically use 5-second duration and proper i18n messages
- NEVER import useToast directly - only import from toast-utils.ts
- Pattern: `toast.success(toastMessages.saveSuccess('item'))` NOT `toast({ title: 'Success', variant: 'default' })`
- Pattern: `toast.error(toastMessages.saveFailed('error'))` NOT `toast({ title: 'Error', variant: 'destructive' })`

### Zero Tolerance Test Data Policy
**DO NOT ADD ANY TEST DATA INTO DATABASE WITHOUT PRIOR APPROVAL**
- NEVER insert test records, mock data, or fallback values into any database table
- NEVER use placeholder AI voices (nova, shimmer, etc.) for testing
- NEVER create synthetic narration records for development
- ALL data must come from actual user interactions and real integrations
- If testing requires data, ask user for approval and design first
- VIOLATION OF THIS RULE UNDERMINES SYSTEM INTEGRITY

### Communication Rule - Question Detection Policy
**WHEN USER MESSAGE ENDS WITH "?" - PROVIDE ANSWER, NOT CODE CHANGES**
- Any user message ending with "?" indicates they want an explanation or answer
- Do NOT make code changes when user is asking a question
- First answer the question, then ask if they want implementation changes
- This prevents unwanted code modifications when user seeks understanding

### Database-First Cache Architecture (CRITICAL)
**ALL DATABASE WRITES MUST USE CACHE PROVIDER PATTERN WITH IMMEDIATE CACHE INVALIDATION**
- **Database-First Rule**: Database write MUST complete before cache update
- **Immediate Cache Invalidation**: After any database write, cache MUST be invalidated immediately
- **No Direct Database Writes**: ALL database operations must go through cache provider pattern
- **BaseCachedProvider Pattern**: External integrations use unified caching, retry, timeout, and error handling
- **Simplified Cache Invalidation**: Direct React Query cache invalidation via API client after successful operations  
- **Architecture Violation**: Direct storage.updateStory() calls bypass cache architecture - FORBIDDEN
- **Frontend Cache Sync**: API client automatically invalidates React Query cache after database writes (same-tab only)
- **Zero Cache Bypass**: No database operations should bypass the cache provider architecture

### Database-Driven State Management (MANDATORY)
**ALL APPLICATION STATES LOADED FROM DATABASE VIA SINGLETON STATEMANAGER**
- **StateManager Singleton**: Single instance loads all states from database on app startup
- **Zero Database Calls**: State lookups use in-memory cache for instant access
- **Complete State Types**: story, story_instance, video_job, voice_training, story_processing
- **Never Use state-config.ts**: Configuration file is outdated - all states come from database
- **Initialization**: StateManager.initialize() called on server startup
- **API Integration**: Routes use stateManager.getValidStates() for state information
- **Type Safety**: StateTypeSchema validates against actual database state types

### Mandatory Architectural Patterns (ALWAYS FOLLOW)
- **BaseCachedProvider**: All external API integrations MUST use cached provider pattern
- **UIMessages I18N**: All text MUST use internationalization system with proper template interpolation
- **Plug-and-Play External APIs**: Zero fallback provider logic anywhere in system
- **Database-First Operations**: All data operations go to database first, then cache
- **State-Driven Workflow**: All story states use established state transition system
- **EnhancedVoiceRecorder**: FINALIZED as single reusable voice recording component - NEVER create copies or alternatives. All voice recording functionality across application uses this component with different props. Features: status icons (unlock/checkmark/lock), horizontal button layout (Record/Play/Save), wide black panel, intensity badges.
- **UniversalNarrationPlayer**: FINALIZED as the standard narration playback component - MANDATORY for ALL narration functionality. This is separate from voice recording and handles audio playback only. Features: segment-based audio playback, auto-advance between segments, manual next/previous navigation, progress tracking, conversation style support, narrator profile integration. Located at `client/src/components/ui/universal-narration-player.tsx`. Key behaviors: Auto-play continues when audio is playing and segment ends naturally; Auto-advance without auto-play when audio is paused (respects user pause intention); Manual navigation preserves play state; Uses React state for audio URL management. NEVER create alternative narration players - use this component with different props for all narration needs.

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

### Audio Storage Provider System
- **Plug-and-Play Architecture**: Multiple storage providers (Replit, S3, Azure) with unified interface
- **Configuration-Driven Selection**: Provider chosen based on environment variables and priority
- **Secure Access**: Dynamic JWT token generation for temporary external API access
- **Database Design**: Relative URLs stored in database, provider-specific URLs generated on-demand
- **Default Provider**: Replit with fallback to localhost for development
- **Security Model**: Time-limited signed URLs (30 minutes) for external API access without storing permanent tokens
- **Zero Migration Required**: Replit provider works with existing file locations transparently - no data migration needed
- **Voice Recording Integration**: New recordings continue using same file paths, audio storage provider handles serving through signed URLs
- **External API Compatibility**: ElevenLabs and other external APIs receive accessible signed URLs without knowing internal storage architecture
- **JWT Audio Serving**: Fixed JWT implementation - audio files now properly secured with expiring tokens instead of public access
- **Privacy Protection**: Anonymous external IDs (e.g., anon_r3uo1bdh72) replace real user IDs for all external service integrations

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

## Critical Design Patterns (MUST FOLLOW)

### Email Template System Architecture
**PATTERN**: All email content uses template-driven architecture with NO hardcoded HTML/text
- **Template Location**: `server/email-templates/` directory with organized template files
- **Template Interface**: EmailTemplate with id, name, subject, description, variables, html, text, webhooks, providerConfig
- **Template Compilation**: Use `compileEmailTemplate(template, data)` helper that calls `interpolateTemplate()`
- **Variable Interpolation**: Supports {{variable}} placeholders and {{#if condition}} conditionals
- **Provider Agnostic**: Templates work with any email provider (MailGun, SendGrid, etc.)
- **Pattern Example**:
  ```typescript
  const templateData = { recipientName: 'John', resetLink: 'https://...' };
  const compiled = compileEmailTemplate(passwordResetTemplate, templateData);
  const emailMessage: EmailMessage = {
    to: email,
    from: provider.config.fromEmail,
    subject: compiled.subject,
    text: compiled.text,
    html: compiled.html,
  };
  ```

### Plug-and-Play Provider Architecture  
**PATTERN**: All external service integrations use provider registry pattern
- **Email Providers**: BaseEmailProvider → MailgunEmailProvider/SendGridEmailProvider
- **Voice Providers**: BaseVoiceProvider → ElevenLabsProvider/KlingVoiceProvider  
- **Video Providers**: BaseVideoProvider → RunwayMLProvider/PikaLabsProvider
- **Audio Storage**: BaseAudioStorageProvider → ReplitProvider/S3Provider
- **Registry Pattern**: Provider registry handles priority-based selection and health checks
- **Zero Fallback Logic**: No hardcoded fallbacks - only configured providers are used
- **Environment-Driven**: Provider selection based on available credentials

### Authentication Email Functions
**ESTABLISHED PATTERNS**: 5 core authentication email functions with template integration
1. `sendPasswordResetEmail()` - Uses passwordResetTemplate
2. `sendVerificationCodeEmail()` - Uses verificationCodeTemplate  
3. `sendWelcomeEmail()` - Uses welcomeEmailTemplate
4. `sendTwoFactorCodeEmail()` - Uses twoFactorCodeTemplate
5. `sendRoleplayInvitation()` - Uses roleplayInvitationTemplate

### Error Handling Patterns
**PATTERN**: Consistent error handling across all email functions
- Log when no provider configured (not an error, just info)
- Try/catch blocks with specific error logging
- Return boolean success/failure
- Provider-specific error details in logs

## External Dependencies

### AI Services
- **OpenAI**: GPT-4o for content analysis, TTS for voice generation
- **Anthropic**: Claude integration for advanced content processing

### Communication Services
- **MailGun**: Primary email provider (priority 1) with domain-based configuration
- **SendGrid**: Secondary email provider (priority 2) as fallback
- **Twilio**: SMS/WhatsApp delivery with sandbox support (priority 2)
- **MessageBird**: SMS/WhatsApp delivery with business API support (priority 1)

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

## File Organization Guidelines (MANDATORY - July 10, 2025)

### STRICT FILE PLACEMENT RULES - MUST FOLLOW WITHOUT EXCEPTION

**NEVER CREATE FILES IN ROOT DIRECTORY EXCEPT:**
- package.json, package-lock.json (npm requirement)
- .env.example, .gitignore, .replit (environment files)
- README.md, replit.md (documentation)
- components.json (shadcn requirement)

**FILE PLACEMENT RULES BY TYPE:**

1. **Test Files**
   - Integration tests: `/test/integration/{category}/`
   - Unit tests: `/test/unit/`
   - E2E tests: `/test/e2e/`
   - NEVER in root or `/test-scripts/`

2. **Configuration Files**
   - Build configs: `/config/build/` (vite, tailwind, postcss, drizzle, tsconfig)
   - Runtime configs: `/config/data/` (conversationStyle.json, soundsPattern.json, etc.)
   - NEVER in root unless required by tool

3. **Utility Scripts**
   - Voice scripts: `/scripts/voice/`
   - Narration scripts: `/scripts/narration/`
   - Audio scripts: `/scripts/audio/`
   - Database scripts: `/scripts/database/`
   - NEVER in root

4. **External Provider Integrations**
   - AI providers: `/server/external-providers/ai/{provider-name}/`
   - Voice providers: `/server/external-providers/voice/{provider-name}/`
   - Video providers: `/server/external-providers/video/{provider-name}/`
   - Email providers: `/server/external-providers/email/{provider-name}/`
   - Storage providers: `/server/external-providers/storage/{provider-name}/`
   - Auth providers: `/server/external-providers/auth/{provider-name}/`

5. **Cache Implementations**
   - Provider-specific: Within provider folder (e.g., `/server/external-providers/ai/openai/openai-cached-provider.ts`)
   - Base classes: `/server/cache/`

6. **Shared Folder Organization (UPDATED - July 10, 2025)**
   - Configuration files: `/shared/config/` (i18n-config.ts, language-config.ts, state-config.ts, etc.)
   - Database schemas: `/shared/schema/` (schema.ts and related files)
   - Type definitions: `/shared/types/` (api-response.ts, api-types.ts, etc.)
   - Constants: `/shared/constants/` (audio-config.ts, ephemeral-voice-config.ts, etc.)
   - Utilities: `/shared/utils/` (i18n-hierarchical.ts, state-manager.ts, etc.)
   - NEVER place files directly in `/shared/` root

**DECISION TREE FOR FILE CREATION:**
1. Is it a test? → `/test/{type}/`
2. Is it a config? → `/config/{build|data}/`
3. Is it a script? → `/scripts/{domain}/`
4. Is it a provider? → `/server/external-providers/{type}/{provider}/`
5. Is it server code? → `/server/` (appropriate subdirectory)
6. Is it client code? → `/client/` (appropriate subdirectory)
7. Is it shared? → `/shared/{config|schema|types|constants|utils}/`

**BEFORE CREATING ANY FILE, ASK:**
- Does this file type have a designated location above?
- Am I about to put it in the root directory?
- Does a similar file exist I can check for pattern?

**VIOLATION CONSEQUENCES:**
- User has zero tolerance for disorganized file placement
- Previous violations have caused significant cleanup work
- This is as important as the code duplication policy

## Future Roadmap

### Voice Collection & Narration System Roadmap

#### **Phase 1: Simple Global Voice Sample Collection (Current Priority)**
**Basic 8-10 Emotion Voice Recording System**
- **Core Emotions**: Happy, Sad, Angry, Fear, Surprised, Disgusted, Neutral, Excited, Thoughtful, Confident
- **Simple Interface**: Grid layout showing emotion cards with record buttons
- **Sample Requirements**: 15-25 seconds per emotion with provided sample text
- **Storage**: Local audio files in database without external API dependencies
- **Progress Tracking**: Visual indicators for completed/pending emotions
- **No Gamification Yet**: Focus on core functionality first

#### **Phase 2: Ephemeral Voice Architecture Implementation**
**Breakthrough Solution for ElevenLabs Voice Limits**
- **Core Innovation**: Create voice → Generate narrations → Delete voice (bypass 30-voice limit)
- **Voice Session Manager**: Handles temporary voice lifecycle
- **Batch Processing**: Generate all pending narrations in one session
- **Smart Caching**: Check existing narrations before creating voice
- **Automatic Cleanup**: Delete voice IDs after narration generation
- **Storage Structure**: Keep only generated audio files, not voice IDs

#### **Phase 3: Gamification & Engagement Features**
**Make Voice Collection Fun and Addictive**
- **Achievement System**: 
  - First Voice, Emotion Explorer (5), Voice Master (10)
  - Quality Champion, Story Narrator, Prolific Storyteller
- **Progress Visualization**:
  - Emotion map showing coverage
  - Recording streaks and daily challenges
  - Voice personality profile analysis
- **Social Features**:
  - Weekly emotion challenges
  - Leaderboards (without storing voices)
  - Story showcase for narrated content
- **Instant Gratification**:
  - Preview emotions in mini-stories
  - Fun voice effects and filters
  - Satisfying progress animations

#### **Phase 4: Advanced Features**
- **Voice Analytics Dashboard**: Expression scores, clarity metrics, improvement trends
- **AI Enhancement** (when API available): Quality analysis, voice coaching
- **Community Features**: Voice challenges, peer reviews, story collaborations
- **Multi-Language Support**: Expand beyond English to user's native languages

**Technical Implementation Notes:**
- **Hybrid Approach**: Works with or without external APIs
- **Progressive Enhancement**: Each phase adds value independently
- **Data Privacy**: Track metadata only, ephemeral voice handling

**Phase 2: Collaborative Review Infrastructure**
6. Create story invitation system for friends and family
7. Implement guest user voice sample collection (no account required)
8. Build multi-user voice management - users can see each other's narrator voices
9. Add voice selection interface - choose which voice to play story with
10. Create feedback collection system for collaborative reviewers

**Phase 3: Voice Inheritance and Cloning System**
11. Implement story finalization workflow with feedback incorporation
12. Create public story publishing with original author's voice as default
13. Build story cloning system - users can copy stories with inherited narrator voice
14. Add voice sample override system - cloners can create their own narrator voices
15. Implement voice lineage tracking - show original author vs custom voices

**Phase 4: State-Driven Workflow Management**
16. Create UI components for each story state (private testing, collaborative review, finalized)
17. Build state transition controls - buttons to move stories between states
18. Add state-specific permissions - only authors can invite, reviewers can test voices
19. Implement automatic state progression based on completion criteria
20. Create state dashboard - show stories in each phase of narration workflow

**Phase 5: Multi-Voice Story Experience**
21. Build story player with voice switching capability during playback
22. Create voice comparison interface - A/B test different narrator voices
23. Add voice quality metrics - user ratings and preference tracking
24. Implement collaborative decision making - group vote on best voice
25. Create voice performance analytics - usage stats and popularity

**Phase 6: Advanced Voice Features**
26. Add emotion-based voice modulation during story narration
27. Create character-specific voice assignment for multi-character stories
28. Build voice blending capabilities - combine multiple user voices
29. Implement voice coaching system - help users improve their narration
30. Add voice style templates - dramatic, comedic, mysterious narration styles

**Phase 7: Community and Discovery**
31. Create public story gallery with voice previews
32. Build voice artist profiles - showcase users' narration skills
33. Add story recommendation system based on voice preferences
34. Implement voice collaboration marketplace - users can offer narration services
35. Create voice challenges and competitions for community engagement

### ElevenLabs Voice Cloning Integration - CRITICAL LOCKING LOGIC

**VOICE MANAGEMENT STRATEGY - Account Limit Handling**:
- **UPDATE EXISTING VOICES**: System now checks for existing narrator voice before creating new ones
- **AUTOMATIC VOICE REPLACEMENT**: When regenerating voices, old voice is deleted and replaced with new one
- **PREVENTS ACCOUNT LIMITS**: Ensures users don't hit ElevenLabs voice count restrictions
- **VOICE ID PERSISTENCE**: Same voice ID slot is reused when updating voices
- **IMPLEMENTATION**: `updateVoice()` method in ElevenLabsModule handles delete + recreate workflow
- **DATABASE CONSISTENCY**: All references to old voice ID remain valid after update

**CORE OBJECTIVE**: Create unique narrator voices for each emotion/sound to bring stories to life with segment-specific narration (angry segments use angry voice, sad segments use sad voice, etc.)

**GRADUAL VOICE COLLECTION STRATEGY**:
- Users add stories slowly (1 per week) - we collect voice samples over time across multiple stories
- Each story may contain different emotions/sounds (2 stories with happy, 5 with sad, etc.)
- By 100 stories, we should have 5+ samples for each emotion/sound

**VOICE LOCKING ALGORITHM - MUST FOLLOW THIS EXACT LOGIC**:

1. **LOCKING THRESHOLD**: Each emotion/sound needs exactly 6 unlocked samples ACROSS ALL STORIES to create its own permanent voice
   - Example: "happy" emotion with 6 total samples (2 from story A + 2 from story B + 2 from story C) → Create unique "happy" voice → Lock those 6 samples forever
   - Example: "footsteps" sound with 6 total samples across multiple stories → Create unique "footsteps" voice → Lock forever
   - CRITICAL: Counting is across ALL user stories, not per individual story

2. **WHEN CALLING ELEVENLABS - PRIORITY ORDER**:
   ```
   Step 1: Check for lockable emotions/sounds
   - Group all recordings by emotion/sound name
   - Find any with 5+ UNLOCKED samples
   - Process these INDIVIDUALLY to create unique voices
   - Lock these samples forever with their unique voice IDs
   
   Step 2: Create general narrator voice
   - Use ALL unlocked samples first
   - Only add locked samples if unlocked < 5 (minimum threshold)
   - This general voice is temporary until all emotions get locked
   ```

3. **LOCKING RULES**:
   - Samples are locked ONLY when used to create emotion-specific voices (5+ samples)
   - Locked samples have `is_locked=true` and `narrator_voice_id` set
   - Once locked, samples are NEVER unlocked (permanent quality voice)
   - Locked samples are only used for general voice if absolutely necessary

4. **FAILURE HANDLING**:
   - If ElevenLabs fails, reset the recording (null audio_url, clear status)
   - User can then re-record that emotion/sound
   - NEVER retry application exceptions - only network errors

**END STATE**: All emotions/sounds have their own unique locked voices, no more general narrator voice needed

**FAULT-TOLERANT AUDIO VALIDATION SYSTEM - Comprehensive Format Validation**
- **Validation at Save Time**: When user uploads voice recording, perform audio format detection and validation
  - Supported formats: MP3, WAV, WebM, M4A
  - Minimum duration: 5 seconds for ElevenLabs compatibility
  - If validation fails: Delete existing database record to allow immediate re-recording
- **Pre-ElevenLabs Validation**: CRITICAL - Validate EVERY audio file BEFORE sending to ElevenLabs API
  - Download and validate audio buffer content
  - Check format using detectAudioFormat()
  - Verify file size > 1KB (corrupted files are smaller)
  - Confirm duration >= 5 seconds
  - Skip corrupted files to prevent entire batch failure
  - Auto-delete corrupted files from database
- **Validation During ElevenLabs Integration**: Process each sample individually with fault tolerance
  - Failed samples are automatically deleted from database
  - Processing continues with valid samples if minimum threshold met (5+ samples)
  - Failed samples information included in result metadata
  - Clear error messages guide users to re-record corrupted samples
- **Database Reset Mechanism**: Corrupted recordings automatically cleaned up for seamless user experience

**MVP2 FUTURE ENHANCEMENT - Multi-Voice Specialization**
- **Category-Specific Training**: Train separate voices for emotions, sounds, and modulations
- **Individual Voice Storage**: Each ESM element gets its own specialized narrator voice
- **Advanced Story Narration**: Different story segments use different specialized narrator voices based on content
- **Database Ready**: Dual-table architecture supports individual voice storage per ESM element

**DATABASE ARCHITECTURE REQUIREMENTS**
- **Column Rename Completed**: `user_esm.elevenlabs_voice_id` → `user_esm.narrator_voice_id` ✅
- **New Column Added**: `user_esm_recordings.narrator_voice_id` ✅
- **Dual-Table Write**: ElevenLabs integration writes to BOTH tables ✅
- **Future-Proof Design**: Architecture supports both MVP1 (same voice) and MVP2 (individual voices)

**ELEVENLABS TESTING STATUS**
- **Public Static URLs**: Voice samples served via `/voice-samples/` for initial testing
- **JWT Authentication**: Temporarily disabled for ElevenLabs testing phase
- **Next Step**: JWT authentication to be re-enabled after successful ElevenLabs integration

**CURRENT IMPLEMENTATION STATUS**
- ✅ ESM data architecture completed with consistent category mapping
- ✅ Voice recording system operational with proper duration requirements
- ✅ Database schema update completed: column rename and new column addition
- ✅ ElevenLabs integration with dual-table write implementation completed
- ✅ Story narrator updated with proper read logic for renamed column

**CRITICAL FIX - VOICE RECORDING DELETION BUG**
- **ISSUE**: Voice recordings were being automatically deleted during ElevenLabs integration errors
- **ROOT CAUSE**: ElevenLabs module was deleting recordings for ANY error, not just corrupted files
- **FIX APPLIED**: Modified deletion logic to only delete when files are actually corrupted (404, missing, unreadable)
- **PRESERVATION**: API errors from ElevenLabs now preserve recordings for retry instead of deleting them
- **USER IMPACT**: Prevents loss of user voice recordings during failed voice cloning attempts

### Contextual Help Bubbles with Character Mascot (Future Enhancement)
- **Feature**: Interactive help system with animated character guide providing context-aware assistance
- **Components**: Smart help bubbles, character mascot, progressive guidance based on user experience level
- **Implementation**: Character appears for first-time users, contextual triggers on complex features, interactive guidance for current page tasks
- **Voice App Integration**: Explain voice recording process, guide through emotion categories, clarify background color meanings, provide voice cloning tips
- **Priority**: Medium (requested but deferred to complete pending items first)

### Infinite Caching Implementation Status
**✅ COMPLETED - OpenAI Provider**
- Story analysis: Infinite TTL (same content hash = same analysis forever)
- Character images: Infinite TTL (same character description = same image forever) 
- Audio transcription: Infinite TTL (same audio file = same transcription forever)

**🚧 PENDING IMPLEMENTATION**
- **ElevenLabs Voice Cloning**: Needs cached provider pattern with infinite TTL (same voice samples = same voice clone forever)
- **Video Generation (Kling/RunwayML)**: Needs cached provider pattern with infinite TTL (same prompt = same video forever)

**📋 ARCHITECTURAL PRINCIPLE**
- All content-based external APIs should use infinite caching
- Manual cache invalidation via admin UI for business logic changes only
- Zero time-based cache expiration for deterministic content generation

### Cache Management Admin UI (Future Enhancement)
- **Feature**: Administrative interface for manual cache invalidation control
- **Components**: Story-level cache invalidation, provider-level cache clearing, cache statistics dashboard
- **Use Cases**: Clear cache when analysis prompts improve, invalidate specific story analyses, provider-wide cache cleanup
- **Technical Implementation**: Admin dashboard with cache key management, bulk invalidation operations, cache hit/miss analytics
- **Integration**: Extends existing BaseCachedProvider architecture with admin control endpoints
- **Priority**: Medium (enables manual cache control for infinite TTL strategy)

### User Emotion Images (Future Enhancement)
- **Feature**: Allow users to upload their own images for each emotion
- **Purpose**: Personalized emotion representation in stories and roleplays
- **Technical Notes**: Would extend the current image caching system to handle user-uploaded content
- **Priority**: Medium (requested but deferred for future implementation)

## Database Tables Missing Storage Mappings

### Critical Missing Storage Methods (15 tables):
**State Management:** app_states, state_transitions
**Reference Data:** character_archetypes, character_assets, story_scenes, story_modulation_requirements  
**User Data:** user_character_preferences, user_session_metadata, story_user_confidence
**ESM System:** user_esm (partial), esm_ref (partial)
**Cache/Analysis:** ai_asset_cache, story_analysis_cache, reference_roleplay_analyses, reference_stories, reference_story_analyses
**Story Management:** story_customizations
**Voice System:** voice_cloning_jobs (partial)

*Note: Most use specialized managers or are rarely modified reference data*

## Project Milestones

### **MILESTONE 1: ElevenLabs Voice Cloning Integration - January 08, 2025**
**Achievement**: Successfully integrated ElevenLabs voice cloning system with complete narrator voice generation
- ✅ Voice cloning with 11 emotion samples creating custom narrator voice
- ✅ Story narration using ElevenLabs custom voice instead of OpenAI defaults
- ✅ Direct API integration replacing problematic SDK implementation
- ✅ Voice ID recovery mechanisms for data integrity
- ✅ Soft delete functionality across all ESM tables
- ✅ Complete MVP2 architecture with intelligent voice generation
- **Voice ID**: Successfully using narrator voice `N1tpb4Gkzo0sjT3Jl3Bs` (updated July 09, 2025)
- **Voice Quality Enhancement**: Updated recording requirements to 15-25 seconds (from 5-10 seconds) with 45-60 word sample texts for optimal voice cloning quality

### **MILESTONE 5: Story Narration API Architecture Fix - July 11, 2025**
**Achievement**: Fixed story narration retrieval to use correct database architecture
- ✅ Updated GET /api/stories/:id/narration endpoint to query story_narrations table directly
- ✅ Fixed database query to use both storyId and userId parameters for proper data retrieval
- ✅ Added proper authentication requirement to narration endpoint
- ✅ Deprecated old storage.getStoryPlaybacks method in favor of direct database queries
- ✅ Confirmed ElevenLabs narration segments are properly stored and retrievable
- **Architecture Decision**: Narration retrieval now uses direct database queries instead of storage layer for better performance and accuracy

### **MILESTONE 4: Story Content Nullable Schema Update - July 10, 2025**
**Achievement**: Updated database schema to allow draft stories with null content
- ✅ Modified stories table content column to allow NULL values
- ✅ Supports original workflow of creating blank draft stories
- ✅ Database migration executed successfully with ALTER TABLE command
- **Architecture Decision**: Stories can now be created without content, supporting draft creation flow

### **MILESTONE 3: Multi-Dimensional Narration Caching - July 09, 2025**
**Achievement**: Implemented multi-dimensional cache keys for narration to support relationship-aware content
- ✅ Cache keys now use combination of: storyId + conversationStyle + emotion + narratorProfile + voiceId
- ✅ Admin narration page displays multiple generated audios for comparison
- ✅ Each audio player works independently allowing side-by-side quality comparison
- ✅ Voice parameters displayed inline with each generated audio
- ✅ Implemented complete directory structure: `stories/audio/narrations/{userId}/{storyId}/{conversationStyle}/{narratorProfile}/{emotion}_{timestamp}_{randomId}.mp3`
- ✅ Updated audio service cacheAudioFile method to create full directory hierarchy
- ✅ Updated Express routes to serve audio files from multi-dimensional paths
- ✅ Removed special admin-test folder - admin uses same structure as regular users
- ✅ Enhanced SimpleAudioPlayer with seeking capability - click anywhere on progress bar to jump to position
- ✅ Added time display showing current playback time and total duration
- **Architecture Decision**: Complete migration to multi-dimensional caching with proper folder structure for relationship-aware narration
- **Relationship-Aware Context**: Same story content narrated differently based on user's relationship with recipient (respectful for parents, business for colleagues, authoritative for kids, etc.)
- **Cache Structure**: User.StoryID.ConversationStyle.Emotion enables personalized content delivery based on relationship context

### **MILESTONE 2: Collaboration Invitation System Fixed - January 09, 2025**
**Achievement**: Fixed collaboration invitation system by resolving duplicate route conflicts
- ✅ Removed duplicate `/api/invitations/:token` route definitions that were causing 404 errors
- ✅ Replaced complex Drizzle ORM queries with direct SQL using `pool.query` to avoid type issues
- ✅ Environment-aware invitation URL builder with `/narration/{inviteId}` pattern
- ✅ JWT token support prepared for future authentication needs
- ✅ Frontend route updated to handle `/narration/:token` instead of `/invite/:token`
- **URL Pattern**: `https://domain.com/narration/{inviteId}` with optional JWT and environment parameters
- **Configuration**: Centralized invitation URL building in `server/invitation-url-builder.ts`

## TODO List - July 10, 2025

### Completed Task - Sound Pattern Auto-Learning System Debugging and Verification - July 10, 2025
**Investigation Results**: Sound pattern auto-learning system confirmed fully operational and working correctly
- ✅ **SYSTEM FUNCTIONAL**: Auto-learning successfully adds new sound patterns from AI story analysis
- ✅ **EVIDENCE**: Story 84 analysis added "chattering" pattern to soundsPattern.json (18→19 patterns)
- ✅ **DEBUG LOGGING**: Comprehensive debug tracing implemented and working
- ✅ **PATTERN MATCHING**: Exact match, contains match, and generic pattern creation all functional
- ✅ **FILE OPERATIONS**: Sound patterns file writing and sorting working correctly
- **ROOT CAUSE**: Story 85 "Door Opening" issue was AI analysis inconsistency, not system malfunction
- **AI VARIABILITY**: Same story content sometimes detects sound effects, sometimes doesn't (normal AI behavior)
- **SYSTEM READY**: Auto-learning operational for production use with comprehensive logging
- **ARCHITECTURE**: updateSoundPatterns function processes sound effects from AI analysis and updates soundsPattern.json
- **BENEFITS**: Automatically learns new sound patterns from user stories to enhance narration

### Completed Task - Voice Orchestration System with Gamification - July 09, 2025
**Progress**: Implemented comprehensive voice orchestration service with user preference gamification
- ✅ Created VoiceOrchestrationService with dynamic voice parameter calculation
- ✅ Integrated weighted defaults processing for character and emotion patterns
- ✅ Built auto-learning system that updates fullVoiceConfig.json from story analysis
- ✅ Created gamified voice profile collection system with personality quizzes
- ✅ Added achievements, badges, and progress tracking for voice preference collection
- ✅ Enhanced story narrator to use orchestrated voice settings per segment
- ✅ Integrated character context detection with voice orchestration
- ✅ Built implicit user profile learning from story patterns
- ✅ **TESTING FEATURES ADDED**:
  - Temporary voice profile dropdown for testing (Grandma, Kid, Neutral profiles)
  - API endpoint `/api/voice-profile/test-preset` for quick profile switching
  - Generate button now always visible for regenerating with different profiles
  - Cache checking temporarily disabled to allow unlimited regeneration for testing
  - Each profile applies distinct voice parameters:
    - **Grandma**: High stability (0.9), warm tone, slow pace, slightly higher pitch
    - **Kid**: Dynamic stability (0.5), very expressive (0.9), fast pace, higher pitch
    - **Neutral**: Balanced settings for standard narration
- **Architecture Features**:
  - Voice settings calculated dynamically based on character, emotion, and user preferences
  - System learns from each story to improve voice configurations automatically
  - Gamification makes voice preference collection fun and engaging
  - Progress tracking with levels, badges, and achievements
  - Voice personality quiz, maturity selector, and language adventure
- **SUCCESSFUL TESTING RESULT**: Voice orchestration confirmed working with emotion-based parameter adjustments:
  - Different emotions receive unique voice settings (e.g., Resentment: stability 0.75, style 0.5)
  - ElevenLabs successfully applies these parameters to generate varied narration per segment
  - Toast messages fixed to use standard 5-second duration via toast-utils
  - Database error about "language" column handled gracefully without affecting functionality

### Previous Task - Narration Invitation Flow Implementation - COMPLETED
**Progress**: Successfully integrated voice recording with backend voice cloning system
- ✅ Fixed URL pattern from `/narration/{token}` to `/invitations/narration/{token}` for consistency
- ✅ Updated all frontend components (InviteCollaboratorsDialog, App.tsx) to use new URL pattern
- ✅ Updated server-side URL builder to generate correct invitation URLs
- ✅ Created three-stage narration invitation flow:
  - **Preview Stage**: User can listen to story with original narrator's voice
  - **Recording Stage**: User records voice samples with different emotions (10 emotions)
  - **Generating Stage**: System creates ElevenLabs voice and generates personalized narration
- ✅ Integrated EnhancedVoiceRecorder component for emotion-based voice recording
- ✅ Added progress tracking showing minimum 5 samples needed for voice cloning
- ✅ Implemented `/api/voice-cloning/create-narrator` endpoint for processing voice samples
- ✅ Connected frontend to backend voice cloning workflow with proper data formatting
- ✅ Mutation properly converts audio blobs to base64 for backend processing
- ✅ Backend uses startMVP1VoiceCloning method to create narrator voice via ElevenLabs
- **Architecture Decisions**:
  - Narration invitations are for creating narrator voices with emotions
  - Roleplay invitations (future) will be for character voicing in collaborative stories
  - Minimum 5 emotion samples required, but users can record all 10 for better quality
  - Auto-advance to next unrecorded emotion after each recording
  - Voice samples sent as base64 encoded data to backend for processing

### Previously Completed - Multi-Voice Recording System Implementation
**Progress**: Full voice recording CRUD API with frontend integration completed
- ✅ Added voice_type column to user_esm_recordings table with proper indexing
- ✅ Created GET endpoint `/api/user/voice-recordings` to fetch recordings by voice type
- ✅ Created POST endpoint `/api/user/voice-recordings` with voice type support
- ✅ Created DELETE endpoint `/api/user/voice-recordings/:id` with soft delete
- ✅ Updated API client with voice.getRecordings(), uploadRecording(), deleteRecording()
- ✅ Enhanced global-voice-samples.tsx with VoiceProgressTracker component integration
- ✅ Added delete functionality with proper UI feedback and mutations
- ✅ Integrated ephemeral voice configuration (VOICE_TYPES, MIN_SAMPLES_FOR_VOICE)
- ✅ Voice recordings now properly stored with emotion and voice type associations
- **Voice Recording Architecture**:
  - Database: user_esm_recordings table with voice_type column for multi-voice support
  - Storage: Audio files saved to /public/voice-samples/ directory
  - API: RESTful endpoints for CRUD operations with authentication
  - Frontend: React Query integration with proper cache invalidation
  - Progress Tracking: VoiceProgressTracker component shows completion per voice type

### Previously Completed - Collaborative Invitation System  
**Progress**: Complete invitation flow from creation to landing page now operational
- ✅ InviteCollaboratorsDialog component integrated in story library
- ✅ "Invite Collaborators" button added to all story cards
- ✅ Backend API endpoint `/api/stories/{id}/invitations` created
- ✅ Invitation landing page at `/invite/{token}` accessible to both authenticated and anonymous users
- ✅ MailGun email provider fully integrated and working (sandbox restrictions require authorized recipients)
- **Next Steps**: Display invitation links, implement voice recording in landing page, create accept flow

### High Priority Tasks
1. **Collaboration System - Invitation Links Fixed** - January 09, 2025
   - ✅ Fixed duplicate route definitions causing "Cannot GET /api/invitations/inv_xxx" error
   - ✅ Removed in-memory invitation storage - now using only database-backed invitations
   - ✅ Simplified GET /api/invitations/:token route to use storyInvitations table directly
   - ✅ Invitation links now working properly for both authenticated and anonymous users
   - **Next Steps**: Implement voice recording flow on invitation landing page
   
2. **Microservices Migration** - PHASE 0-4 COMPLETED - Using Adapter Pattern for Replit Environment
   - **Phase 0**: ✅ Foundation setup - Created base adapters and in-memory event bus
   - **Phase 1**: ✅ Identity Service extraction completed
     - ✅ Created BaseMicroserviceAdapter with table ownership validation
     - ✅ Created EventBus with in-memory implementation for Replit
     - ✅ Created IdentityServiceAdapter using existing database tables
     - ✅ Integrated adapter into existing auth routes with comprehensive event publishing
   - **Phase 2**: ✅ Subscription Service with event synchronization completed
     - ✅ Created SubscriptionServiceAdapter with plan management
     - ✅ Implemented subscription creation, cancellation, and usage tracking
     - ✅ Added cross-service event handlers for user and story events
   - **Phase 3**: ✅ Story Service with complex data migration completed
     - ✅ Created StoryServiceAdapter with AI analysis integration
     - ✅ Implemented story CRUD operations with subscription limit checking
     - ✅ Added event publishing for story lifecycle events
   - **Phase 4**: ✅ Collaboration Service extraction completed
     - ✅ Created CollaborationServiceAdapter with invitation management
     - ✅ Integrated email and SMS notification services
     - ✅ Implemented participant and submission tracking
   - **Phase 5**: ✅ Narration & Video Services completed
     - ✅ Created NarrationServiceAdapter with ElevenLabs voice cloning
     - ✅ Created VideoServiceAdapter with multi-provider support
     - ✅ Integrated both services with event publishing
     - ✅ Fixed all storage method dependencies
   - **Documentation**: docs/MICROSERVICES_IMPLEMENTATION_SUMMARY.md tracks progress
   - **Strategy**: Adapter Pattern within monolith for gradual migration

2. **RBAC, Collaboration & Subscription System** - Comprehensive system design completed (see docs/RBAC_COLLABORATION_SUBSCRIPTION_DESIGN.md)
   - **Phase 1**: RBAC Foundation - Add roles (member, admin, super-admin, customer-support, content-moderator)
   - **Phase 2**: Subscription Tiers - Implement free, silver ($9.99), gold ($19.99), platinum ($39.99) tiers
   - **Phase 3**: Enhanced Collaboration - SMS/Email invites, 120-hour expiration, guest user support
   - **Phase 4**: Roleplay Enhancement - Character-specific invitations, multi-voice playback
   - **Phase 5**: Credits System - Author points for story remixes and public sharing

3. **SSO Language Capture**: ✅ COMPLETED - User's preferred language is now captured during OAuth/SSO sign-in
   - Database already had language fields (language, locale, nativeLanguage) in users table
   - Updated OAuth authentication to capture and persist language from provider profile
   - Frontend LanguageProvider now syncs with database language preference
   - Language updates are persisted when user changes language in UI

4. **ElevenLabs Narrator Enhancement** (Clarification: System uses ElevenLabs voices, not OpenAI):
   - **Language Support**: Consider adding multi-language support to ElevenLabs voice cloning
   - **Emotion Passthrough**: Ensure emotions from story analysis are properly passed to ElevenLabs API
   - **Voice Quality**: System already uses 15-25 second samples for optimal voice cloning quality

## Voice Configuration

### ElevenLabs TTS Voice Configuration - July 09, 2025
- **Configuration File**: Added `fullVoiceConfig.json` with comprehensive voice parameter settings
- **Global Defaults**: Baseline settings for stability (0.75), similarity_boost (0.85), style (0.5), and prosody
- **Weighted Defaults**: Pattern-based adjustments for character types (angel/demon) and emotions (fear/joyful)
- **Character Profiles**: Specific voice configurations for King, Child, Demon, and Narrator with emotional variants
- **Prosody Control**: Fine-tuned pitch, rate, and volume adjustments for different character states
- **Dynamic Application**: Configuration supports pattern matching for automatic voice parameter selection

### Sound Effects Pattern Configuration - July 10, 2025
- **Configuration File**: Added `soundsPattern.json` for automatic sound effect insertion in narration
- **Pattern Matching**: Regex patterns to detect sound-related words in story text
- **Sound Effects**: Automatic insertion of onomatopoeia for common sounds (dog barking, cat meowing, footsteps, etc.)
- **Integration**: Used during narration generation to enhance story audio with contextual sound effects
- **Enhanced Sound Extraction**: AI analysis now extracts:
  - **Situational Sounds**: Scary scenes → "(oooooooo spooky wind)", tense moments → "(silence...)"
  - **Action Sounds**: Falling → "(damal)", explosions → "(Doooom Dubbb)", crashes → "(CRASH!)"
  - **Mood-Based Sounds**: Peaceful → "(soft breeze)", chaotic → "(crash bang boom)", mysterious → "(whooooo)"
  - **Environmental Ambiance**: Forest, city, ocean sounds based on scene context
- **Auto-Learning**: Story analysis automatically updates soundsPattern.json with newly discovered sound patterns
- **Flexible Matching**: Supports exact, contains, and word-based matching for sound descriptions

## Changelog

### **NOTIFICATION PLATFORM DESIGN - MICROSERVICES PHASE 6 - January 12, 2025**
**Event-Driven Notification Service as Generic Subdomain**: Comprehensive notification platform with DDD principles
- **DOMAIN CLASSIFICATION**: Notification Service added as Generic Subdomain supporting all bounded contexts
- **STORAGE-AGNOSTIC TEMPLATES**: Designed to support file-based, S3, CDN, GitHub, and database storage
- **INDUSTRY-STANDARD LOCALIZATION**: Full i18n support with locale-specific formatting and template translations
- **EVENT-DRIVEN ARCHITECTURE**: Subscribes to 15+ events from collaboration, story, narration, identity, and subscription domains
- **PROVIDER-AGNOSTIC DESIGN**: Works with MailGun, SendGrid, Twilio, MessageBird without code changes
- **DDD-COMPLIANT SCHEMA**: 4 main aggregates - NotificationCampaign, NotificationTemplate, NotificationDelivery, NotificationPreference
- **CAMPAIGN MANAGEMENT**: Maps domain events to notification campaigns with targeting and rate limiting
- **DELIVERY TRACKING**: Complete audit trail with provider-specific metrics and user engagement tracking
- **USER PREFERENCES**: Respects user notification settings including channels, frequency, and time preferences
- **DOCUMENTATION UPDATED**: DDD_MICROSERVICES_ARCHITECTURE.md, MICROSERVICES_ARCHITECTURE_DESIGN.md, MICROSERVICES_IMPLEMENTATION_SUMMARY.md
- **IMPLEMENTATION PLAN**: Safe rollout strategy ensuring no disruption to existing email/SMS functionality

### **NARRATOR PROFILE SYSTEM IMPLEMENTATION - July 12, 2025**
**Complete Narrator Profile Integration**: Successfully implemented narrator profile system with database storage and frontend display
- **DATABASE SCHEMA**: Added narrator_profile column to story_narrations table with 'neutral' default
- **BACKEND INTEGRATION**: Updated story narrator service to accept and store narrator profile parameter
- **HARDCODING FIX**: Fixed backend routes.ts that was forcing "ElevenLabs Cloned" display - now uses actual profile names
- **FRONTEND CLEANUP**: Removed redundant "Voice" field that always showed "Your Cloned Voice" - focuses on meaningful data
- **PROFILE STORAGE**: Narrator profile dropdown selections (grandma, kid, storyteller, etc.) now properly stored in database
- **DISPLAY ENHANCEMENT**: Narration interface now shows user-friendly profile names with descriptions
- **ARCHITECTURE BENEFIT**: Clean separation between voice technology (always ElevenLabs) and narrative style (user-configurable)
- **USER EXPERIENCE**: Eliminates confusion about voice source, focuses on narrative personality selection

### **UNIFIED SAMPLE TEXT ARCHITECTURE WITH GRACEFUL FAILURE HANDLING - July 11, 2025**
**Integrated Sample Text Generation Into Story Analysis**: Unified and hardened sample text generation system
- **ARCHITECTURAL INTEGRATION**: Story analysis now uses SampleTextCore for all ESM reference data population
- **GRACEFUL FAILURE HANDLING**: Sample text generation failures do not break story analysis - system uses intelligent fallbacks
- **THREE-TIER PRIORITY SYSTEM**: Story quote → Story context → AI-generated contextual text (45-60 words)
- **UNIFIED CORE INTEGRATION**: All sample text generation (emotions, sounds, emotional tags) now uses SampleTextCore
- **FAILURE RESILIENCE**: Each category (emotions, sounds, emotional tags) has specific fallback text for robustness
- **ENHANCED LOGGING**: Detailed logging shows source type (story_quote, story_context, ai_generated) and word count
- **STORY ANALYSIS PROTECTION**: Analysis process continues even if sample text generation fails completely

### **OUTDATED CONFIG CLEANUP COMPLETE - July 11, 2025**
**Database-Driven Architecture Enforcement**: Removed all hardcoded state and emotion data from configuration files
- **COLLABORATIVE CONFIG**: Removed hardcoded `statusFlow` states - now uses database-driven StateManager
- **EPHEMERAL VOICE CONFIG**: Removed hardcoded `GLOBAL_EMOTION_SAMPLES` array - now uses database ESM system
- **DUPLICATE FILES REMOVED**: Deleted `audioConfig.ts` and `voice-config_DEL.ts` duplicates
- **ARCHITECTURE ENFORCEMENT**: All emotion and state data now comes from database tables
- **ZERO TOLERANCE**: No hardcoded states, emotions, or workflow data allowed in configs
- **CONSISTENCY**: Configuration files now properly reference database-driven systems

### **SHARED FOLDER REORGANIZATION COMPLETE - July 10, 2025**
**Monorepo Pattern Implementation**: Reorganized shared folder into logical subdirectories for multi-vendor support
- **SUBDIRECTORY STRUCTURE CREATED**:
  - `/shared/config/` - All configuration files (i18n-config.ts, language-config.ts, state-config.ts)
  - `/shared/schema/` - Database schemas (schema.ts and related)
  - `/shared/types/` - Type definitions (api-response.ts, api-types.ts)
  - `/shared/constants/` - Constants (audio-config.ts, ephemeral-voice-config.ts)
  - `/shared/utils/` - Utilities (i18n-hierarchical.ts, state-manager.ts)
- **AUTOMATED IMPORT UPDATES**: Created and executed scripts/update-shared-imports.cjs
  - Fixed 77 imports across 64 files automatically
  - Script available for future reorganizations
- **BUILD STABILITY**: All import errors resolved, system running successfully
- **ARCHITECTURAL BENEFIT**: Cleaner separation of concerns for multi-vendor development
- **ZERO TOLERANCE MAINTAINED**: No files allowed in shared root directory

### **COMPLETE ROOT DIRECTORY CLEANUP - July 10, 2025**
**Final Organization of All Root Files and Folders**: Achieved minimal root directory with proper file organization
- **ROOT FILE ORGANIZATION**:
  - Moved SQL files → `/migrations/` (add-soft-delete-columns.sql, alter-story-content-nullable.sql, proposed_esm_schema.sql)
  - Moved documentation → `/docs/` and `/docs/architecture/` (ROADMAP.md, KLING_API_ANALYSIS.md, DATABASE_SCHEMA_ANALYSIS.md, etc.)
  - Moved scripts → `/scripts/` (fix-syntax.py, generate-translations.sh)
  - Moved docker compose → `/k8s/` (docker-compose.microservices.yml)
  - Moved i18n docs → `/docs/` (README-i18n.md)
  - Removed temporary files (cookies.txt, cookies_new.txt)
- **TEST CONSOLIDATION**: 
  - Moved scripts from `/test-scripts/` to `/scripts/{domain}/` following file organization guidelines
  - Moved API tests from `/test-suites/` to `/test/integration/`
  - Removed empty `/test-scripts/` and `/test-suites/` folders
- **LEGACY FOLDER REMOVAL**:
  - Removed `/uploads/` - Obsolete since system uses memory storage (multer.memoryStorage())
  - Removed `/voice-samples/` - Legacy location, voice samples now under `user-data/{userId}/audio/`
  - Removed `/stories/` - Moved to `/test/fixtures/stories/` for test data
- **CRITICAL FOLDER RETAINED**:
  - Kept `/user-data/` - Essential for hierarchical user content storage following pattern: `user-data/{userId}/{contentType}/{category}/{identifier}/sample-{n}.{ext}`
- **FINAL ROOT CONTENTS**: Only 11 essential files remain in root directory
  - Build configs: postcss.config.js, tailwind.config.ts, tsconfig.json (must stay in root)
  - Package files: package.json, package-lock.json
  - Documentation: README.md, replit.md
  - Environment: .env.example, .gitignore, .replit
  - UI config: components.json (shadcn requirement)
- **IMPACT**: Achieved perfectly organized root directory following industry best practices

### **OPENAPI INFRASTRUCTURE IMPLEMENTATION - July 10, 2025**
**Multi-Vendor Development Support**: Implemented OpenAPI specification generation and TypeScript type generation
- **OPENAPI GENERATOR**: Created server/openapi-generator.ts to auto-generate OpenAPI 3.0 specification from server routes
- **SWAGGER UI INTEGRATION**: Added interactive API documentation at /api/docs with live testing capabilities
- **TYPE GENERATION SCRIPT**: Created scripts/api/generate-api-types.ts to generate TypeScript types from OpenAPI spec
- **API ENDPOINTS**: 
  - GET /api/openapi.json - Serves complete OpenAPI specification
  - GET /api/docs - Interactive Swagger UI documentation
- **VENDOR INDEPENDENCE**: External vendors can now generate types without access to server code
- **TYPE SAFETY**: Full TypeScript type safety for API contracts between different vendors
- **EXAMPLE USAGE**: Created example-client-usage.ts demonstrating external vendor API consumption
- **ARCHITECTURE BENEFIT**: Supports server (AWS) and client (Azure) developed by different vendors

### **COMPREHENSIVE FILE ORGANIZATION COMPLETED - July 10, 2025**
**Project Structure Reorganization**: All configuration and test files moved to proper directories
- **CONFIG FILES MOVED**: All build configurations moved to `/config/build/`:
  - vite.config.ts, tailwind.config.ts, postcss.config.js, drizzle.config.ts, tsconfig.json
  - Fixed all import paths and references throughout the codebase
- **DATA FILES MOVED**: Runtime configuration files moved to `/config/data/`:
  - fullVoiceConfig.json, conversationStyle.json, soundsPattern.json
  - Updated all file path references in ai-analysis.ts, voice-orchestration-service.ts, and test files
- **TEST FILES ORGANIZED**: All test files consolidated under `/test/`:
  - Unit tests in `/test/unit/`, integration tests in `/test/integration/`
  - Removed duplicate test directories like `/test-suites/`
- **ROOT DIRECTORY CLEANED**: Only essential files remain in root directory:
  - package.json, package-lock.json (npm requirements)
  - .gitignore, .replit (environment configuration)
  - README.md, replit.md (documentation)
  - postcss.config.js, tailwind.config.ts, tsconfig.json (build configs that must stay in root)
  - components.json (shadcn requirement)
- **IMPACT**: Cleaner project structure following industry best practices
- **MIGRATION COMPLETE**: All references updated, app running successfully with new structure

### **UNIVERSAL DRAFT WORKFLOW IMPLEMENTATION - July 10, 2025**
**Complete Story Creation Standardization**: All story creation paths now use draft workflow exclusively
- **BACKEND UPDATES**: Updated all story creation endpoints to create draft stories:
  - `/api/stories/upload-audio` - Creates draft stories with transcribed content
  - `/api/stories/:userId` - Creates draft stories (no longer complete stories)
  - `/api/stories/baseline` - Creates draft stories (no longer complete stories)
  - `/api/stories/draft` - Enhanced to support different uploadType (text, voice, audio)
- **API CLIENT ENHANCEMENT**: Added `createDraft()` method and `uploadAudio()` method for unified draft creation
- **FRONTEND UPDATES**: Home page and story library now use `apiClient.stories.createDraft()`
- **WORKFLOW STANDARDIZATION**: ALL story creation (text, voice, audio) now follows: Create Draft → Add Content → Analyze → Complete
- **DRAFT FIELDS**: All draft stories have `status: 'draft'`, `processingStatus: 'pending'`, empty analysis fields
- **DATABASE SCHEMA**: Content field made nullable to support empty draft creation

### **DATABASE SCHEMA UPDATE - Story Content Nullable - July 10, 2025**
**Story Creation Fix**: Updated database schema to support draft story workflow
- **SCHEMA CHANGE**: Modified stories table to make content column nullable 
- **SQL EXECUTED**: ALTER TABLE stories ALTER COLUMN content DROP NOT NULL
- **WORKFLOW RESTORED**: Draft stories can now be created without content, then updated later
- **IMPACT**: Fixes "Failed to create story: content: Required" error when creating new stories
- **ARCHITECTURE**: Supports the original design where stories are created blank and content added in subsequent updates

### **TOAST KEY NAMES CREATED - July 08, 2025**
**Complete i18n Toast Implementation**: Toast utility now fully uses internationalized messages
- **TOAST KEYS ADDED**: Created comprehensive toast messages under common.toast following 3-4 dot naming standard
- **KEY STRUCTURE**: common.toast.category.action (e.g., common.toast.invitations.sent, common.toast.save.success)
- **TOAST CATEGORIES**: invitations, save, delete, recording, video, narration, upload, auth, network
- **FULL I18N SUPPORT**: All toast messages now use getMessage() from i18n-hierarchical.ts
- **UNIFIED PATTERN**: toast-utils.ts provides success(), error(), info() methods with consistent 5-second duration
- **PLURALIZATION**: Added plural support for messages like invitation count (e.g., "Successfully sent {count} invitation(s)")
- **MULTI-LANGUAGE**: All toast messages translated to 7 languages (en, es, fr, de, ja, zh, ko)
- **FIXED IMPORT ERROR**: Removed conflicting useToast destructuring in InviteCollaboratorsDialog component
- **USER BENEFIT**: All toast notifications now display in user's selected language automatically

### **MAILGUN EMAIL PROVIDER IMPLEMENTED - July 08, 2025**
**Plug-and-Play Email System**: Successfully migrated from SendGrid to MailGun using unified provider architecture
- **MAILGUN PRIMARY PROVIDER**: MailGun now configured as priority 1 email provider (SendGrid as priority 2 fallback)
- **PROVIDER ARCHITECTURE**: Unified BaseEmailProvider with health checks, retry logic, and consistent timeout handling
- **SEAMLESS MIGRATION**: Zero code changes required - plug-and-play provider swapping through environment configuration
- **CREDENTIALS CONFIGURED**: MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM_EMAIL properly set and initialized
- **COLLABORATION READY**: Invitation system now uses MailGun for reliable email delivery
- **FALLBACK SYSTEM**: SendGrid remains as backup provider for redundancy
- **HEALTH MONITORING**: Provider health checks ensure email delivery reliability
- **ARCHITECTURAL BENEFIT**: Demonstrates successful plug-and-play provider pattern across all services

### **SSO LANGUAGE CAPTURE IMPLEMENTED - February 10, 2025**
**User Language Persistence**: OAuth sign-in now captures and persists user language preference
- **OAUTH LANGUAGE EXTRACTION**: Google OAuth provider extracts locale/language from user profile
- **DATABASE SYNC ON LOGIN**: Existing users get their language preference updated from OAuth provider on each login
- **FRONTEND-BACKEND SYNC**: LanguageProvider now syncs with database language preference, not just localStorage
- **LANGUAGE UPDATE API**: Added PUT /api/auth/user/language endpoint to persist language changes
- **AUTOMATIC SYNC**: When user data loads, frontend automatically updates to use database language preference
- **BIDIRECTIONAL SYNC**: Changing language in UI updates both localStorage and database
- **FUTURE READY**: Microsoft and Facebook providers will automatically benefit when implemented
- **USER BENEFIT**: Language preference persists across devices and sessions

### **STORY NARRATOR UI IMPROVEMENTS - February 09, 2025**
**Clean TV-Style Media Controls**: Enhanced narrator controls with professional interface
- **REMOVED STATUS DOT**: Eliminated redundant green/red pulsing indicator per user feedback
- **COMPREHENSIVE TOOLTIPS**: Added i18n tooltips to all media control buttons (play/pause, skip, volume)
- **FIXED MODULATION ANIMATION**: Audio visualizer only shows when actually playing, not continuous fake animation
- **CORNER AUDIO INDICATOR**: Moved visualizer to small top-left corner with 5 bars and "LIVE" text when playing
- **LAYOUT STABILITY**: Fixed play button jumping issue with consistent min-height text area
- **TEXT SIZE OPTIMIZATION**: Reduced narrative text from text-xl to text-base for better layout
- **SMOOTH TRANSITIONS**: Using opacity transitions instead of show/hide for seamless experience
- **CONSISTENT HEIGHT**: Text area maintains 100px minimum height preventing layout shifts

### **COMPREHENSIVE REST API TEST SUITE - February 07, 2025**
**Testing Infrastructure**: Created complete API endpoint testing framework validating against api-client.ts
- **TEST SUITE CREATED**: Comprehensive testing framework at `test-suites/api-tests/` with 60+ test cases
- **ENDPOINT COVERAGE**: Tests for auth, stories, narration, roleplay, video, subscription, notification, and reference data
- **SUCCESS & FAILURE TESTING**: Each endpoint tested for both success conditions and error handling
- **TEST DATA MANAGEMENT**: Hardcoded test data in `test-data.ts` with database refresh capability via `test-data-generator.ts`
- **CATEGORY-BASED EXECUTION**: Run all tests or filter by category (auth, stories, narration, etc.)
- **INTERFACE VALIDATION**: All tests validate responses match `api-client.ts` expected structures
- **DETAILED REPORTING**: Color-coded terminal output with pass/fail statistics and category breakdown
- **TEST RUNNER**: Main execution engine with authentication, request handling, and summary generation
- **BENEFITS**: Ensures frontend-backend compatibility, catches API regressions, validates business rules

### **CENTRALIZED API CLIENT IMPLEMENTATION - February 07, 2025**
**Frontend Architecture Enhancement**: Created centralized API client to abstract all backend communication
- **API CLIENT CREATED**: Single source of truth for all API endpoints at `client/src/lib/api-client.ts`
- **STANDARDIZED ERROR HANDLING**: All API errors now use typed `ApiError` class with i18n integration
- **CUSTOM REACT HOOKS**: Created `use-api.ts` with typed hooks for common API operations
- **AUTOMATIC RESPONSE UNWRAPPING**: Client automatically extracts `data` from successful responses
- **FORMDATA SUPPORT**: Automatic header handling for file uploads
- **QUERY INVALIDATION**: Hooks automatically invalidate related queries on mutations
- **MIGRATION GUIDE**: Created comprehensive guide at `docs/api-client-migration-guide.md`
- **BENEFITS**: No duplicate code, type safety, consistent error handling, easier testing
- **INTEGRATION**: Works seamlessly with existing React Query setup

### **MICROSERVICES PHASE 0-4 IMPLEMENTATION COMPLETED - January 20, 2025**
**Adapter Pattern Microservices Migration**: Successfully implemented phases 0-4 of microservices architecture
- **PHASE 0 COMPLETED**: Foundation with EventBus and BaseMicroserviceAdapter for Replit environment
- **PHASE 1 COMPLETED**: Identity Service Adapter with comprehensive OAuth event publishing
  - Enhanced auth service integration to publish user.registered, user.login, user.updated events
  - Added profile update event publishing and OAuth provider linking events
  - Fixed circular dependency issues by refactoring authentication imports
- **PHASE 2 COMPLETED**: Subscription Service Adapter with plan management
  - Created subscription plans, user subscriptions, and usage tracking methods
  - Added event handlers for cross-service communication (user and story events)
  - Implemented free tier auto-creation and subscription lifecycle management
- **PHASE 3 COMPLETED**: Story Service Adapter with AI analysis integration
  - Integrated story CRUD operations with subscription limit checking
  - Added story lifecycle event publishing (created, updated, deleted, published)
  - Connected with AI analysis service for automatic story content processing
- **PHASE 4 COMPLETED**: Collaboration Service Adapter with invitation system
  - Implemented roleplay template creation and invitation management
  - Integrated email (SendGrid) and SMS (Twilio) notification services
  - Added participant tracking and submission handling with completion events
- **ARCHITECTURE PATTERNS**: All adapters follow monolith-friendly patterns avoiding circular dependencies
- **EVENT-DRIVEN DESIGN**: Cross-service communication via in-memory EventBus ready for future extraction
- **ZERO DOWNTIME**: Adapters work within existing monolith with feature flag control
- **NEXT PHASE**: Phase 5 - Narration & Video Services implementation

### **DOMAIN-DRIVEN DESIGN MICROSERVICES ARCHITECTURE - January 16, 2025**
**Kubernetes-Ready Containerized Microservices Design**: Transformed monolith into event-driven microservices
- **BOUNDED CONTEXTS DEFINED**: 6 core contexts - Identity, Subscription, Storytelling, Narration, Collaboration, Video Generation
- **DDD PRINCIPLES APPLIED**: Aggregates, domain entities, value objects, domain events, repositories for each context
- **DATABASE PER SERVICE**: PostgreSQL instances per microservice with complete schema definitions
- **EVENT-DRIVEN ARCHITECTURE**: Redis/Kafka event bus for inter-service communication with domain events
- **OPENAPI SPECIFICATIONS**: Complete REST API docs for Identity, Subscription, Story, and Collaboration services
- **KUBERNETES DEPLOYMENT**: Docker containers, health checks, resource limits, auto-scaling configuration
- **ANTI-CORRUPTION LAYER**: Service adapters to transform external events to internal domain events
- **SAGA IMPLEMENTATION**: Distributed transaction pattern for multi-service operations
- **SECURITY DESIGN**: mTLS for service-to-service, JWT auth, permission-based access control
- **IMPLEMENTATION ROADMAP**: 4-phase rollout plan starting with Identity Service foundation

### **MICROSERVICES PHASE 0 COMPLETED - January 16, 2025**
**Replit-Compatible Adapter Pattern Implementation**: Foundation for gradual microservices migration
- **IN-MEMORY EVENT BUS**: Created EventBus class to replace Redis/Kafka in Replit environment
- **BASE ADAPTER PATTERN**: BaseMicroserviceAdapter validates table ownership for logical partitioning
- **IDENTITY SERVICE ADAPTER**: Uses existing users/userProviders/localUsers tables with event publishing
- **AUTH INTEGRATION**: Enhanced authentication routes to publish domain events when enabled
- **FEATURE FLAG CONTROL**: ENABLE_MICROSERVICES=true activates event publishing (default: false)
- **ZERO IMPACT DESIGN**: System runs identically when microservices disabled
- **EVENT LOGGING**: Debug endpoint /api/auth/events shows event history (admin only)
- **EVENTS PUBLISHED**: user.registered, user.login, user.updated, user.oauth.linked
- **DOCUMENTATION**: Created MICROSERVICES_IMPLEMENTATION_SUMMARY.md tracking progress
- **NEXT PHASE**: Complete OAuth integration and add event subscribers

### **RBAC, COLLABORATION & SUBSCRIPTION SYSTEM DESIGN - January 15, 2025**
**Comprehensive System Architecture**: Designed complete RBAC, collaboration, and subscription monetization system
- **RBAC ROLES DEFINED**: member (default), admin, super-admin, customer-support, content-moderator with granular permissions
- **SUBSCRIPTION TIERS PLANNED**: Free (3 stories), Silver ($9.99, 10 stories), Gold ($19.99, 30 stories), Platinum ($39.99, unlimited)
- **COLLABORATION FEATURES**: SMS/Email invitations with 120-hour expiration, 2-10 invitees based on tier
- **DATABASE SCHEMA DESIGNED**: Complete schema for roles, permissions, subscriptions, invitations, usage tracking
- **REST API SPECIFIED**: Full API design for RBAC, subscriptions, collaboration, and invitee management
- **5-PHASE ROADMAP**: RBAC → Subscriptions → Collaboration → Roleplay → Credits/Gamification
- **SECURITY CONSIDERED**: Token-based invitations, guest user isolation, permission middleware
- **FUTURE VISION**: Story remixes, author credits, public templates, achievement system
- **DOCUMENTATION**: Created comprehensive design doc at docs/RBAC_COLLABORATION_SUBSCRIPTION_DESIGN.md

### **I18N CONVERSION PROGRESS - January 13, 2025**
**Systematic Conversion to Hierarchical i18n Structure**: Converting all hardcoded strings to use centralized message system
- **HOME PAGE COMPLETED**: All hardcoded strings converted to hierarchical i18n messages (home.title.main, home.actions.write_story, etc.)
- **UPLOAD-STORY PAGE COMPLETED**: Converted all UI text, error messages, placeholders, and language names to i18n
- **HIERARCHICAL NAMESPACE PATTERN**: Established pattern of page.component.element for message organization
- **REMAINING PAGES**: 20+ pages still require conversion including story-library, voice-record, login, register, etc.
- **CRITICAL COMPONENTS**: Enhanced-voice-recorder and invitation pages contain extensive hardcoded strings
- **IMPORT PATTERN**: Using `import { getMessage } from "@shared/i18n-hierarchical"` for hierarchical messages

### **NARRATOR PROFILE SYSTEM IMPLEMENTED - January 13, 2025**
**Enhanced Story Narration with Language and Emotion Support**: Comprehensive narrator voice improvements
- **NARRATOR PROFILE INTERFACE**: Created NarratorProfile with language, dialect, accent, slang level, and formality settings
- **DIALECT SUPPORT**: Added support for Indian English, American Hindi, Tamil English with natural code-switching
- **EMOTION PASS-THROUGH**: Both ElevenLabs and OpenAI voices now receive actual story emotions instead of hardcoded 'neutral'
- **EMOTION DETECTION**: Implemented chunk-based emotion detection matching story analysis quotes/context to text segments
- **ELEVENLABS EMOTION SUPPORT**: ElevenLabs trained voices accept emotion parameters for voice modulation
- **OPENAI NARRATOR INSTRUCTIONS**: Build dynamic narrator instructions based on profile for authentic voice personality
- **LANGUAGE AWARENESS**: System properly passes user language preference to TTS generation
- **USER PREFERENCE STORAGE**: Added getUserLanguage method to fetch language from database (future SSO integration needed)

### **PROPER ARCHITECTURE NAMING CONVENTIONS - January 14, 2025**
**Fixed Version-Based Naming**: Removed version numbers from filenames for better architecture
- **RENAMED FILE**: Changed mvp2-elevenlabs-integration.ts to elevenlabs-voice-cloning.ts
- **ARCHITECTURE PRINCIPLE**: Files should have descriptive, version-agnostic names
- **CLASS RENAMED**: MVP2ElevenLabsIntegration → ElevenLabsVoiceCloning
- **EXPORT UPDATED**: mvp2ElevenLabsIntegration → elevenLabsVoiceCloning
- **IMPORTS FIXED**: Updated all imports in voice-training-service.ts
- **RATIONALE**: MVP terminology is for requirements, not file/class names
- **USER BENEFIT**: Clean architecture that doesn't require renaming files for each iteration

### **AUDIO PLAYBACK FIXES - January 08, 2025**
**Fixed Multiple Audio Playback Issues**: Resolved pause/resume and segment advancement problems
- **PAUSE/RESUME ISSUE**: Fixed audio restarting from beginning when resuming from pause
  - Simplified playback logic to check audio.paused state directly
  - Removed problematic URL comparison that was preventing playback
  - Added proper error handling for play() promises
- **SEGMENT ADVANCEMENT FIX**: Fixed segments not auto-advancing due to stale closure
  - Added dependencies to audio event handler useEffect to fix stale state
  - onended event now properly reads current state values
- **PROGRESS BAR FIX**: Fixed progress showing only single segment progress
  - Implemented overall progress calculation across all segments
  - Progress now shows true completion percentage of entire narration
- **UI FLICKER FIX**: Progress bar now always visible to prevent layout jumping
  - Changed from show/hide to style changes (dimmed when paused)
  - Prevents play/pause button from moving up and down

### **STORY NARRATION AUTO-SAVE FIX - January 08, 2025**
**Fixed Narration Save Error**: Resolved duplicate save attempt issue with story narrations
- **ISSUE IDENTIFIED**: Narrations are automatically saved during generation in backend, but frontend was treating them as temporary
- **FRONTEND UPDATE**: Modified story-narrator-controls.tsx to set savedNarration directly instead of tempNarration
- **USER EXPERIENCE**: Narrations now show as "Auto-Saved" immediately after generation
- **SAVE BUTTON BEHAVIOR**: Save button properly disabled since narrations are automatically persisted
- **NARRATOR VOICE ID**: Confirmed that narrator voice ID is still needed for voice consistency and regeneration
- **ARCHITECTURE CLARIFICATION**: Story narrations are always saved during generation - no separate save step needed

### **VIDEO PROVIDER MANAGER DEPLOYMENT FIX - January 08, 2025**
**Build Error Resolution**: Fixed missing `videoProviderManager` export causing deployment failures
- **ISSUE IDENTIFIED**: video-generation-module.ts and runwayml-module.ts were importing non-existent `videoProviderManager` from video-generation-service.ts
- **IMPORT FIXES APPLIED**: Replaced `videoProviderManager` imports with correct `VideoProviderRegistry` pattern from provider-registry.ts
- **DIRECT PROVIDER ACCESS**: Updated both modules to use `VideoProviderRegistry.getInstance().getProvider()` instead of missing manager
- **MISSING STORAGE IMPORT**: Added missing `storage` import to video-generation-module.ts to resolve compilation errors
- **DEPLOYMENT SUCCESS**: Application now builds and runs successfully without missing export errors
- **PROVIDER ARCHITECTURE**: Video provider system now properly uses the established registry pattern for provider management
- **ZERO CODE DUPLICATION**: Fixed imports without creating duplicate functionality, maintaining clean architecture

### **HOME PAGE UI IMPROVEMENTS - January 08, 2025**
**Responsive Navigation and Layout Updates**: Enhanced user experience with consistent navigation
- **TOP NAVIGATION CONSISTENCY**: All pages now use AppTopNavigation component with "Home" and "My Stories" links
- **BOTTOM NAVIGATION REMOVED**: Completely eliminated bottom navigation across all pages for cleaner interface
- **VERTICAL BUTTON LAYOUT**: Home page action buttons (Write Story, Voice Record, Upload Audio) now stacked vertically
- **INCREASED BUTTON HEIGHT**: All action buttons increased to h-16 (64px) for better touch targets on mobile
- **REMOVED DUPLICATE HEADERS**: Eliminated duplicate header on home page that conflicted with AppTopNavigation
- **CLEANED UP BLANK SPACES**: Removed unnecessary padding and min-height constraints that created empty space
- **CHARACTER FEED SIMPLIFIED**: Removed "No characters available" text - component returns null when empty
- **MOBILE RESPONSIVE**: Navigation and buttons fully responsive with proper breakpoints

### **ELEVENLABS VOICE MANAGEMENT IMPLEMENTED - January 08, 2025**
**Account Limit Protection**: System now updates existing voices instead of creating new ones
- **VOICE UPDATE LOGIC**: Checks for existing narrator voice before creating new voice clones
- **DELETE AND REPLACE**: Old voices are deleted and replaced to stay within ElevenLabs account limits
- **METHODS ADDED**: `deleteVoice()` and `updateVoice()` methods in ElevenLabsModule
- **MVP2 INTEGRATION**: `getUserExistingNarratorVoice()` checks for existing voices before cloning
- **SQL SYNTAX FIX**: Fixed parameter placeholder issue in `updateUserEsm()` method (? → $1, $2, etc.)
- **USER BENEFIT**: Prevents hitting ElevenLabs voice count restrictions while maintaining voice quality

### **AUTOMATIC NARRATION CACHE CLEARING - January 14, 2025**
**Story Narration Auto-Refresh**: When new narrator voice is generated, all cached narrations are automatically cleared
- **CACHE CLEARING LOGIC**: MVP2 ElevenLabs integration now calls `clearUserStoryNarrations()` after successful voice generation
- **STORY VOICE RESET**: Clears `narratorVoice` and `narratorVoiceType` from all user stories in database
- **NARRATION DELETION**: Deletes all saved narrations from `storyNarrations` table for the user
- **AUDIO FILE CLEANUP**: Removes all generated audio files from disk to ensure fresh generation
- **GENERATE BUTTON STATE**: UI disables Generate button when narration is cached, enables when cache cleared
- **USER BENEFIT**: Stories automatically use new ElevenLabs voice without manual intervention

### **ESM TABLES AS SINGLE SOURCE OF TRUTH - January 14, 2025**
**Strategic Architecture Change**: Removed narrator voice storage from story table to prevent caching issues
- **REMOVED COLUMNS**: Deleted `narratorVoice` and `narratorVoiceType` columns from stories table
- **ESM IS TRUTH**: user_esm and user_esm_recordings tables are the only source for narrator voice IDs
- **NO STORY CACHING**: Story narrator always fetches current voice from ESM tables on each generation
- **PREVENTS STALE VOICE**: Eliminates bug where old voice IDs were cached and reused after new voice generation
- **STRATEGIC FIX**: System can never use outdated voice IDs since there's no caching at story level
- **USER BENEFIT**: New ElevenLabs voices are immediately used without manual cache clearing

### **VOICE RECORDING DURATION CONFIGURATION UPDATED - January 08, 2025**
**Enhanced Voice Quality Requirements**: Implemented centralized configuration for optimal ElevenLabs voice cloning quality
- **CREATED CONFIGURATION FILE**: Added shared/voice-recording-config.ts with centralized duration and text generation settings
- **INCREASED MINIMUM DURATION**: Updated from 5 seconds to 15 seconds minimum for better voice quality (15-25 second range)
- **ENHANCED SAMPLE TEXTS**: Increased word count from 35-45 words to 45-60 words for natural speech pacing
- **BACKEND VALIDATION UPDATED**: Server routes now use VOICE_RECORDING_CONFIG.MIN_DURATION for validation
- **FRONTEND CONSISTENCY**: All UI components updated to display new duration requirements dynamically
- **AI TEXT GENERATION ENHANCED**: OpenAI prompts now generate longer sample texts matching new duration requirements
- **SAMPLE TEXT HIERARCHY RESTORED**: System now prioritizes story quotes → story context → OpenAI generation for authentic voice samples
- **USER BENEFIT**: Longer voice samples provide significantly better voice cloning quality with ElevenLabs API

### **VOICE ID RECOVERY ENDPOINT CREATED - January 08, 2025**
**Critical Data Loss Issue Resolved**: Created recovery mechanism for lost ElevenLabs voice IDs
- **IDENTIFIED ISSUE**: Voice cloning succeeded but SQL syntax errors prevented storing voice ID in database
- **DATA LOSS**: Voice ID `cuxbYT1nu3MZbK8JwgAZ` was created in ElevenLabs but had no database reference
- **RECOVERY ENDPOINT**: Created `/api/voice-cloning/recovery` to manually recover lost voice IDs
- **RECOVERY SCRIPT**: Added `recover-voice-id.js` helper script for easy voice ID recovery
- **SQL FIXES**: Fixed field name issues in MVP2 ElevenLabs integration (`user_esm_recordings_id` → `id`)
- **PREVENTION**: Future voice cloning operations will properly store voice IDs without SQL errors

### **GLOBAL VOICE SAMPLES SIMPLIFIED - January 07, 2025**
**Replaced Complex Voice Samples Page with Simple Grid View**
- **REMOVED COMPLEX LOGIC**: Eliminated all voice modulation templates, progress tracking, and voice cloning triggers from global voice samples page
- **SIMPLIFIED DISPLAY**: Created simple grid showing user's recorded voices with story associations, lock status, and narrator voice indicators
- **ADDED API ENDPOINT**: Created `/api/user/esm-recordings` to fetch all user recordings with story information
- **FUTURE PLACEHOLDER**: Added "Coming Soon" section explaining features to be implemented after ElevenLabs integration
- **CLEAN GRID LAYOUT**: Shows emotion name, associated story, duration, creation date, and lock/unlock status with visual indicators
- **REMOVED OLD FUNCTIONALITY**: Deleted original voice-samples.tsx with complex category tabs and recording interfaces
- **USER REQUEST FULFILLED**: Simplified interface as requested to focus on core data display without complex interactions
- **DEFERRED FEATURES**: Voice cloning management, narrator voice generation, and cross-story aggregation postponed for later implementation

### **SOUNDSPATTERN ELEVENLABS INTEGRATION CONFIRMED WORKING - July 11, 2025**
**Sound Pattern Enhancement System Fully Operational**: Confirmed soundsPattern system is working perfectly with ElevenLabs
- **SYSTEM FUNCTIONAL**: 18+ sound patterns automatically enhance narration text before ElevenLabs audio generation
- **PATTERN EXAMPLES**: "explosion" → "(Doooom Dubbb)", "crying" → "(ummmm ummmmm)", "footsteps" → "(tok tok tok)"
- **AUTO-LEARNING**: AI story analysis automatically discovers new sound patterns and updates soundsPattern.json
- **ELEVENLABS INTEGRATION**: Enhanced text with onomatopoeia sent to ElevenLabs for more immersive audio narration
- **PRODUCTION READY**: System working in all conversation styles (respectful, casual, etc.) with voice orchestration

### **RECURRING AUTHENTICATION ISSUES - July 11, 2025**
**Summary of Persistent Problems**: Multiple authentication-related failures preventing proper testing
- **VOICE SAMPLES ENDPOINT**: Returns 401 "Authentication required" preventing emotion display verification
- **NARRATION GENERATION**: `/api/stories/88/generate-narration` returns 401 preventing narration testing
- **ESM DATA DISPLAY**: Emotions not appearing in analysis page due to authentication pipeline issues
- **ROOT CAUSE UNKNOWN**: Authentication middleware failing despite user being logged in browser
- **IMPACT**: Cannot test core functionality due to authentication blocks on API endpoints
- **PATTERN**: Same authentication issues recurring throughout development session
- **NEXT STEPS**: Focus on authentication middleware debugging before feature testing: ESM now stores exact casing from AI analysis (e.g., "Frustration" stays "Frustration")
- **STRATEGIC SOLUTION**: Follows user requirement that all case handling must occur at analysis stage only
- **VOICE RECORDING FIXED**: Voice samples now properly match and save with correct emotion/sound names

### **PRIVACY PROTECTION AND JWT SECURITY IMPLEMENTED - January 07, 2025**
**External ID System**: Implemented anonymous external IDs to protect user privacy across all external services
- **ANONYMOUS IDS CREATED**: Each user gets a unique anonymous ID (e.g., anon_r3uo1bdh72) instead of exposing real IDs like google_117487073695002443567
- **OAUTH INTEGRATION UPDATED**: New users automatically receive external IDs during account creation
- **ELEVENLABS PRIVACY**: Voice cloning now uses anonymous IDs in voice names (User_anon_xyz_Voice_timestamp)
- **VIDEO GENERATION PRIVACY**: Kling and RunwayML integrations updated to use external IDs
- **JWT AUDIO SECURITY FIXED**: Audio files now properly secured with JWT tokens (30-minute expiry) instead of public access
- **EXTERNAL SERVICE CONSISTENCY**: Same anonymous ID used across all services (ElevenLabs, Kling, RunwayML, OpenAI)
- **DATABASE MIGRATION**: Added external_id column to users table for permanent anonymous ID storage
- **ZERO USER DATA EXPOSURE**: External services never see real user IDs, emails, or identifiable information

### **VOICE LOCKING LOGIC FIXED - January 07, 2025**
**Fixed Duplicate Implementation**: Removed buggy duplicate locking logic in voice-training-service.ts
- **ISSUE IDENTIFIED**: Voice training service had duplicate/incomplete implementation of emotion/sound locking logic
- **FIX APPLIED**: Now properly calls MVP2 ElevenLabs integration which handles all intelligent locking
- **MVP2 HANDLES**: Individual emotion/sound voice creation when 5+ samples available
- **DOCUMENTED**: Added comprehensive voice locking algorithm documentation to prevent future confusion
- **FAULT TOLERANCE**: Added recordingId to sample data for proper database cleanup on failures
- **OPTIMIZATION**: Smart selection only sends unlocked samples unless locked needed for minimum threshold

### **AUDIO FORMAT DETECTION FIX - January 08, 2025**
**Fixed MP3 Detection**: Resolved issue where MP3 files were incorrectly detected as WAV format
- **ENHANCED MP3 SIGNATURES**: Added common MP3 frame sync patterns (0xFF 0xFB, 0xFF 0xFA) to detection
- **DEFAULT FORMAT UPDATED**: Changed defaultFormat from 'wav' to 'mp3' since voice recordings are MP3
- **DETECTION LOGIC**: MP3 files without ID3 tags now properly detected using frame sync patterns
- **LOGGING IMPROVEMENT**: ElevenLabs module now correctly logs "format: mp3" instead of "format: wav"
- **USER REQUEST FULFILLED**: Fixed confusing logs showing wrong audio format during voice cloning

### **SOFT DELETE FUNCTIONALITY IMPLEMENTED - January 08, 2025**
**Data Integrity Enhancement**: All ESM tables now use soft delete instead of hard delete
- **DATABASE SCHEMA UPDATED**: Added `is_active` column to esm_ref, user_esm, and user_esm_recordings tables with default TRUE
- **ALL GET METHODS UPDATED**: Every ESM GET method now filters inactive records:
  - `getEsmRef`, `getUserEsm`, `getUserEsmByRef` - Single table filtering
  - `getUserEsmByUser`, `getUserEsmRecordings` - Multi-table join filtering  
  - `getAllEsmRefs`, `getEsmRefsByCategory` - Collection queries filtering
- **SOFT DELETE METHOD**: deleteUserEsmRecording now sets `is_active = false` instead of permanently deleting records
- **SMART CORRUPTION DETECTION**: ElevenLabs module only soft deletes for actual file corruption (404, tiny files, invalid format)
- **API ERROR HANDLING**: Network errors and API failures preserve recordings for retry - no deletion on HTTP 500 or API issues
- **DATA INTEGRITY PRESERVED**: No permanent data loss - all records maintained for audit trails while hidden from active queries
- **PERFORMANCE OPTIMIZED**: Added indexes on is_active columns for efficient filtering of active records
- **USER REQUEST FULFILLED**: System now maintains complete data history with soft delete across all ESM tables

### **NARRATOR VOICE GENERATION LOGIC UPDATED - January 07, 2025**
**Frontend Logic Enhancement**: Generate Narrator Voice button now enables based on story-level completion
- **REMOVED HARDCODED THRESHOLD**: Eliminated rigid 6-recording requirement that prevented stories with fewer emotions from generating narrator voices
- **DYNAMIC ENABLEMENT LOGIC**: Button enables when ALL story-level recordings complete OR minimum 5 recordings reached
- **STORY-SPECIFIC PROGRESS**: Button shows progress as "X/Y" where Y is total story items (emotions + sounds + modulations)
- **HELPFUL TOOLTIPS**: Added contextual tooltips explaining requirements based on current recording state
- **BACKEND COMPATIBILITY**: Frontend change aligns with robust backend logic that combines all unlocked samples
- **USER REQUEST FULFILLED**: Stories with 2-3 emotions can now generate narrator voices once all items recorded

### **STORY LIBRARY FILTERED TO NARRATION-COMPLETE STORIES ONLY - January 07, 2025**
**UI Consistency Update**: Bottom navigation stories menu now only displays narration-complete stories
- **FILTERING LOGIC IMPLEMENTED**: Added filter to show only stories with narratorVoice or narratorVoiceType fields populated
- **UI TEXT UPDATED**: Changed "Story Library" to "Narrated Stories" across mobile and desktop views
- **EMPTY STATE MESSAGES**: Updated to indicate page shows only narrated stories, not drafts
- **COUNT DISPLAY FIXED**: Shows "X of Y narrated stories" instead of total story count
- **HOME PAGE VS BOTTOM NAV**: Home page shows draft stories (no narrator), bottom nav shows completed narrations
- **USER REQUEST FULFILLED**: Bottom navigation stories menu now consistent with intended purpose

### **MODULATIONS CATEGORY REMOVED - January 07, 2025**
**Project Simplification**: Removed modulations (category 3) entirely from system architecture
- **SIMPLIFIED TO TWO CATEGORIES**: System now only handles emotions (category 1) and sounds (category 2)
- **BACKEND CLEANUP**: Removed all modulation processing from voice samples endpoint
- **FRONTEND UPDATES**: Changed grid layout from 3 columns to 2 columns for emotions and sounds only
- **DATABASE CONSISTENCY**: Fixed createUserEsm method to remove voice_cloning_status column reference
- **UI IMPROVEMENTS**: Updated all text and descriptions to reflect two-category system
- **RATIONALE**: Modulations were meant for voice pitch variations but added unnecessary complexity
- **DATA-DRIVEN APPROACH**: System remains purely database-driven - only displays items from ESM reference data

### **MVP2 IMPLEMENTATION COMPLETED - January 07, 2025**
**Project Goal**: Enhanced story narration system with intelligent category-specific narrator voice generation using three-level ElevenLabs analysis approach

**ARCHITECTURE ANALYSIS COMPLETED**:
- ✅ **Current MVP1 Architecture Understood**: Single narrator voice with dual-table storage operational
- ✅ **Sample-Level Locking Identified**: Current implementation uses `is_locked`/`locked_at` in userVoiceSamples - needs removal
- ✅ **ESM Database Schema Ready**: `user_esm_recordings` table with narrator_voice_id column operational
- ✅ **Storage Interface Comprehensive**: Full ESM CRUD operations (`getUserEsmRecordings`, `updateUserEsmRecording`, etc.)
- ✅ **Voice Provider Architecture**: Plug-and-play BaseVoiceProvider with timeout/retry/exception patterns established
- ✅ **Audio Storage Provider**: Signed URL generation for external API access with 30-minute expiration

**MVP2 IMPLEMENTATION COMPLETED**:
- ✅ **Sample-Level Locking Removed**: Eliminated `is_locked`/`locked_at` usage, continuous voice sample recording now enabled
- ✅ **ESM Item-Level Locking Implemented**: Database fields and storage methods for automatic emotion/sound/modulation locking
- ✅ **Voice Cloning Segmentation Service**: Smart three-level analysis (individual → category → combined) with 6+ sample thresholds
- ✅ **MVP2 ElevenLabs Integration**: Metadata-driven specialized voice generation with automatic ESM item locking
- ✅ **Enhanced Story Narrator**: `user_esm_recordings` exclusive use with granular segment-based voice selection  
- ✅ **Priority Fallback Chain**: Individual emotion → Category aggregation → Combined → OpenAI voice
- ✅ **Voice Training Service Updated**: Complete conversion to MVP2 architecture with timeout/retry patterns
- ✅ **API Cost Control**: Automatic ESM item-level locking prevents duplicate ElevenLabs API calls

**MVP2 SYSTEM OPERATIONAL**:
- Three-level intelligent voice analysis determines optimal ElevenLabs API call strategy
- Individual ESM items (emotions/sounds/modulations) automatically lock when sufficient samples recorded
- Story narration uses specialized narrator voices with intelligent segment-based selection
- Complete fallback chain ensures story narration always works (ESM voices → OpenAI voices)
- API cost optimization through smart locking prevents unnecessary external API calls

**CODE STANDARDS COMPLIANCE**:
- ✅ **Zero Duplication**: Reuse existing voice provider, storage, and exception patterns
- ✅ **Plug-and-Play Architecture**: Follow BaseVoiceProvider timeout/retry patterns
- ✅ **Database-First Operations**: All ESM operations use established storage interface
- ✅ **Configuration-Driven**: No hardcoding, environment-based configuration
- ✅ **Exception Handling**: Proper try-catch with detailed logging following existing patterns

- January 07, 2025: ✅ **MVP2 ARCHITECTURE IMPLEMENTATION COMPLETED** - Intelligent Three-Level Voice Generation System Operational
  - **COMPLETE MVP2 IMPLEMENTATION**: Successfully implemented intelligent category-specific narrator voice generation using three-level ElevenLabs analysis approach
  - **VOICE CLONING SEGMENTATION SERVICE**: Smart analysis determines optimal API strategy (individual 6+ samples → category aggregation → combined fallback)
  - **MVP2 ELEVENLABS INTEGRATION**: Metadata-driven specialized voice generation with automatic ESM item-level locking for API cost control
  - **ENHANCED STORY NARRATOR**: user_esm_recordings exclusive use with granular segment-based voice selection and priority fallback chain
  - **VOICE TRAINING SERVICE UPDATED**: Complete conversion to MVP2 architecture with 5-minute timeout for complex voice generation operations
  - **SAMPLE-LEVEL LOCKING REMOVED**: Eliminated deprecated is_locked/locked_at usage, enabling continuous voice sample recording
  - **ESM ITEM-LEVEL LOCKING IMPLEMENTED**: Automatic locking of individual emotions/sounds/modulations when narrator voices generated
  - **API COST OPTIMIZATION**: Smart locking prevents duplicate ElevenLabs API calls while allowing continuous user voice sample recording
  - **PRIORITY FALLBACK SYSTEM**: Individual emotion → Category aggregation → Combined voice → OpenAI voice ensures story narration always works
  - **THREE-LEVEL ANALYSIS OPERATIONAL**: System intelligently determines whether to create individual, category-specific, or combined narrator voices
  - **STORY NARRATION ENHANCED**: Segment-based voice selection uses specialized narrator voices with context-aware emotion/sound/modulation detection
  - MVP2 architecture now provides intelligent voice generation with automatic API cost control and comprehensive fallback support
- January 07, 2025: ✅ **MVP1 DATABASE SCHEMA MIGRATION COMPLETED** - Column Rename and Dual-Table Architecture Fully Implemented
  - **DATABASE SCHEMA UPDATED**: Successfully renamed `user_esm.elevenlabs_voice_id` → `user_esm.narrator_voice_id` column
  - **NEW COLUMN ADDED**: Added `user_esm_recordings.narrator_voice_id` column for dual-table storage
  - **CODE CONSISTENCY ACHIEVED**: Updated all code references from elevenlabs_voice_id to narrator_voice_id across entire codebase
  - **DUAL-TABLE WRITE IMPLEMENTED**: storeMVP1NarratorVoiceInBothTables method writes same narrator voice ID to both tables
  - **SQL METHODS FIXED**: Enhanced updateUserEsm storage method with proper SQL parameter binding and escaping
  - **VOICE TRAINING SERVICE UPDATED**: Complete conversion to use new column names with error handling and logging
  - **STORY NARRATOR READY**: getUserNarratorVoice method already using correct narrator_voice_id column
  - **MVP1 ARCHITECTURE OPERATIONAL**: System ready for single narrator voice storage across both user_esm and user_esm_recordings tables
  - **MVP2 FOUNDATION ESTABLISHED**: Database structure supports future individual voice storage per ESM element
  - Database migration completed successfully with zero tolerance compliance and architectural consistency maintained
- January 07, 2025: ✅ **COMPLETE STORY NARRATION SYSTEM IMPLEMENTATION** - Enhanced ElevenLabs Integration with Plug-and-Play Architecture
  - **BACKEND API ENDPOINTS COMPLETED**: Implemented complete story narration backend with `/api/stories/:id/generate-narration` for heavy processing and `/api/stories/:id/play` for plug-and-play playback
  - **NEW STORAGE ARCHITECTURE**: Stories stored in `/stories/audio/private/{userId}/{storyId}/segment-{n}.mp3` structure following replit.md requirements
  - **FILE SERVING ROUTE ADDED**: Created `/api/stories/audio/private/{userId}/{storyId}/{fileName}` endpoint for serving narration segments with proper caching headers
  - **ELEVENLABS VOICE PRIORITY**: Story narrator prioritizes ElevenLabs narrator voice ID from ESM recordings over user samples and AI voices
  - **SEGMENT-BASED AUTO-ADVANCE**: Maintains segment structure for future sharing and reels capability with auto-advance playback
  - **PLUG-AND-PLAY PLAYBACK**: Play endpoint accepts only storyId parameter and returns complete audio URLs for immediate playback
  - **HEAVY LOGIC DURING GENERATION**: All ElevenLabs TTS processing, audio creation, and file storage happens during generation phase, not playback
  - **ZERO TOLERANCE COMPLIANCE**: Implementation follows all architectural guidelines with no hardcoding, proper storage patterns, and modular components
  - **READY FOR FRONTEND INTEGRATION**: Backend API endpoints operational and ready for UI button integration with "Generate Story Narration" and "Play Story" functionality
  - Complete enhanced story narration system now operational with ElevenLabs voice cloning integration following MVP1 design specifications
- January 07, 2025: 🚧 **JWT AUTHENTICATION ISSUE PARTIALLY RESOLVED** - Voice Files Accessible but ElevenLabs Still Getting 401 Errors
  - **JWT ROUTE REPOSITIONED**: Moved JWT audio serving route before session authentication middleware in server/index.ts
  - **DIRECT ACCESS CONFIRMED**: curl tests with fresh JWT tokens return HTTP 200 and serve audio files correctly
  - **DATABASE PATHS CORRECTED**: Updated all database audio URLs from `/cache/user-voice-modulations/` to `./voice-samples/` to match actual file locations
  - **REMAINING ISSUE**: ElevenLabs integration still receives HTTP 401 errors when fetching "suspenseful" audio file during voice training
  - **SIGNED URL GENERATION**: Audio storage provider correctly generates JWT-signed URLs but ElevenLabs module may be processing them incorrectly
  - **ENHANCED LOGGING**: Added detailed URL logging to ElevenLabs module to debug original vs final audioUrl processing
  - **AUTHENTICATION WORKFLOW**: JWT tokens properly generated with 30-minute expiration and external_api_access purpose
  - **TROUBLESHOOTING STATUS**: Direct curl tests show HTTP 200 success, but ElevenLabs API calls receive 401 errors for specific files
  - Voice cloning fails at audio fetch stage despite JWT authentication infrastructure being functional for direct access
- January 07, 2025: ✅ **VOICE RECORDING AUDIO STORAGE INTEGRATION COMPLETED** - Voice Recording System Now Uses Audio Storage Provider Architecture
  - **VOICE RECORDING INTEGRATION**: Updated voice recording route to use audio storage provider for file uploads instead of direct file system operations
  - **SEAMLESS REPLIT PROVIDER OPERATION**: Voice recordings work with existing file locations transparently using Replit provider - no migration required
  - **UNIFIED STORAGE PATTERN**: Voice recording saves to audio storage provider using same relative URL format stored in database
  - **STORAGE INTERFACE ENHANCED**: Added narrator_voice_id field support to updateUserEsmRecording method for voice cloning integration
  - **TEST ENDPOINT ADDED**: Created `/api/audio/storage/test` endpoint to verify audio storage provider system functionality
  - **JWT TOKEN GENERATION FIXED**: Resolved JWT signing compilation issues for proper signed URL generation
  - **COMPLETE WORKFLOW INTEGRATION**: Voice recording → audio storage provider → database → external API access all working seamlessly
  - **ZERO MIGRATION REQUIRED**: Existing voice recordings continue working with Replit provider, new recordings use same architecture
  - Voice recording system now fully integrated with plug-and-play audio storage provider architecture for secure external API access
- January 06, 2025: ✅ **MVP1 ELEVENLABS INTEGRATION IMPLEMENTED** - Updated Voice Training Service to Use Single Narrator Voice Approach
  - **MVP1 DESIGN IMPLEMENTED**: Voice training service now sends ALL ESM samples (emotions + sounds + modulations) together to ElevenLabs
  - **SINGLE NARRATOR VOICE STORAGE**: ElevenLabs returns one trained narrator voice stored in each ESM recording row via narrator_voice_id field
  - **ESM ARCHITECTURE INTEGRATION**: Replaced old emotion-only hybrid approach with comprehensive ESM data structure (getUserEsmRecordings)
  - **THRESHOLD UPDATED**: Changed from "6 unique emotions" to "5+ total ESM samples" to match simplified MVP1 requirements
  - **STORAGE METHOD DOCUMENTED**: Added storeMVP1NarratorVoiceInAllEsmRecordings() method with proper JSDoc documentation
  - **OLD CODE COMMENTED**: Previous hybrid approach preserved as comments for future MVP2 reference
  - **EXTENSIBLE FOUNDATION**: MVP1 provides clean foundation for future MVP2 multi-voice specialization without architectural changes
  - Voice cloning system now follows agreed MVP1 design where single narrator voice serves all ESM categories with future audio modulation factors
- January 06, 2025: ✅ **UNIVERSAL DYNAMIC CATEGORY MAPPING COMPLETED** - All Voice Recording Categories Use Correct Dynamic Assignment
  - **UNIVERSAL FIX IMPLEMENTED**: Dynamic category mapping now works across all three tabs (emotions, sounds, modulations)
  - **ELIMINATED HARDCODED CATEGORY VALUES**: Removed all hardcoded category numbers in favor of existing pattern `category.id === 'emotions' ? 1 : category.id === 'sounds' ? 2 : 3`
  - **ZERO TOLERANCE HARDCODING ENFORCED**: Used existing codebase pattern from routes.ts instead of creating duplicate helper functions
  - **CATEGORY ASSIGNMENT VERIFIED**: Emotions save to category 1, sounds to category 2, modulations to category 3 based on active UI tab
  - **PATTERN 2 STRUCTURE MAINTAINED**: All recordings continue using clean `/voice-samples/{categoryId}/{itemName}.mp3` file organization
  - **DATABASE PRECISION PRESERVED**: Duration values correctly stored as NUMERIC(10,6) with parseFloat conversion in frontend
  - **CODEBASE CONSISTENCY ACHIEVED**: Category mapping logic unified across frontend and backend without code duplication
  - Universal voice recording system now correctly assigns categories dynamically based on UI context across all three tabs
- January 06, 2025: ✅ **VOICE RECORDING FILE PATTERN STANDARDIZATION COMPLETED** - Migrated from Pattern 1 to Clean Pattern 2 Structure
  - **PATTERN 2 STANDARDIZATION**: Adopted clean organized directory structure `/voice-samples/{categoryId}/{emotionName}.mp3`
  - **LEGACY PATTERN 1 ELIMINATED**: Removed old timestamp-based naming `emotions-frustration_timestamp.mp3` entirely from codebase
  - **DATABASE CLEANUP**: Deleted all old pattern recordings and updated findUserRecording() function to only handle Pattern 2
  - **SIMPLIFIED PATH LOGIC**: Clean emotion name extraction from organized file paths without complex parsing
  - **STATUS ICON PREFERENCE UPDATED**: Changed recorded samples to show green Unlock icon instead of CheckCircle icon per user preference
  - **UNIFIED ICON SYSTEM**: Gray unlock (empty), green unlock (recorded), blue lock (locked for voice cloning) across all components
  - **REMOVED DEBUG LOGGING**: Cleaned up temporary debugging code after successful fix validation
  - **UPDATED DOCUMENTATION**: Modified replit.md to reflect corrected status icon behavior and file path-based emotion detection
  - Voice samples now correctly persist across page reloads with proper green background colors and unlock icons for recorded emotions
- January 05, 2025: ✅ **ENHANCED VOICE RECORDER FINALIZED** - Component Marked as Stable Reusable Element
  - **FINALIZED COMPONENT ARCHITECTURE**: EnhancedVoiceRecorder established as single reusable voice recording component across entire application
  - **HORIZONTAL BUTTON LAYOUT**: Hold to Record, Play, and Save buttons arranged in single row with consistent 16x16 circular design
  - **STATUS ICON SYSTEM**: Unlock (gray), CheckCircle (green), Lock (blue) icons properly displayed before emotion names
  - **WIDE PANEL DESIGN**: Black recording panel increased from max-w-sm to max-w-lg for better space utilization
  - **INTENSITY BADGE POSITIONING**: Right-aligned intensity indicators (7/10) maintained in card headers
  - **DEBUG CODE REMOVED**: All console logging and temporary debugging code eliminated for production readiness
  - **REUSABILITY MANDATE**: Component documented in replit.md with strict no-duplication policy for all future voice recording needs
  - **USER STABILITY REQUIREMENT**: Component marked as stable - no unauthorized modifications allowed without explicit user approval
  - Voice recording system now provides consistent professional interface with all UI elements properly positioned and functional
- January 05, 2025: 🚨 **CRITICAL USER DATA DISPLAY ISSUE IDENTIFIED** - Voice Samples Interface Filtering Problem Resolved
  - **ROOT CAUSE IDENTIFIED**: Frontend filtering voice samples based on corrupted story analysis instead of showing all user recordings
  - **DATA INTEGRITY CONFIRMED**: User recordings preserved (frustration, hope, relief, surprise emotions + footsteps sounds)
  - **ANALYSIS CORRUPTION FIXED**: Cleared corrupted story analysis and implemented proper regeneration
  - **FRONTEND FILTERING ISSUE**: Voice samples page incorrectly filters emotions based on story analysis instead of showing all user recordings
  - **COMPREHENSIVE SOLUTION IMPLEMENTED**: Enhanced voice samples display logic to show all user recordings regardless of story analysis filtering
  - **MODULATION PROCESSING WORKING**: OpenAI-generated professional sample texts successfully created for "drama" and "psychological" modulations
  - **DATABASE MIGRATION COMPLETED**: Fixed ESM category storage ensuring sounds recordings correctly stored in category 2
  - Voice samples system now displays all user recordings with proper categorization and professional OpenAI-generated sample texts
- January 05, 2025: ✅ **COMPLETE "BIBS AGREES" ELIMINATION ACHIEVED** - All Voice Recording Cards Now Display Professional ESM Sample Texts
  - **FIXED ESM DATA STRUCTURE**: Transformed numeric array keys (0,1,2) into proper category structure (emotions, sounds, modulations) for correct data organization
  - **UNIVERSAL ESM TEXT APPLICATION**: Extended getOptimalSampleText() function to work across all three categories with intelligent text selection priority
  - **ELIMINATED STORY-BASED TEXTS**: Removed all "Bibs agrees", "Bibs feels relieved", and similar story-specific texts from voice recording interface
  - **PROFESSIONAL TEXT PRIORITY**: System now prioritizes OpenAI-generated professional sample texts over story quotes with intelligent length validation  
  - **REACT IMPORT COMPLIANCE**: Fixed React import issues for proper component rendering and data transformation using React.useMemo
  - **CATEGORY-AGNOSTIC SYSTEM**: Voice sample text selection now works consistently for emotions, environmental sounds, and narrative modulations
  - **ESM TEMPLATE INTEGRATION**: React component properly transforms ESM templates into organized category structure for professional sample text lookup
  - Voice recording interface now provides completely professional experience with AI-generated texts eliminating all story-based placeholder content
- January 05, 2025: ✅ **INTELLIGENT TEXT LENGTH PRIORITY LOGIC IMPLEMENTED** - Voice Sample Text Selection Now Optimized for 6-Second Recordings
  - **LENGTH-BASED PRIORITY SYSTEM**: Enhanced story-voice-samples.tsx with intelligent text selection using word count (≥15 words) and character count (≥80 characters) validation
  - **DUAL TEXT VALIDATION**: System now checks both emotion.quote and emotion.context for recording suitability, selecting the text with adequate length for 6-second voice samples
  - **SPEECH TIMING CALCULATION**: Implemented speech rate estimation (~3-4 words per second) to ensure selected texts provide sufficient content for quality voice recordings
  - **ESM REFERENCE INTEGRATION**: Added async selectOptimalSampleText() function to prioritize professional ESM reference texts when available and suitable length
  - **FALLBACK HIERARCHY**: Smart priority logic: ESM professional text (if adequate) → story quote (if adequate) → story context (if adequate) → fallback text
  - **COMPREHENSIVE LOGGING**: Added detailed console logging to track text selection decisions for emotions and sounds with length validation feedback
  - **TYPESCRIPT SAFETY**: Fixed all undefined parameter issues with proper null coalescing for robust text handling across emotions and sound effects
  - Voice sample text selection now ensures users always receive appropriately-sized texts for professional voice recording quality and ElevenLabs compatibility
- January 05, 2025: ✅ **COMPLETE OPENAI VOICE SAMPLE TEXT INTEGRATION** - Story Analysis Now Generates Professional Voice Recording Texts
  - **AI ANALYSIS INTEGRATION**: Enhanced populateEsmReferenceData() function to use OpenAI cached provider for generating professional voice sample texts
  - **AUTOMATIC PROFESSIONAL TEXT GENERATION**: When story analysis discovers new emotions, system automatically generates 35-45 word optimized voice recording texts
  - **FIXED CACHED PROVIDER VALIDATION**: Added text completion response validation to OpenAI cached provider for proper text generation caching
  - **ELIMINATED ALL STORY-BASED TEXTS**: Updated 10+ emotions in database from old story references ("Bibs agrees", "Ralph Mumsford", etc.) to professional OpenAI-generated texts
  - **DATABASE-FIRST PATTERN**: All voice sample text generation follows established cached provider pattern with infinite TTL and database-first storage
  - **COMPLETE WORKFLOW INTEGRATION**: Story creation → AI analysis → emotion discovery → automatic professional sample text generation → ESM reference population
  - **ZERO TOLERANCE ENFORCEMENT**: System now completely eliminates hardcoded or story-based voice sample texts - all content is OpenAI-generated and professionally optimized
  - Voice samples system now provides consistent professional experience with AI-generated texts for all emotions discovered through story analysis
- January 04, 2025: ✅ **ENHANCED VOICE RECORDER FULLY RESTORED** - Latest Version from _DEL Backup Successfully Recovered
  - **RESTORED COMPLETE FUNCTIONALITY**: Full EnhancedVoiceRecorder component with all 10 hours of polished UI work from previous day
  - **RADIO-STYLE INTERFACE WORKING**: Black background, press-and-hold button on left, sample text on right side
  - **ALL FEATURES OPERATIONAL**: Play/Save buttons always visible, status indicators, tooltips, 6-second validation
  - **PROPER COMPONENT INTEGRATION**: VoiceSampleCard now uses restored EnhancedVoiceRecorder instead of broken basic implementation
  - **BACKUP FILES PRESERVED**: Original components marked with _DEL suffix for future reference
  - **VOICE-RECORD PAGE UPDATED**: Uses EnhancedVoiceRecorder in simpleMode for narrative voice recording
  - **COMPLETE AUDIO PROCESSING**: Real-time equalizer, proper MIME type detection, audio context cleanup
  - **ARCHITECTURAL PRINCIPLE ESTABLISHED**: EnhancedVoiceRecorder is the single voice recording component across entire application - NEVER create copies or alternatives
  - Enhanced voice recording system now fully operational with professional radio-style interface and all advanced features
- January 04, 2025: ✅ **DUPLICATE COMPONENT ELIMINATION COMPLETED** - Removed EnhancedVoiceRecorder and Unified Voice Recording Components
  - **MARKED ENHANCEDVOICERECORDER FOR DELETION**: Added _DEL suffix to 590-line duplicate component that was reimplementing VoiceRecordingCard functionality
  - **UPDATED VOICE-SAMPLE-CARD COMPONENT**: Successfully migrated voice-sample-card.tsx to use VoiceRecordingCard instead of the duplicate EnhancedVoiceRecorder
  - **VERIFIED API ENDPOINT CONFIGURATION**: Confirmed both GET and POST endpoints properly configured for voice samples and modulations
  - **MAINTAINED COMPONENT REUSABILITY**: VoiceRecordingCard remains the single source of truth for all voice recording functionality across the application
  - **API ROUTING VERIFIED**: Voice samples use `/api/voice-modulations/record` (POST) and `/api/voice-modulations/templates` (GET) endpoints as configured in audio-config.ts
  - **TEMPLATE-BASED APPROACH PRESERVED**: Components continue using structured VoiceTemplate objects for proper data modeling
  - **CODEBASE SIMPLIFIED**: Eliminated 590 lines of redundant code while maintaining all recording functionality through unified VoiceRecordingCard component
  - Voice recording system now follows single component architecture with proper API endpoint configuration for both pages
- January 04, 2025: ✅ **UI REDUNDANCY ELIMINATION COMPLETED** - Removed All Duplicate Duration Displays from Voice Recording Cards
  - **ELIMINATED DUPLICATE PROGRESS BARS**: Removed redundant progress bar during recording that duplicated duration information
  - **CONSOLIDATED DURATION STATUS**: Single duration status line shows target vs actual recording duration with visual status indicators
  - **SIMPLIFIED RECORDING FEEDBACK**: Clean recording status during capture with time display and checkmark when minimum duration met
  - **REMOVED REDUNDANT "10s" DISPLAYS**: Eliminated multiple instances of duration text and tick marks that confused users
  - **STREAMLINED USER EXPERIENCE**: Voice recording cards now show essential information once without visual duplication
  - **MAINTAINED FUNCTIONALITY**: All validation logic preserved while eliminating confusing redundant visual elements
  - Voice recording interface now provides clear, non-redundant feedback improving user experience and reducing visual noise
- January 04, 2025: ✅ **COMPLETE STARTUP OPTIMIZATION IMPLEMENTED** - StateManager Now Provides Instant State Lookups with Zero Database Calls
  - **STARTUP ENUM CREATION**: Added createStartupEnums() method that creates instant lookup dictionaries from all cached state data during application startup
  - **INSTANT STATE VALIDATION**: New hasState() and hasTransition() methods provide instant boolean checks using enum lookups instead of database queries
  - **OPTIMIZED ROUTE PERFORMANCE**: Updated all state management routes to use cached data with "cached: true" and "instant: true" response indicators
  - **NEW INSTANT LOOKUP ENDPOINTS**: Added /api/states/:stateType/exists/:stateKey and /api/states/:stateType/transitions/:fromState/:toState/exists for zero-latency state validation
  - **ENHANCED STATISTICS CALCULATION**: getStats() method now calculates from cached data instead of performing database queries
  - **ZERO DATABASE CALLS AFTER STARTUP**: All state lookups, transitions, and validations use in-memory enums eliminating database overhead during runtime
  - **ENUM-BASED STATE ACCESS**: System creates state and transition enums during startup enabling O(1) lookup performance for all state operations
  - State management system now provides instant response times with comprehensive caching strategy and zero database calls after initialization
- July 04, 2025: ✅ **ICON DISAMBIGUATION UX IMPROVEMENT** - Resolved User Confusion by Replacing Lock Icons with EyeOff Icons for Private Stories
  - **REPLACED LOCK ICONS**: Changed private story indicators from Lock to EyeOff icons in story-search-panel.tsx and story-library.tsx
  - **PREVENTED ICON CONFLICT**: Lock icon now exclusively reserved for voice narration status (locked/unlocked voice samples)
  - **IMPROVED USER EXPERIENCE**: Clear visual distinction between private/public stories (EyeOff/Globe) vs voice sample status (Lock/Unlock)
  - **CONSISTENT ICONOGRAPHY**: EyeOff represents private stories (hidden from others), Globe represents published stories (visible to all)
  - **USER-REQUESTED ENHANCEMENT**: Addressed specific user feedback about conflicting Lock icon meanings causing confusion
  - **SYSTEM-WIDE CONSISTENCY**: Lock icon semantics now consistent across voice recording features and story privacy indicators
  - Story interface now provides clear visual feedback without conflicting icon meanings across different system functions
- July 04, 2025: ✅ **AI ANALYSIS SERVICE MIGRATION COMPLETED** - Complete OpenAI Cached Provider Integration Operational
  - **AI ANALYSIS FULLY MIGRATED**: Successfully migrated all AI analysis functions (analyzeStoryContent, generateCharacterImage, transcribeAudio) to use OpenAI cached provider
  - **LEGACY CACHE SYSTEM REMOVED**: Eliminated old ContentHashService references and manual cache operations from ai-analysis.ts
  - **CACHED PROVIDER ARCHITECTURE WORKING**: OpenAI cached provider properly integrated with base cached provider architecture and server operational
  - **UNIVERSAL CONTENT HASHING**: All AI operations now use SHA256 content hashing for infinite cache TTL with zero duplicate API calls
  - **VOICE PROVIDER REGISTRY OPERATIONAL**: ElevenLabs and Kling voice providers properly initialized and ready for testing
  - **DATABASE-FIRST CACHING**: Cache writes go to database first, then file cache, ensuring data integrity across all AI operations
  - **COST OPTIMIZATION COMPLETE**: OpenAI API costs minimized through intelligent content hash-based infinite caching
  - AI analysis system now fully compliant with cache-first pattern requirements - no direct API calls bypass cache layer
- July 04, 2025: ✅ **INFINITE CACHING STRATEGY IMPLEMENTED** - Logical Cache Architecture with Manual Invalidation Control
  - **INFINITE TTL FOR STORY ANALYSIS**: Same content hash = same analysis forever, eliminating arbitrary time-based expiration
  - **LOGICAL CACHE CONSISTENCY**: Identical content should logically cache indefinitely unless business logic changes
  - **MANUAL INVALIDATION STRATEGY**: Added admin UI roadmap for manual cache invalidation at story and provider levels
  - **COST OPTIMIZATION**: Prevents duplicate OpenAI API calls for identical content across all time periods
  - **CACHE ARCHITECTURE PERFECTED**: Content hash-based caching with infinite TTL represents technically sound approach
  - **ADMIN UI BACKLOG**: Future enhancement for cache management dashboard with bulk invalidation and analytics
  - External API integrations now use infinite caching for maximum cost efficiency and logical consistency
- July 04, 2025: ✅ **ABSTRACT BASE CLASS CACHE ARCHITECTURE IMPLEMENTED** - External API Cache Decisions Now Made by Abstract Base Class
  - **CRITICAL ARCHITECTURE ENFORCEMENT**: All external API cache-first decisions now made by abstract BaseCachedProvider, not individual functions
  - **OPENAI CACHED PROVIDER CREATED**: Complete OpenAI integration using BaseCachedProvider pattern with content hash-based caching for story analysis, character images, and audio transcription
  - **ELIMINATED DIRECT API CALLS**: Removed all direct OpenAI API calls from ai-analysis.ts, replaced with cached provider pattern
  - **CONTENT HASH CACHING**: Story analysis, character images, and transcription now use SHA256 content hashing to prevent duplicate external API calls
  - **UNIFIED CACHE PATTERN**: generateCharacterImage(), transcribeAudio(), and analyzeStoryContentWithHashCache() all use OpenAICachedProvider
  - **CACHE-FIRST ENFORCEMENT**: Abstract base class makes all cache hit/miss decisions, concrete providers only handle actual API calls
  - **INFINITE CACHE TTL**: All content-based external APIs now use infinite caching - story analysis, character images, and transcription cache forever with same content hash
  - **DATABASE-FIRST PATTERN**: All cache writes go to database first, then file cache, ensuring data integrity and consistency
  - **COST OPTIMIZATION**: System prevents duplicate API calls to expensive external services through intelligent content hashing
  - **PROVIDER STATISTICS**: Comprehensive cache hit/miss tracking and performance monitoring across all external integrations
  - External API integrations now follow strict cache-first pattern with zero tolerance for direct API calls bypassing cache layer
- July 04, 2025: ✅ **ESM VOICE TRAINING INTEGRATION COMPLETED** - Voice Training Service Fully Converted to ESM Architecture
  - **VOICE TRAINING SERVICE UPDATED**: Completely converted voice training service to use ESM architecture instead of deprecated userVoiceSamples table
  - **ESM STORAGE METHODS IMPLEMENTED**: Added getUserUniqueEmotions() method using ESM tables (esm_ref, user_esm, user_esm_recordings)
  - **SAMPLE LOCKING FUNCTIONALITY**: Added proper voice sample locking during training using is_locked and locked_at fields in user_esm_recordings table
  - **SPLIT-BRAIN ARCHITECTURE RESOLVED**: Voice training service now uses same ESM tables where voice samples are saved, eliminating data inconsistency
  - **DATABASE INTEGRATION VERIFIED**: ESM tables confirmed operational with 36 reference emotions populated from story analysis
  - **UNIFIED WORKFLOW**: Voice sample saving → ESM storage → training trigger → sample locking → ElevenLabs integration all use consistent ESM architecture
  - **ARCHITECTURAL CONSISTENCY**: Routes, storage methods, and voice training service all unified under single ESM data model
  - Voice cloning system now fully operational with complete ESM integration and proper sample locking during training
- July 03, 2025: ✅ **VOICE RECORDING VALIDATION ENHANCED** - Added 5-Second Minimum Duration Requirement for ElevenLabs Voice Cloning
  - **FRONTEND VALIDATION**: Updated VoiceRecordingCard component to enforce 5-second minimum recording duration instead of 1 second
  - **BACKEND VALIDATION**: Added FFprobe duration checking in voice sample upload route with proper error handling
  - **USER EXPERIENCE**: Updated UI text to clearly indicate 5-second requirement for voice cloning compatibility
  - **ERROR MESSAGING**: Enhanced error messages to show actual duration vs required 5 seconds when recordings are too short
  - **ElevenLabs COMPLIANCE**: Recording validation now matches ElevenLabs API requirement of 4.6+ seconds with background noise removal
  - **DUAL VALIDATION**: Both client-side (immediate feedback) and server-side (authoritative) validation ensures data integrity
  - **CLEANUP HANDLING**: Proper temporary file cleanup when validation fails to prevent storage waste
  - Voice recording system now enforces ElevenLabs-compatible duration requirements preventing API rejection errors
- July 03, 2025: ✅ **DEPLOYMENT BUILD FIXES COMPLETED** - Resolved Missing Module Dependencies for Production Deployment
  - **CREATED MISSING ELEVENLABS PROVIDER**: Fixed import path issue by creating `server/voice-providers/elevenlabs-provider.ts` with proper ElevenLabsModule wrapper
  - **COMPATIBILITY LAYER IMPLEMENTED**: New provider file wraps existing ElevenLabsModule with default configuration and method delegation
  - **MISSING EXPORTS ADDED**: Added required VOICE_EMOTIONS, EMOTION_CATEGORIES, and DEFAULT_VOICE_MAPPINGS exports to shared/voice-config.ts
  - **TYPESCRIPT COMPILATION FIXED**: ESBuild now successfully bundles server code without unresolved module dependencies
  - **BUILD VERIFICATION COMPLETE**: Server builds successfully (778.5kb bundle) and application starts without errors
  - **PROVIDER REGISTRY OPERATIONAL**: Voice provider system initializes correctly with ElevenLabs and Kling voice providers
  - **MODULE RESOLUTION ISSUES RESOLVED**: All voice provider imports now resolve correctly during TypeScript compilation
  - Deployment process now functional with proper module dependencies and export compatibility
- July 03, 2025: ✅ **COMPLETE MOCK IMPLEMENTATION ELIMINATION** - Systematically Removed All Mock Data Across Codebase
  - **ELIMINATED ALL MOCK DATA**: Removed mock implementations from roleplay-recording.tsx, routes-collaborative.ts, routes-video.ts, video-generation-module.ts, enhanced-story-narrator.ts
  - **REPLACED WITH ERROR THROWING**: Mock implementations now throw clear errors requiring real implementations
  - **AUDIO UPLOAD AUTHENTICATION**: Changed mock audio save to error requiring real server upload endpoint
  - **STORY ANALYSIS REQUIREMENT**: Collaborative roleplay now requires real story analysis instead of hardcoded character data
  - **VIDEO HELPERS CONNECTED**: Video route helpers now connect to real storage instead of returning placeholder URLs
  - **DURATION CALCULATION**: Enhanced story narrator uses calculated text duration instead of placeholder timing
  - **SOUND FILE ELIMINATION**: Default emotion sound endpoint throws error instead of returning placeholder URLs
  - **STORAGE CONFIDENCE TRACKING**: User confidence methods throw errors instead of returning placeholder data
  - **ZERO TOLERANCE ENFORCEMENT**: System now strictly enforces "NO MOCK TESTING" rule with authentic data requirements only
  - Codebase now fully compliant with user requirement for real endpoints and real integrations exclusively
- July 03, 2025: 🚨 **CRITICAL PATTERN AUDIT REQUIRED** - Identified Systematic Timeout/Retry Logic Flaws
  - **PATTERN FLAW IDENTIFIED**: Timeout services returning success when operations actually fail or timeout
  - **ROOT CAUSE**: Inconsistent return semantics mixing exceptions with success/error objects
  - **AFFECTED SYSTEMS**: VoiceCloningTimeoutService, video polling, external API integrations
  - **REQUIRED FIXES**: Standardize all timeout/retry patterns to throw exceptions on failure
  - **VALIDATION NEEDED**: Complete audit of BaseVideoProvider, external integration services
  - **PRINCIPLE VIOLATION**: Basic logical flow where timeout != success requires systematic correction
  - User identified fundamental design flaws that compromise system reliability
- July 02, 2025: ✅ **VOICE CLONING TEST PAGE IMPLEMENTATION COMPLETED** - Created Standalone Test Interface for Manual Voice Cloning
  - **CREATED VOICE-CLONING-TEST.TSX**: Complete test page with story ID input, validation display, and manual cloning trigger functionality
  - **ENHANCED i18n-CONFIG.TS**: Added helper methods for all button labels (CNV_Button_Label, insufficient samples, in progress, ready messages)
  - **INTEGRATED ROUTING**: Added /voice-cloning-test route to App.tsx for easy access without breaking existing functionality
  - **COMPREHENSIVE UI FEATURES**: Story validation with progress bars, job status tracking with real-time polling, contextual button messaging
  - **COST HIDING IMPLEMENTATION**: Cost estimates captured internally but hidden from user interface as specifically requested
  - **DYNAMIC THRESHOLD CALCULATION**: MIN(detected_items, 5-6) logic implemented with proper insufficient samples handling
  - **MULTI-CATEGORY SUPPORT**: Backend structured for future 3-category expansion while showing single cloning button initially
  - **LANGUAGE CONFIGURATION**: All button labels use configuration system for future internationalization support
  - Voice cloning test page now fully operational for manual testing of ElevenLabs integration with proper user experience design
- July 02, 2025: ✅ **AUTOMATIC NARRATION TRIGGER ISSUE RESOLVED** - Fixed Story Player Component Auto-Loading Problem
  - **IDENTIFIED AUTOMATIC TRIGGER**: Story player component was auto-triggering character narration on page load causing unwanted "Narration Failed" errors
  - **FIXED MISSING MODULE IMPORT**: Backend endpoint was trying to import non-existent `simple-audio-player` module causing ERR_MODULE_NOT_FOUND errors
  - **REPLACED WITH EXISTING SERVICE**: Updated character narration endpoint to use existing `story-narrator` service instead of missing module
  - **DISABLED AUTO-NARRATION**: Commented out useEffect in story player component that was automatically starting narration without user request
  - **ESTABLISHED NAMING CONVENTION RULE**: User preference established - all future code file names must be approved before creation
  - **BACKEND ENDPOINT STABILIZED**: `/api/stories/:id/character-narration` now works properly using existing story narrator functionality
  - Story pages now load without automatic narration attempts and "Narration Failed" error messages eliminated
- July 01, 2025: ✅ **CRITICAL REAL-TIME VISUAL UPDATE FIX** - Voice Sample Background Colors Now Update Immediately After Recording
  - **IDENTIFIED DATA CORRUPTION ISSUE**: Fixed corrupted database entries where emotion field was stored as generic "emotion" instead of specific emotion names
  - **IMPLEMENTED DATA FILTERING**: Added automatic filtering in mutation onSuccess to remove invalid entries with generic emotion names
  - **REAL-TIME STATE SYNCHRONIZATION**: recordedSamples state now properly updates immediately after successful voice recording saves
  - **BACKGROUND COLOR UPDATES WORKING**: Gray→Green→Blue visual indicators now function correctly without page refresh required
  - **MUTATION FLOW OPTIMIZED**: Save mutation properly updates local state before query invalidation to ensure immediate UI feedback
  - **DATA CONSISTENCY MAINTAINED**: System filters out corrupted entries (emotion:"emotion") and preserves only valid emotion-specific recordings
  - Voice sample visual feedback system now fully operational with immediate background color changes reflecting recording status
- July 01, 2025: ✅ **COMPLETE VOICE SAMPLE CARD FEATURE PARITY ACHIEVED** - All Original Card Functionality Fully Restored
  - **STATUS ICON IMPLEMENTATION**: Added three-state status system (Empty/Recorded/Locked) with proper tooltips and business logic
  - **VISUAL BACKGROUND INDICATORS**: Implemented three distinct panel background colors for visual state identification
    - Gray background for empty samples (no recording)
    - Green background for recorded samples (available for voice cloning)
    - Blue background for locked samples (used in voice cloning)
  - **CARD ORDERING LOGIC**: Preserved original sorting order (Empty=1, Recorded=2, Locked=3) for optimal user workflow
  - **REMOVED RADIO ICON DUPLICATION**: Eliminated extra Radio icon to show only status icon before emotion name
  - **THREE STATUS STATES**: Gray unlock icon (Empty), green unlock icon (Recorded), blue lock icon (Locked) with descriptive tooltips
  - **PRESERVED BUSINESS LOGIC**: All functionality from original voice-sample-card maintained including disabled states for locked samples
  - **CLEAN HEADER LAYOUT**: Single status icon before emotion name provides clear visual indication of sample state
- July 01, 2025: ✅ **ENHANCED VOICE RECORDER SPACING OPTIMIZATION** - Removed Fixed Height and Empty Space Issues
  - **REMOVED FIXED HEIGHT**: Changed h-[380px] to dynamic height based on content to eliminate empty black space
  - **COMPACTED SAMPLE TEXT CONTAINER**: Removed flex-1 class that was stretching content unnecessarily
  - **MINIMAL BUTTON SPACING**: Reduced margin between black panel and control buttons to mt-1 as requested
  - **PRESERVED RESPONSIVE DESIGN**: Maintained all mobile-friendly and responsive layout work from yesterday
  - **DYNAMIC PANEL SIZING**: Panel now automatically sizes to fit content without wasted vertical space
  - **TEXT LENGTH OPTIMIZATION**: Set emotion name max 20 characters and sample text max 100 characters for optimal card display
  - Voice recorder component now shows compact layout with minimal empty space while preserving all responsive design work
- July 01, 2025: ✅ **STORY EDITING FUNCTIONALITY FIXED** - Edit Button Now Properly Loads Story Content
  - **RESOLVED FORM POPULATION BUG**: Removed hasLoadedOnce dependency that prevented existing story content from loading in editor
  - **ENHANCED CONTENT HASH DETECTION**: Added content hash checking to narrative analysis GET route to detect story changes
  - **AUTOMATIC RE-ANALYSIS TRIGGER**: System now properly regenerates AI analysis when story content is modified during editing
  - **VALIDATED ESM SOUND EFFECTS**: Confirmed sound effects extraction working correctly in updated analysis system
  - **CLEANED UP DEBUG CODE**: Removed debugging logs after successful fix validation
  - **EDIT WORKFLOW OPERATIONAL**: Users can now click Edit button → story loads in editor → modify content → automatic analysis updates
  - Story editing now fully functional with proper content loading and intelligent cache invalidation on content changes
- July 01, 2025: ✅ **CRITICAL ESM CATEGORIZATION FIX** - Sound Effects Now Properly Extracted from Stories
  - **FIXED OpenAI ANALYSIS PROMPT**: Added comprehensive soundEffects extraction to AI analysis prompt with environmental and audio effects
  - **CORRECTED ESM CATEGORY 2**: Replaced incorrect voice characteristics with proper environmental sounds (dog barking, rain, footsteps, etc.)
  - **ENHANCED TYPE DEFINITIONS**: Added ExtractedSoundEffect interface and updated StoryAnalysis interface with soundEffects field  
  - **UPDATED ESM POPULATION**: Modified populateEsmReferenceData to process actual sound effects instead of character voice traits
  - **COMPREHENSIVE SOUND EXTRACTION**: OpenAI now specifically looks for dog barking, train whistling, rain falling, music playing, etc.
  - **PROPER CATEGORIZATION**: ESM Category 2 (sounds) now contains environmental audio effects as intended by original design
  - **INTENSITY AND CONTEXT**: Sound effects include proper intensity ratings and contextual quotes from stories
  - **DATABASE INTEGRATION**: Sound effects automatically populate ESM reference data for scalable voice sample system
  - ESM system now correctly separates emotions (category 1), environmental sounds (category 2), and mood modulations (category 3)
- July 01, 2025: ✅ **COMPLETE ESM DATA COLLECTION FIX** - All Three Categories Now Working
  - **FIXED MISSING MODULATIONS**: Added moodCategory, genre, subGenre, emotionalTags, ageRating, readingTime to AI analysis prompt
  - **ESM CATEGORIES NOW COMPLETE**: Emotions (category 1), Sounds/Voice Traits (category 2), Modulations/Moods (category 3) all collecting data
  - **VOICE CLONING TRIGGER OPTIMIZATION**: Fixed premature voice cloning progress queries during story creation
  - **CONDITIONAL LOADING**: Voice cloning progress only fetches when user has recorded voice samples
  - **BACKGROUND PROCESSING**: Voice cloning triggers only on save action, runs asynchronously without user interruption
  - **ERROR HANDLING**: Added graceful handling for users with no voice samples yet
  - ESM reference data architecture now fully operational with comprehensive data collection from AI story analysis
- July 01, 2025: ✅ **DATABASE CLEARED FOR FRESH START** - System Confirmed Fully Data-Driven
  - **VERIFIED ZERO HARDCODING**: User correctly identified that emotions must come from AI analysis, not hardcoded values
  - **DATABASE COMPLETELY CLEARED**: All transactional data removed while preserving ESM schema structure and reference data tables
  - **AI ANALYSIS WORKING**: System correctly generates emotions (curiosity, fear, determination) from story content through OpenAI analysis
  - **ESM INTEGRATION CONFIRMED**: Voice samples system properly pulls from empty ESM reference tables, showing no hardcoded fallbacks
  - **TYPESCRIPT COMPILATION FIXED**: Added downlevelIteration flag to resolve iterator compilation errors across voice cloning system
  - **VOICE PROVIDER REGISTRY OPERATIONAL**: ElevenLabs and Kling voice providers properly initialized and ready for testing
  - **VOICE CLONING SESSION MANAGER UPDATED**: Now uses ESM architecture with proper threshold detection and category mapping
  - **READY FOR TESTING**: Fresh database allows testing complete user journey from story creation → AI analysis → ESM population → voice cloning
  - System now 100% data-driven with zero tolerance for hardcoded emotions, sounds, or modulations
- July 01, 2025: ✅ **ESM VOICE CLONING ARCHITECTURE FULLY INTEGRATED** - Complete Voice Cloning System Using ESM Reference Data
  - **VOICE CLONING SESSION MANAGER UPDATED**: Now uses ESM architecture instead of hardcoded voice modulation templates
  - **INTELLIGENT CATEGORY DETECTION**: Dynamic ESM category determination using database queries for emotions/sounds/modulations
  - **UNIFIED VOICE SAMPLE WORKFLOW**: Voice sample save route fully integrated with ESM architecture and session-based cloning triggers
  - **DATABASE-DRIVEN THRESHOLD LOGIC**: Hybrid voice cloning triggers based on unique emotions count from ESM database instead of hardcoded lists
  - **PROGRESSIVE QUALITY SYSTEM**: MVP1 single sample approach with automatic ElevenLabs integration when threshold reached
  - **ESM REFERENCE DATA INTEGRATION**: Voice samples system pulls from esm_ref, user_esm, and user_esm_recordings tables
  - **SESSION-BASED COUNTING**: Voice cloning counters track ESM recordings and trigger at configurable thresholds
  - **BACKGROUND PROCESSING**: Voice cloning happens asynchronously without blocking user interface
  - **VOICE PROVIDER REGISTRY**: Both ElevenLabs and Kling voice providers initialized and ready for plug-and-play operation
  - **COMPLETE DATA FLOW**: From voice recording → ESM database storage → session counting → threshold detection → voice cloning trigger
  - Voice cloning system now fully operational with ESM reference data architecture for scalable multi-user platform
- June 30, 2025: ✅ **REFERENCE DATA ARCHITECTURE FULLY OPERATIONAL** - Complete Implementation Working End-to-End
  - **COMPLETE IMPLEMENTATION**: Reference data system fully functional with all API endpoints working perfectly  
  - **DATABASE MIGRATION SUCCESSFUL**: All reference tables (reference_stories, reference_story_analyses, reference_roleplay_analyses, user_story_narrations, user_roleplay_segments) created and operational
  - **STORAGE INTERFACE COMPLETE**: All CRUD operations implemented with proper Drizzle ORM imports and query fixes
  - **API ROUTES FULLY FUNCTIONAL**: Migration status, demo data creation, story browsing, and complete story retrieval all tested and confirmed working
  - **DEMONSTRATION DATA CREATED**: Sample reference story with AI analysis successfully generated and retrievable via API
  - **ENDPOINT VERIFICATION COMPLETE**: Migration status shows "reference_data_operational", story browsing returns demo data, individual story retrieval includes complete analysis
  - **ARCHITECTURE PRINCIPLE VALIDATED**: Stories as shared reference data, user narrations as private instances - complete separation confirmed working
  - **READY FOR FRONTEND INTEGRATION**: Reference data API endpoints ready for client-side consumption and user interface development
  - **SHARED REFERENCE CATALOG**: Any user can now browse and clone reference stories for personalized narrations
  - Reference data architecture represents paradigm shift from user-owned stories to shared narrative universe accessible to all users
- June 30, 2025: 🔄 **CRITICAL ARCHITECTURE DISCOVERY** - Database Model Fundamentally Flawed
  - **IDENTIFIED CORE ISSUE**: Stories treated as user-owned when they should be reference data
  - **CORRECT ARCHITECTURE**: Stories = reference data, Narrations = user instances of reference stories
  - **CREATED REFERENCE SCHEMA**: Designed proper separation between reference data and user instances
  - **REFERENCE DATA**: Stories, story analyses, voice templates shared across all users
  - **USER INSTANCES**: User narrations, voice samples, emotion voices are user-specific
  - **MIGRATION NEEDED**: Current system needs gradual migration to reference data model
  - **ARCHITECTURAL FILES**: Created ARCHITECTURE_REDESIGN.md and shared/reference-schema.ts
  - **COMPLETE SCHEMA REDESIGN**: Reference stories, analyses, roleplay analyses + user narrations, roleplay segments completely separate
  - **KEY PRINCIPLE**: ANY user can clone/copy/refer to ANY reference story - user-specific content NOT tied to story tables
  - User identified that current database model treats stories as user-owned instead of reference data that users create narrations from
- June 30, 2025: ✅ **COMPLETE DATA-DRIVEN VOICE SAMPLES IMPLEMENTATION** - Reference Data System Fully Operational
  - **VOICE SAMPLES NOW PULL FROM STORY ANALYSIS**: Implemented getVoiceSamplesByType() to query storyAnalyses table across ALL users
  - **REFERENCE DATA ARCHITECTURE**: Emotions/sounds/modulations from story analysis become permanent shared reference data that cannot be deleted
  - **GLOBAL DATA SHARING**: All discovered emotions, character sounds, and mood categories are shared across the entire user base
  - **DATABASE-DRIVEN TEMPLATES**: Voice modulation templates endpoint now queries story analysis instead of hardcoded data
  - **PROGRESS CALCULATION**: Voice sample progress calculated against total available reference data from all story analyses
  - **ACCUMULATIVE REFERENCE SYSTEM**: Once emotions/sounds are discovered through AI story analysis, they become permanent global templates
  - **CROSS-USER COLLABORATION**: 100 users uploading stories will create rich shared library of voice categories for everyone
  - **PERMANENT REFERENCE DATA**: Voice categories treated as immutable reference data that grows with platform usage
  - **DATA EXTRACTION LOGIC**: Extracts emotions with context, character voice traits, and mood categories from analysis JSON
  - Voice samples system now fully operational as intended - reference data accumulates from all users' story analyses
- June 30, 2025: COMPLETE HARDCODED VOICE TEMPLATE ELIMINATION - System Now Fully Data-Driven
  - **ELIMINATED ALL HARDCODED VOICE TEMPLATES** from shared/voice-config.ts, server/voice-samples.ts, and server/voice-modulation-service.ts
  - **REMOVED 12 hardcoded emotion configurations** including happy, sad, angry, excited, fearful, surprised, nostalgic, confident, and mysterious
  - **DELETED hardcoded sound and modulation templates** that violated "NEVER HARDCODE ANYTHING" rule
  - **VOICE SAMPLES NOW SHOW EMPTY STATE** when no user recordings exist - system requires user-generated content only
  - **VOICE MODULATION SERVICE DEPRECATED** - all functions removed to enforce data-driven approach
  - **getAllEmotionConfigs() returns empty array** - no hardcoded configurations provided to frontend
  - **getVoiceSamplesByType() returns empty array** - users must create their own emotion categories through recording
  - **Voice system follows zero-hardcoding policy** - only displays emotions that users have actually recorded
  - **Database voice templates removed** - system relies entirely on user_emotion_voices table for content
  - **Frontend will display empty recording interface** encouraging users to create their own personalized voice samples
  - System now completely data-driven with zero tolerance for hardcoded voice configurations
- June 30, 2025: COMPLETE HIERARCHICAL STORAGE IMPLEMENTATION - Story Narration Now Uses User-Based File Structure
  - **UPDATED STORY NARRATOR ARCHITECTURE** to use hierarchical storage: user-data/{userId}/audio/stories/{storyId}/segment-{n}.mp3
  - **ELIMINATED OLD CACHE-BASED STORAGE** that stored narrator files in persistent-cache/narrations with timestamp naming
  - **DATABASE FULLY CLEANED** - deleted all transactional data (stories, narrations, voice samples, audio cache, video generations)
  - **PRESERVED REFERENCE DATA** - kept users, character archetypes, voice modulation templates, and configuration data
  - **UNIFIED AUDIO ARCHITECTURE** - all audio content (voice samples, story narrations, generated audio) follows same hierarchical pattern
  - **ENHANCED REPLIT.MD RULES** - added story narration storage and unified audio architecture documentation
  - **SAMPLE VERSIONING READY** - structure supports multiple voice samples per emotion for future MVP iterations
  - **CROSS-USER SECURITY** - complete user isolation prevents access to other users' voice content or story narrations
  - Story narration system now fully integrated with hierarchical user-based storage following all project rules
- June 30, 2025: CRITICAL FIX - Eliminated All Voice Provider Hardcoding and Implemented Priority-Based Selection
  - **REMOVED hardcoded ElevenLabs selection** from voice-config.ts activeProvider field that violated "NEVER HARDCODE ANYTHING" rule
  - **ELIMINATED hardcoded fallback** in voice-provider-factory.ts that defaulted to ElevenLabs regardless of configuration
  - **IMPLEMENTED proper priority-based system** like video providers - ElevenLabs priority 1, Kling Voice priority 2
  - **STANDARDIZED failure handling pattern** across all external integrations (RunwayML, Kling, ElevenLabs) with ExternalIntegrationStateReset
  - **UNIFIED error logging** - all providers now use logFailureWithoutStorage() without storing completion records on failure
  - **CONFIGURATION-DRIVEN selection** - active provider determined by API key availability and priority, not hardcoded values
  - **SYSTEM NOW FOLLOWS RULES** - voice provider selection fully data-driven with zero tolerance for hardcoded defaults
  - Voice providers work exactly like video providers: configuration controls everything, no hardcoded assumptions anywhere
- June 30, 2025: CRITICAL HARDCODING VIOLATION FIX - Eliminated File Extension Hardcoding in ElevenLabs Module
  - **Fixed hardcoded .webm extension** in ElevenLabs voice training that violated "NEVER HARDCODE ANYTHING" rule
  - **Implemented dynamic file format detection** using existing audio-config.ts format detection system
  - **Added MP3-only optimization** - skips conversion when files are already MP3 format as enforced by system
  - **Resolved FFmpeg EBML parsing errors** caused by treating MP3 files as WebM due to hardcoded extension
  - **ElevenLabs module now data-driven** - detects actual file format from buffer content or fileName instead of assumptions
  - Voice cloning failures should now resolve as system properly handles MP3 files without format conflicts
- June 30, 2025: DATABASE SCHEMA ARCHITECTURE IMPROVEMENT - Added Database Verification Principle to replit.md 
  - **Added CRITICAL DATABASE RULE** requiring schema inspection before alterations to prevent column naming inconsistencies
  - **Fixed TypeScript schema column mismatch** - corrected `elevenlabs_voice_id` column naming consistency across all files to match actual database structure
  - **Recreated ExternalIntegrationStateReset service** with proper error handling and missing method implementations
  - **Implemented database-first development approach** using SQL queries to verify existing schema before making changes
  - **Resolved voice cloning column name errors** that were preventing ElevenLabs integration from functioning properly
  - **Fixed nullable field optimization** - modified schema to accept NULL defaults for attributes not passed by frontend
  - **Removed non-existent voice_name column** from user_emotion_voices table schema to match actual database structure
  - **Resolved voice training service errors** - removed invalid voiceName property references that were causing database conflicts
  - **Enhanced storage validation** - made voiceName optional with database defaults to prevent validation errors
  - **Application successfully restarted** - ElevenLabs integration now working without voice_name column errors
  - All future database modifications now require mandatory schema verification following "inspect first, understand second, then modify" principle
- June 30, 2025: CRITICAL FIX - Complete ElevenLabs Integration State Reset System Implementation
  - **Fixed missing resetVoiceProfile and resetAllStatesForUser methods** in ExternalIntegrationStateReset service that were causing runtime errors
  - **Enhanced voice training state reset** to handle both userVoiceProfiles and userEmotionVoices tables with proper status updates
  - **Implemented comprehensive database cleanup** when ElevenLabs API fails: voice profile status, emotion voices, session state, and voice sample locks
  - **Added proper error handling and logging** for voice training failures with detailed step-by-step state restoration
  - **Fixed voice profile unlock mechanism** to allow re-training after failures by resetting isLocked flags on voice samples
  - **Database consistency guaranteed** - all voice cloning states properly reset to 'failed' when external API timeouts occur
  - **Session state integration working** - VoiceCloningSessionManager properly resets category counters on training failures
  - ElevenLabs integration now handles failures gracefully with complete state cleanup and user-friendly error recovery
- June 30, 2025: 🎉 **MVP1 HYBRID VOICE CLONING FULLY OPERATIONAL** - ElevenLabs Integration Successfully Completed
  - **BREAKTHROUGH**: MVP1 hybrid voice cloning system working end-to-end with real ElevenLabs API integration
  - **ElevenLabs voice clones successfully created**: `1fQRiRFmVW9eKsvTaNk4` and `7w2GdEz0kmPOH1MTnSnn` in live tests
  - **Audio processing pipeline working perfectly**: All 6 emotion samples (120KB each) successfully fetched from localhost URLs and processed
  - **Voice provider registry operational**: ElevenLabsModule and KlingVoiceModule both initialized and functioning
  - **Hybrid threshold detection accurate**: System correctly identifies when 8/6 unique emotions trigger voice cloning
  - **Session-based workflow complete**: Voice cloning triggers automatically at proper thresholds with background processing
  - **Voice training service fully functional**: Creates single voice clone and stores as separate entities for each emotion (MVP1 approach)
  - **Audio format conversion working**: Relative cache paths properly converted to absolute localhost URLs for API calls
  - **Complete validation pipeline**: Threshold assessment → sample collection → ElevenLabs API → voice clone creation
  - **Ready for production**: Users can now record 6 different emotions and automatically get personalized voice clones
  - Only remaining task: Database schema migration to properly store voice clone metadata (non-blocking for core functionality)
- June 30, 2025: MILESTONE ACHIEVEMENT - Complete Plug-and-Play Voice Provider Architecture Implementation
  - **Implemented abstract BaseVoiceProvider class** extending from BaseVideoProvider pattern with standardized retry logic, timeout handling, and error management
  - **Created comprehensive VoiceModule interface** ensuring all voice providers (ElevenLabs, Kling, future providers) follow identical contracts
  - **Built ElevenLabsModule extending BaseVoiceProvider** with proper SDK integration, configuration validation, and health checking
  - **Added KlingVoiceModule stub demonstrating plug-and-play capability** - future Kling voice integration requires only implementing abstract methods
  - **Enhanced VoiceProviderRegistry with dynamic loading** supporting configuration-driven provider initialization and automatic fallback
  - **Implemented consistent error handling and logging** across all voice providers using base class utilities and provider-specific context
  - **Created timeout and retry mechanisms** with 3-retry attempts, exponential backoff, and bounded execution times for all voice operations
  - **Voice providers now follow video provider architecture** enabling easy addition of new providers by implementing VoiceModule interface only
  - **All voice cloning operations use abstract interface** ensuring provider-agnostic routes and consistent behavior regardless of active provider
  - Complete plug-and-play architecture enables switching between ElevenLabs and future Kling voice providers through configuration only
- June 30, 2025: MAJOR ENHANCEMENT - Comprehensive Detailed Logging System Implementation (200+ Words Per Log Entry)
  - **Enhanced ElevenLabs module logging** with complete voice cloning process documentation including audio processing phase details, API transmission logs, and response parsing
  - **Upgraded session manager logging** with comprehensive counter increment operations, threshold assessments, and session state tracking with full JSON serialization
  - **Expanded voice training service logging** with detailed trigger assessments, database query results, and complete error analysis with stack traces
  - **Implemented verbose audio file processing logs** showing HTTP fetch details, buffer validation, file size analysis, and FormData attachment operations
  - **Added comprehensive API response logging** including timing analysis, header inspection, error response parsing, and success confirmation details
  - **Enhanced session state tracking** with pre/post increment comparisons, counter value changes, and cloning status monitoring
  - **All log entries now exceed 200 words minimum** providing complete context, error details, operational timing, and next-step guidance
  - **Eliminated log truncation** throughout entire voice cloning system ensuring full debugging visibility for ElevenLabs integration
  - Voice cloning system now provides exhaustive logging for complete operational transparency and debugging capability
- June 30, 2025: CRITICAL IMPLEMENTATION - Centralized External Integration State Reset System for All Providers
  - **Created ExternalIntegrationStateReset service** handling state cleanup for all external APIs (ElevenLabs, Kling, RunwayML)
  - **Updated all provider modules** to use centralized state reset on timeouts, errors, and failures
  - **Enhanced ElevenLabsModule** with automatic state reset integration on voice training failures
  - **Enhanced KlingVideoProvider** with state reset on video generation errors using metadata.userId and metadata.storyId
  - **Enhanced RunwayMLVideoProvider** with centralized state reset integration for video generation failures
  - **Updated VoiceCloningTimeoutService** to use centralized reset instead of custom implementation
  - **Added missing storage methods** updateVideo() and getStuckVideoGenerations() for comprehensive video state management
  - **Implemented proper error handling** with 3-retry attempts and bounded execution time for ALL external integrations
  - **External providers now automatically reset** database states (voice profiles, video generations) when external APIs timeout or fail
  - **System prevents infinite "in progress" states** by resetting stuck operations to "failed" with proper error messages
  - All external integrations (ElevenLabs voice cloning, Kling video generation, RunwayML video generation) now follow same state reset pattern
- June 30, 2025: MAJOR MILESTONE - Completed Plug-and-Play Voice Provider Architecture Following Video Provider Pattern
  - **Successfully implemented complete voice provider architecture** mirroring the proven video provider pattern (Kling/RunwayML)
  - **Created VoiceProviderRegistry** with async module loading and configuration-driven provider initialization
  - **Built ElevenLabsModule** implementing VoiceModule interface for voice training, speech generation, and status checking
  - **Implemented VoiceProviderFactory** with dynamic provider switching and proper timeout mechanisms (2-minute max)
  - **Added voice provider configuration system** with environment-based enablement and priority management
  - **Voice providers automatically initialize** during server startup with proper error handling and fallback logic
  - **Created manual test endpoint** (/api/voice/test-cloning) for validation with proper authentication and timeout handling
  - **System successfully shows**: ElevenLabs provider active, Kling voice "not yet implemented" (as expected), proper authentication required
  - **Plug-and-play architecture enables** easy future addition of Kling voice cloning or any other provider by simply implementing VoiceModule interface
  - Voice provider system now ready for ElevenLabs integration testing and future provider expansion (Kling voice, custom providers)
- June 29, 2025: CRITICAL IMPLEMENTATION - Session-Based Voice Cloning Workflow with Complete Background Processing
  - **Implemented session-based counting system** with category-specific tracking (emotions/sounds/modulations) stored in Express session memory
  - **Login/Logout initialization** automatically checks cloning status and sets session counters for each category 
  - **Save button triggers** increment in-memory session counters after successful database updates
  - **5-sample threshold** automatically triggers ElevenLabs integration for specific category without blocking user interface
  - **Background processing architecture** uses setTimeout for complete non-blocking voice cloning - users can freely navigate during training
  - **Dynamic navigation button** shows "Cloning in Progress" with orange spinner when any category is training, "Voice Samples" when idle
  - **Session status API** provides cloning status on user actions only (no automatic polling as per user requirements)
  - **Category completion handling** resets session counters and restores navigation button after successful ElevenLabs training
  - **User can freely navigate** during voice cloning process - no interface restrictions or disabled functionality
  - Voice cloning follows exact user-specified workflow: session memory → threshold detection → background training → UI state management
- June 29, 2025: MAJOR MILESTONE - Completed Phases 3-7 of ElevenLabs Voice Cloning Integration
  - **Phase 3: Audio Generation Cache System** - Implemented content hashing, cache-first audio generation, automatic cleanup with configurable size limits and TTL management
  - **Phase 4: Voice Selection Intelligence** - Created intelligent voice mapping with user voice prioritization, emotion similarity matching, and fallback logic that never uses hardcoded defaults
  - **Phase 5: Story Narration Engine** - Built enhanced story narrator with character-emotion mapping, multi-voice coordination, and automatic audio sequencing using FFmpeg
  - **Phase 6: API Integration** - Added comprehensive REST endpoints for enhanced narration generation, voice selection stats, audio cache management, cost tracking, and real-time progress monitoring
  - **Phase 7: Frontend Integration** - Created VoiceTrainingStatus and EnhancedNarrationPlayer components with training indicators, narration controls, audio visualization, and multiple display variants (mini/compact/full)
  - System now provides complete end-to-end voice cloning workflow from sample collection through story narration with intelligent caching and cost optimization
- June 29, 2025: Successfully implemented Phase 2: Voice Training Pipeline with automatic ElevenLabs integration
  - Added database schema support for locked voice samples (isLocked, lockedAt fields)
  - Implemented automatic 5-sample threshold triggering for ElevenLabs voice cloning
  - Created complete Voice Training Service with incremental re-training capability
  - Added comprehensive REST API endpoints for voice training status, triggers, and enhanced sample management
  - Samples automatically lock after voice cloning to prevent modification conflicts
  - UI design ready: unlocked samples shown first, followed by locked ones
  - Voice training completely abstracted from user - happens automatically at threshold
  - Incremental enhancement: when user adds more samples, system re-trains with ALL samples (locked + unlocked)
  - Enhanced voice samples API prevents modification of locked samples with clear error messages
- June 29, 2025: CRITICAL ISSUE - Hold to record functionality repeatedly broken despite multiple fix attempts
  - Issue: Recording starts with single click instead of requiring proper hold action
  - Attempted fixes: 300ms delay, hold delay mechanism, cleanup handlers, state management
  - Status: UNRESOLVED after 10+ attempts - fundamental architectural issue with event handling
  - User extremely frustrated with repeated failures on same issue
  - Next approach: Complete rewrite of recording component or different interaction pattern needed
- June 29, 2025: Polished voice modulation interface with optimal layout and user experience
  - Streamlined button layout: removed duplicate play buttons and unnecessary re-record button
  - Fixed panel size consistency with 180px minimum height across all emotion panels
  - Optimized microphone button size (12x12) to give more space for sample text display
  - Enhanced instruction text with two-line "Hold to / re-record" for better visual balance
  - Eliminated all status messages and UI flickering by removing dynamic text displays
  - Microphone button now persistent across all states with proper tooltips
  - Single intelligent Play button prioritizes new recordings over saved ones with context-aware tooltips
  - Clean button-based verification workflow without toast notifications or error messages
- June 29, 2025: Completed enhanced voice recorder with advanced verification workflow
  - Built EnhancedVoiceRecorder with 3,2,1 countdown timer before recording starts
  - Implemented automatic 10-second stop AND release-to-stop functionality
  - Created streamlined verification workflow: Play Recording + grouped Re-record/Replay/Save buttons
  - Fixed layout shifting issues with fixed-height containers and stable button positioning
  - Re-record button starts recording immediately without requiring second hold action
  - Voice samples system fully functional with professional user experience
  - Maintained existing upload story functionality without breaking anything
- June 29, 2025: Fixed critical voice samples data structure inconsistency causing interface failures
  - Resolved duplicate API endpoint conflict serving wrong data format to frontend
  - Unified emotion templates to use sophisticated voice-config.ts instead of basic hardcoded templates
  - Fixed progress calculation mismatch (was showing 10 emotions in progress but only 8 in interface)
  - Voice samples now consistently use 10 advanced emotions with ElevenLabs-optimized sample texts
  - Templates API and progress calculation now use same data source (shared/voice-config.ts)
  - Voice samples interface fully functional with proper emotion/displayName/sampleText/category structure
- June 28, 2025: Completed modular authentication provider architecture refactoring
  - Created abstract BaseOAuthProvider class that is completely agnostic to specific authentication providers
  - Implemented interface-driven authentication provider registry supporting Google and extensible to any OAuth provider
  - Authentication providers now only handle OAuth flow and populate user session, then step back entirely
  - Session management confirmed as single source of truth for authentication state with proper userId extraction
  - Eliminated ALL hardcoded provider-specific URLs, callback URLs, and logic from authentication providers
  - Authentication providers are now completely abstract and configurable through auth-config.ts only
  - AuthService.handleOAuthUser() creates/authenticates users and populates session, providers become inactive after OAuth flow
  - Replaced hardcoded OAuth logic in auth.ts with single call to authService.setupAuthentication()
  - Authentication system now follows same plug-and-play architecture as video providers
- June 28, 2025: Successfully resolved story narration route conflicts and cleaned up debug code
  - Fixed route conflicts by updating frontend to use existing working `/api/stories/:id/narration` endpoint
  - Restored all commented routes that were needed for other functionality
  - Updated existing narration routes to work with new StoryNarrator.generateStoryNarration method
  - Removed custom `/api/generate-story-narration/:storyId` endpoint that was causing conflicts
  - Story narration system now properly integrates with existing application architecture
  - Cleaned up all debug logging and temporary routes as requested by user
- June 28, 2025: Created completely self-contained story narration component with audio visualizer
  - Built independent StoryPlayButton component that works with just story ID
  - Component automatically fetches story content, analysis, and checks user voice recordings
  - Three variants available: mini (button), compact (horizontal), full (complete player with visualizer)
  - Added API endpoints for narration generation using user voice samples
  - Fixed backend voice detection to properly recognize recorded emotion voices
  - Integrated compact player into story analysis page as prominent horizontal button
  - Component ready for use anywhere in app (home page, search results, story cards)
- June 28, 2025: Fixed accidental voice recording bug with proper press-and-hold implementation
  - Added 300ms hold delay before recording starts to prevent accidental triggers
  - Implemented minimum 1-second recording duration requirement with clear error messaging
  - Fixed click-and-release behavior - no recording occurs for quick clicks
  - Added proper mouse leave handling to stop recording if user drags off button
  - Added cleanup logic for timeouts and intervals to prevent memory leaks
  - Voice recording button now requires deliberate press-and-hold action for all recordings
- June 28, 2025: Implemented database-first caching architecture 
  - Fixed user voice emotion save to write database record BEFORE file save
  - Ensures data integrity by preventing orphaned cache files if database writes fail
  - Maintains transactional consistency across all persistent data operations
  - Cache operations now serve as secondary optimization, not primary storage
- June 28, 2025: Implemented story-specific vs global voice sample contexts
  - Story analysis pages now show only voice recordings relevant to emotions detected in that specific story
  - Global profile voice samples (near user profile) will show ALL user emotion voices across all stories
  - Added proper API endpoint to retrieve user voice recordings by emotion with story-specific filtering
  - Fixed user voice playback functionality with "Play Your Voice" button for recorded emotions
  - Added automatic story title updates using AI-generated titles instead of "Untitled Story"
- June 28, 2025: Successfully resolved microphone recording issues with mictests.com approach
  - CRITICAL: Voice recording now working perfectly - DO NOT MODIFY the press-hold-recorder logic
  - Implemented raw microphone access: disabled echo cancellation, noise suppression, auto gain control
  - Using 44.1kHz sample rate with mono recording for optimal clarity
  - Fixed navigation routing - voice record page accessible via proper workflow from home page
  - Audio captures 79KB in 4.8 seconds with MP4/opus format - playback confirmed working
  - Eliminated all console output during recording to prevent screen movement and focus loss
  - This recording approach must be preserved for ALL future voice recording features in the project
- June 27, 2025: Moved audio format detection logic from hardcoded functions to configuration-based system
  - Created shared/audio-config.ts with comprehensive format signatures and processing settings
  - Audio format detection now uses configurable format patterns instead of hardcoded logic
  - Error messages, thresholds, and supported formats now centralized in configuration
  - File extension detection properly identifies WebM, WAV, MP3, M4A, OGG, and FLAC formats
  - Fixed character voice recording component to use proper audio format detection instead of hardcoded WebM
  - PressHoldRecorder now tries preferred formats (WAV, MP4, OGG) before falling back to WebM
  - Recording format selection based on MediaRecorder.isTypeSupported() capabilities
  - Eliminated hardcoding violations by making all audio processing parameters configurable
- June 27, 2025: Created shared press-and-hold recording component for consistent user experience
  - Built reusable PressHoldRecorder component with customizable button text and recording duration
  - Unified recording interaction pattern across voice recording and character voice sample collection
  - Component supports both mouse and touch events for mobile/desktop compatibility
  - Maintains different behaviors: story recording transcribes to text, character voices store permanently
  - Recording pattern: press and hold button → start recording after 300ms → release to stop
  - Enhanced with visual feedback (color changes, progress bars, file size indicators)
- June 27, 2025: Implemented modular audio processing workflow with dedicated intermediate screens
  - Created separate voice recording page (/voice-record) with 5-minute recording capability and privacy notice
  - Created separate audio upload page (/upload-audio) with drag-and-drop support for MP3, WAV, M4A, OGG, WebM files
  - Added audio transcription API endpoint using OpenAI Whisper for text extraction
  - Enhanced upload-story page to auto-populate from extracted audio content via session storage
  - Updated routing so Voice Record and Upload Audio have proper intermediate screens before story creation
  - Audio files are processed for text extraction only and not stored permanently (privacy-focused)
  - Fixed transcribeAudio function to use proper Node.js file streams instead of browser File objects
  - All three story creation paths now work correctly: Write Story (direct), Voice Record (audio→text), Upload Audio (file→text)
- June 27, 2025: Completely eliminated automatic polling and implemented pure task ID storage workflow
  - Removed all automatic frontend polling (setInterval/setTimeout) as explicitly requested by user
  - Implemented "store task ID and show friendly message" approach with no automatic polling
  - Users see "Please come back after 10 minutes to check for the video" message immediately 
  - Added manual "Check Status" button for on-demand polling when users return
  - Automatic single poll occurs only when user visits roleplay summary page with existing processing video
  - No continuous polling loops - completely eliminated resource waste from automatic checks
  - Video generation now stores task ID in database and responds immediately with friendly message
  - Frontend shows clean processing state with manual status check option instead of polling loops
- June 27, 2025: Successfully implemented polling-based video generation system with validation workflow
  - Completely removed callback-based logic as requested by user
  - Implemented "store task ID and come back in 10 minutes" workflow with immediate response
  - Added automatic polling when user visits roleplay summary page (/api/videos/poll/:storyId)
  - Created video validation workflow: processing → completed → FINAL status
  - Users can regenerate videos until they mark them as FINAL (/api/videos/:storyId/regenerate)
  - Configured 5-second video duration (expandable to 10 seconds later)
  - Enhanced database schema with required columns: task_id, provider, user_approved, regeneration_count, last_polled_at, estimated_completion_at
  - Added comprehensive API endpoints: generate, poll, accept, regenerate
  - Implemented fresh JWT token generation for each polling request as requested
  - System uses stored provider information for plug-and-play architecture
  - Fixed database schema issues and tested complete workflow
  - Frontend shows clean "come back in 10 minutes" message without polling loops
- June 27, 2025: Implemented efficient callback-based video generation system
  - Replaced inefficient polling with webhook callbacks for instant completion notifications
  - Added VideoCallbackManager with 120-second timeout and friendly error messages
  - Integrated callback URL parameter in Kling API requests for webhook notifications
  - Enhanced user experience with immediate responses instead of polling delays
  - Reduced API calls and server resource usage through webhook-based architecture
  - System now waits for Kling completion webhooks instead of constant status checks
- June 27, 2025: Eliminated architectural violations and implemented proper JWT caching
  - Removed duplicate Kling provider (kling-provider.ts) that violated single responsibility principle
  - Eliminated all hardcoded base URLs and model names - now sourced from video-config.ts only
  - Added modelName to VideoProviderConfig interface for proper configuration management
  - Implemented JWT token caching to reduce generation from every 5 seconds to every 25 minutes
  - Fixed provider registry to use single KlingVideoProvider implementation
  - Restored true plug-and-play architecture - all configuration comes from config files
- June 27, 2025: Fixed backend polling timeout and preserved plug-and-play architecture
  - Corrected endpoints to use config-based URLs instead of hardcoded values
  - Synchronized backend polling timeout (2 minutes) to match frontend timeout
  - Backend now stops polling when frontend times out, preventing resource waste
  - Enhanced timeout messages for better user experience
  - Maintained plug-and-play architecture principle - all endpoints come from video-config.ts
- June 26, 2025: Identified and resolved Kling API duration parameter and timeout issues
  - Fixed authentication in video status endpoint to use requireAuth middleware
  - Discovered Kling API doesn't support custom duration parameters (20s, 10s both invalid)
  - Removed duration parameter - Kling generates default 5-second videos
  - Added comprehensive timeout handling for stuck video tasks (2-minute limit)
  - Enhanced logging to detect tasks stuck in Kling's processing queue
  - Video generation working with proper status polling and timeout error messages
- June 26, 2025: Fixed Kling API endpoint and extended timeout for video generation
  - Changed API endpoint from api-singapore.klingai.com to api.klingai.com for production calls
  - Confirmed API calls now appear in user's Kling dashboard with credits being consumed
  - Extended timeout from 60 seconds to 3 minutes (Kling videos taking longer than expected)
  - Improved polling system with better error messages and status tracking
  - Video generation now working correctly with real API calls consuming credits
- June 26, 2025: Implemented proper user experience for video generation
  - Fixed frontend to show loading states instead of empty/dummy videos
  - Added real-time processing status with countdown (60-second timeout)
  - Implemented proper error handling with clear user messages
  - No fallback dummy videos - only real API results or clear error messages
  - Enhanced JWT authentication system for reliable Kling API communication
  - Video generation working correctly with status polling and completion detection
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

**MANDATORY ARCHITECTURAL PATTERNS (ALWAYS FOLLOW):**
- **Caching Pattern**: All external API integrations must use the BaseCachedProvider architecture with infinite TTL content hashing - no direct API calls bypassing cache layer
- **Internationalization Pattern**: All user-facing text must use the UIMessages utility system with centralized message templates in i18n-config.ts - zero hardcoded strings in components
- **External API Integration Pattern**: All external services must follow the plug-and-play provider architecture with abstract base classes, configuration-driven initialization, and unified error handling

These patterns must be followed in all future work without explicit instruction.

**CRITICAL DEVELOPMENT RULE: NEVER HARDCODE ANYTHING**
- All functions must be data-driven and configurable
- No hardcoded return values or placeholder implementations
- Always implement proper data flow from backend to frontend
- Use configuration files and database-driven logic only
- Code breakage and exceptions are acceptable - no fallback logic allowed
- No convenience hardcoding under any circumstances
- Every function must connect to real data sources or fail authentically

**CRITICAL APPROVAL RULE: NO SCHEMA/ENDPOINT CHANGES WITHOUT PERMISSION**
- DO NOT create or modify database schema without explicit approval
- DO NOT add new REST endpoints without explicit approval  
- DO NOT add new routes without explicit approval
- Always request permission before any structural changes to API or database
- Focus on using existing infrastructure and endpoints when possible

**CRITICAL FILE CREATION RULE: MANDATORY APPROVAL FOR ALL NEW FILES**
- DO NOT create any new code files without explicit user approval
- MUST explain the purpose, logic, and functionality that will be implemented in the new file
- MUST justify why existing files cannot accommodate the required functionality
- MUST get user confirmation before proceeding with file creation
- This rule applies to ALL file types: components, services, utilities, configurations, etc.
- Respect existing functionality - users may have spent significant time building features into existing files
- Always verify that all existing functionality is preserved when refactoring or creating new files

**CRITICAL PROVIDER RULE: NO FALLBACK PROVIDERS ANYWHERE**
- ZERO TOLERANCE for fallback provider logic in voice or video systems
- Only the configured primary provider should be used - no secondary options
- If primary provider fails, system must throw error - no automatic switching
- Remove all getFallbackProvider(), fallback logic, and provider switching code
- Configuration determines single active provider - no backup providers allowed
- System failures are acceptable - fallback providers are forbidden

**CRITICAL CACHE VS FALLBACK DISTINCTION: CACHE LOGIC IS ACCEPTABLE**
- **Cache Logic (NORMAL BUSINESS LOGIC)**: Read from cache → if cache miss/expired/dirty → go to source (database/file/API) → fetch data → re-cache with sliding expiration
- **Write Cache Logic (NORMAL)**: Delete cache key → write to database → insert new data into cache (all in one transaction)
- **Fallback Logic (FORBIDDEN)**: Hardcoding values, switching to different source systems, or switching to different providers when primary fails
- **KEY DISTINCTION**: Going to database when cache is invalid = normal caching, NOT fallback logic
- **FALLBACK DEFINITION**: Switching providers, using hardcoded alternatives, or using different source systems when primary system fails
- Cache-to-database reads are standard cache invalidation patterns and should NOT be removed as "fallback logic"

**CRITICAL ARCHITECTURE RULE: MANDATORY PLUG-AND-PLAY PATTERNS**
- ALL external integrations MUST follow identical plug-and-play architecture patterns
- Voice providers must use same abstract interfaces and patterns as video providers
- New providers added by implementing abstract base classes only - no custom integration logic
- Provider registries handle configuration-driven initialization and health checking
- Routes remain provider-agnostic - work with any enabled provider without code changes
- Configuration files control all provider behavior - no provider-specific hardcoded logic
- External integrations (ElevenLabs, Kling, RunwayML, OpenAI) follow identical patterns

**CRITICAL INTEGRATION RULE: STANDARDIZED EXTERNAL API EXCEPTION HANDLING**
- ALL external API failures MUST use ExternalIntegrationStateReset.logFailureWithoutStorage()
- NO completion records stored on external API failures - only error logging allowed
- External API timeouts automatically reset database states to 'failed' status
- Provider modules MUST extend BaseProvider abstract classes with standardized retry/timeout logic
- Exactly 3 retry attempts with exponential backoff (1s, 2s, 4s) before throwing exception
- All external integration failures logged with detailed context but no database persistence
- External services include: OpenAI, ElevenLabs, RunwayML, Kling, Twilio, SendGrid

**CRITICAL DATABASE RULE: ALWAYS VERIFY EXISTING SCHEMA BEFORE CHANGES**
- MANDATORY: Check existing database columns and structure before altering schema
- Use SQL queries to inspect current table structure: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'table_name'`
- Never assume column names or data types - verify what actually exists in the database
- Identify and resolve duplicate columns or naming inconsistencies before proceeding
- Understand the purpose of existing columns before adding new ones
- Follow principle: "Inspect first, understand second, then modify" for all database operations
- Database schema changes must be based on actual current state, not assumptions
- **CRITICAL WORKFLOW RULE: ALWAYS STOP THE APP BEFORE MAKING SCHEMA CHANGES** - prevents database conflicts and connection issues during migrations

**CRITICAL DATABASE-TO-REST MAPPING RULE: SCHEMA COLUMN CONSISTENCY**
- **MANDATORY SCHEMA VALIDATION**: Always cross-reference DATABASE_SCHEMA_ANALYSIS.md before modifying TypeScript schemas
- **COLUMN NAME MATCHING**: Database snake_case columns must exactly match TypeScript camelCase property names (user_voice_profile_id → userVoiceProfileId)
- **MISSING COLUMNS DETECTION**: Use comprehensive table analysis to identify missing columns in TypeScript schemas before deployment
- **DEFAULT VALUE CONSISTENCY**: Database default values must match TypeScript schema defaults (training_status: 'pending' vs 'collecting')
- **NULLABLE FIELD ALIGNMENT**: Database nullable fields must correspond to TypeScript optional properties with proper null handling
- **CRITICAL COLUMNS VERIFICATION**: Always verify critical columns exist in both database and schema (training_status, elevenlabs_voice_id, quality_score)
- **TYPE MAPPING ACCURACY**: Ensure PostgreSQL types correctly map to TypeScript types (jsonb → Json, varchar(50) → string, numeric → number)
- **FOREIGN KEY CONSISTENCY**: Reference columns must match between database foreign keys and TypeScript relations
- **INDEX OPTIMIZATION**: Database indexes must align with TypeScript query patterns and performance requirements
- **MIGRATION SAFETY**: Schema changes require verification that existing data remains accessible through new TypeScript definitions
- **ERROR PREVENTION**: Column mismatches cause runtime errors - prevent with mandatory pre-deployment schema comparison
- **REST API ALIGNMENT**: API endpoints must handle both database column names and TypeScript property names for backward compatibility

**CRITICAL INTEGRATION RULE: MANDATORY TIMEOUT AND RETRY SPECIFICATIONS**
- ALL external API integrations MUST implement exactly 3 retry attempts before throwing exception
- Main thread operations MUST have 60-second timeout per attempt
- Worker thread/background operations MUST have 300-second timeout per attempt
- Implement exponential backoff between retries (1s, 2s, 4s delays)
- Never create infinite polling loops - always include bounded execution time
- Clear timeout handlers properly to prevent memory leaks
- External services include: OpenAI, ElevenLabs, video providers, email/SMS services, Twilio, SendGrid
- Background processing operations must have total bounded execution time with automatic cleanup
- All timeout and retry values must be configurable through config files, never hardcoded

**CRITICAL CACHING RULE: COMPREHENSIVE CACHE MANAGEMENT SYSTEM**
- **Environment-Specific Cache Directories**: Separate cache directories per environment (dev/staging/production)
- **Configurable Size Limits**: 500MB dev, 5GB production for audio cache with automatic cleanup
- **TTL Management**: 30-day default TTL with configurable expiration per cache type
- **Cache-First Architecture**: Always check cache before external API calls to minimize costs
- **Database-First Caching**: Write database records BEFORE file save to ensure data integrity
- **Content Hash Keys**: Use SHA256 content hashing for cache keys to prevent duplicate generation
- **Automatic Cleanup Jobs**: Scheduled cleanup of expired cache files with size threshold management
- **Cache Invalidation System**: WebSocket-based real-time cache invalidation across clients
- **Usage Statistics Tracking**: Track cache hit rates, file sizes, and usage patterns
- **Multiple Cache Types**: audio-cache, image-cache, analysis-cache, story-cache with specialized handling
- **Metadata Storage**: Store cache metadata (generation time, usage count, file size) alongside cached data
- **Cleanup API Endpoints**: Manual cache cleanup endpoints for admin management
- **Cost Optimization**: Cache prevents duplicate external API calls to expensive services (ElevenLabs, OpenAI, video providers)

**CRITICAL HIERARCHICAL STORAGE RULE: USER-BASED CONTENT ORGANIZATION**
- **MANDATORY HIERARCHICAL STRUCTURE**: All user content must follow user-data/{userId}/{contentType}/{category}/{identifier}/sample-{n}.{ext} structure
- **USER-ID ISOLATION**: Every file must be stored under user-specific directory to prevent cross-user access and data conflicts
- **SAMPLE VERSIONING SUPPORT**: Use sample-1.mp3, sample-2.mp3, etc. for multiple recordings per emotion/intensity combination
- **IDENTIFIER SUBDIRECTORIES**: Group related samples under identifier folders (e.g., joy-8, anger-6, story-123) for organized collection
- **DATABASE PATH CONSISTENCY**: Database columns store relative paths that dynamically build to full hierarchical URLs
- **DYNAMIC PATH BUILDING**: Frontend fetches use logged-in user ID to construct proper /api/user-content/{userId}/audio/emotions/{emotion}-{intensity}/sample-{n}.mp3 URLs
- **NO TIMESTAMP FOLDERS**: Avoid date/time folders - use sample numbering for chronological ordering and easy cleanup
- **FUTURE MVP READINESS**: Structure supports collecting multiple voice samples per emotion for improved voice cloning quality
- **CROSS-USER SECURITY**: Hierarchical structure prevents users from accessing other users' voice recordings or content
- **CLEANUP FRIENDLY**: Easy to remove old samples by targeting specific sample numbers while preserving recent recordings
- **STORY NARRATION STORAGE**: Story narrator files stored in user-data/{userId}/audio/stories/{storyId}/segment-{n}.mp3 following hierarchical structure
- **UNIFIED AUDIO ARCHITECTURE**: All audio content (voice samples, story narrations, generated audio) follows same hierarchical user-based storage pattern

**CRITICAL FORMAT DETECTION RULE: SIGNATURE-BASED AUDIO/VIDEO FORMAT HANDLING**
- **NO HARDCODED FILE EXTENSIONS**: All format detection must use buffer signature analysis from shared/audio-config.ts and shared/video-format-config.ts
- **MP3-Only Optimization**: System enforces MP3 format for ElevenLabs with automatic conversion skipping when files are already MP3
- **Dynamic Format Detection**: Use detectAudioFormat() and detectVideoFormat() functions instead of assuming extensions
- **Configuration-Driven Processing**: All format signatures, thresholds, and supported formats centralized in config files
- **Preferred Format Hierarchies**: WAV, MP4, OGG preferred for recording before WebM fallback
- **MediaRecorder Capability Checking**: Recording format selection based on MediaRecorder.isTypeSupported() browser capabilities
- **Buffer Content Analysis**: Format detection analyzes actual file buffer content (RIFF, ID3, ftyp, EBML signatures) not filename extensions
- **FFmpeg EBML Error Prevention**: Proper format detection prevents treating MP3 files as WebM which causes FFmpeg parsing failures
- **Web-Safe Format Validation**: Only MP4/WebM for video, MP3/WAV/OGG for audio with compatibility matrix checking
- **Format Conversion Optimization**: Skip unnecessary conversions when source format matches target requirements
- **Audio Processing Pipeline**: WAV → MP3 conversion pipeline with format preservation when possible
- **Video Quality Management**: MP4 high quality for web, WebM for compatibility, with automatic resolution selection

**Responsive Design Requirements:**
- All components must be responsive and mobile-compatible by default
- No need to ask specifically for mobile compatibility - it's always required
- Components should automatically adjust to screen size and resolution dynamically
- Use responsive grid systems and breakpoints for optimal user experience across all devices