# Storytelling Backend API

## Overview

This is the backend API server for the collaborative storytelling platform. It provides comprehensive REST APIs for story management, AI-powered content analysis, voice cloning, video generation, and real-time collaboration features.

## Architecture

### Core Technologies
- **Runtime**: Node.js 18+ with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with OAuth providers (Google, Facebook, Microsoft)
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **WebSocket**: Real-time communication for cache invalidation

### External Integrations
- **AI Services**: OpenAI (GPT-4), Anthropic Claude, ElevenLabs (voice cloning)
- **Email Providers**: MailGun (primary), SendGrid (fallback)
- **SMS Providers**: Twilio (primary), MessageBird (fallback)
- **Video Generation**: RunwayML, Pika Labs, Luma AI
- **Payment Processing**: Stripe

### Microservices Architecture
The backend uses an adapter pattern for gradual microservices migration:
- **Identity Service**: User authentication and management
- **Story Service**: Story creation and AI analysis
- **Collaboration Service**: Invitations and roleplay management
- **Narration Service**: Voice cloning and audio generation
- **Video Service**: Multi-provider video generation
- **Notification Service**: Event-driven notifications
- **Subscription Service**: Payment and plan management

## Project Structure

```
backend-project/
├── server/                      # Main server code
│   ├── index.ts                # Server entry point
│   ├── routes.ts               # API route definitions
│   ├── storage.ts              # Database access layer
│   ├── auth.ts                 # Authentication middleware
│   ├── microservices/          # Service adapters
│   ├── providers/              # External service providers
│   ├── middleware/             # Express middleware
│   ├── utils/                  # Utility functions
│   └── cache/                  # Caching implementations
├── shared/                     # Shared code with frontend
│   ├── schema/                 # Drizzle database schemas
│   ├── types/                  # TypeScript type definitions
│   ├── config/                 # Configuration files
│   ├── constants/              # Shared constants
│   └── utils/                  # Shared utilities
├── scripts/                    # Utility scripts
│   ├── migrate.ts             # Database migration runner
│   └── seed-reference-data.ts # Reference data seeder
├── DB_SCRIPTS/                # Database scripts
│   ├── DDL/                   # Table creation scripts
│   ├── DML/                   # Data modification scripts
│   └── REFERENCE_DATA/        # Initial data inserts
├── drizzle/                   # Generated Drizzle migrations
├── uploads/                   # File upload directory
├── cache/                     # Cache storage directory
└── dist/                      # Compiled JavaScript output
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secure session secret
- `OPENAI_API_KEY`: OpenAI API key
- `ELEVENLABS_API_KEY`: ElevenLabs API key
- OAuth credentials for authentication providers
- Email/SMS provider credentials

### 3. Database Setup

#### Create Database
```sql
CREATE DATABASE storytelling_app;
```

#### Run DDL Scripts
```bash
cd DB_SCRIPTS
psql -U your_username -d storytelling_app -f run-all-ddl.sql
```

#### Load Reference Data
```bash
psql -U your_username -d storytelling_app -f run-all-reference-data.sql
```

### 4. Run Development Server
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - Local login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/facebook` - Facebook OAuth
- `GET /api/auth/microsoft` - Microsoft OAuth
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/user` - Get current user

### Story Management
- `GET /api/stories` - List user stories
- `POST /api/stories` - Create new story
- `GET /api/stories/:id` - Get story details
- `PUT /api/stories/:id` - Update story
- `DELETE /api/stories/:id` - Delete story
- `POST /api/stories/:id/analyze` - Trigger AI analysis
- `POST /api/stories/:id/narrate` - Generate narration

### Collaboration
- `POST /api/stories/:id/invitations` - Send collaboration invite
- `GET /api/invitations/:token` - Get invitation details
- `POST /api/invitations/:token/accept` - Accept invitation
- `POST /api/invitations/:token/recordings` - Submit recordings

### Voice & Audio
- `POST /api/voice-cloning/create-narrator` - Create cloned voice
- `GET /api/user/esm-recordings` - List voice recordings
- `POST /api/user/voice-recordings` - Upload recording
- `DELETE /api/user/voice-recordings/:id` - Delete recording

### Video Generation
- `POST /api/video/generate` - Generate video
- `GET /api/video/status/:jobId` - Check generation status
- `GET /api/video/:id` - Get video details

### Admin & Analytics
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/users` - List all users
- `GET /api/admin/stories` - List all stories
- `POST /api/admin/cache/invalidate` - Invalidate cache

## Database Schema

See `DB_SCRIPTS/README.md` for detailed database documentation.

Key tables:
- `users` - User accounts and profiles
- `stories` - Story content and metadata
- `story_narrations` - Generated audio narrations
- `story_invitations` - Collaboration invitations
- `user_esm` - User emotion/sound/modulation data
- `user_esm_recordings` - Voice recording files
- `notification_campaigns` - Notification configuration
- `app_states` - State machine configuration

## Development Guidelines

### Code Style
- Use TypeScript with strict mode
- Follow ESLint configuration
- Use async/await for asynchronous operations
- Implement proper error handling
- Add JSDoc comments for public APIs

### Database Access
- Use Drizzle ORM for type-safe queries
- Implement repository pattern in storage.ts
- Use transactions for multi-table operations
- Add proper indexes for performance

### Security
- Validate all input with Zod schemas
- Use parameterized queries
- Implement rate limiting
- Sanitize file uploads
- Use JWT for API authentication

### Testing
```bash
npm test                 # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests
```

## Deployment

### Production Build
```bash
npm run build
```

The build process compiles TypeScript to JavaScript in the `dist/` folder with:
- Type definitions (.d.ts files)
- Source maps for debugging
- Optimized JavaScript output

Available scripts:
- `npm run build` - Compiles TypeScript to JavaScript
- `npm run dev` - Development server with hot reloading
- `npm run start` - Production server from built files

### Environment Variables
Ensure all production environment variables are set:
- Use strong passwords and secrets
- Configure production database
- Set up monitoring and logging
- Enable HTTPS

### Database Migrations
```bash
npm run db:migrate
```

### Start Production Server
```bash
npm start
```

## Monitoring & Logging

The backend includes comprehensive logging:
- Request/response logging
- Error tracking
- Performance metrics
- External API call monitoring

## Support

For issues or questions:
1. Check the documentation
2. Review existing issues
3. Contact the development team

## License

Proprietary - All rights reserved