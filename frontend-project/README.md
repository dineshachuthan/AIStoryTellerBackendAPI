# Storytelling Frontend

## Overview

This is the frontend application for the collaborative storytelling platform. Built with React, TypeScript, and Vite, it provides a modern, responsive user interface for creating AI-powered stories with voice narration and collaborative features.

## Architecture

### Core Technologies
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side navigation
- **Forms**: React Hook Form with Zod validation
- **Animation**: Framer Motion for smooth transitions

### Key Features
- **Story Creation**: Multiple input methods (text, voice, file upload)
- **AI Analysis**: Real-time story analysis with character extraction
- **Voice Recording**: Emotion-based voice sample collection
- **Narration**: Multi-voice playback with conversation styles
- **Collaboration**: Invitation system for story narration
- **Admin Dashboard**: Comprehensive management interface
- **Internationalization**: Multi-language support (7 languages)

## Project Structure

```
frontend-project/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Base UI components (shadcn)
│   │   ├── story/         # Story-related components
│   │   ├── voice/         # Voice recording components
│   │   ├── admin/         # Admin dashboard components
│   │   └── layout/        # Layout components
│   ├── pages/             # Page components (routes)
│   │   ├── Home.tsx       # Landing page
│   │   ├── Library.tsx    # Story library
│   │   ├── Story.tsx      # Story detail/editor
│   │   ├── Voice.tsx      # Voice recording
│   │   ├── Admin.tsx      # Admin dashboard
│   │   └── Auth.tsx       # Authentication
│   ├── lib/               # Utilities and helpers
│   │   ├── api-client.ts  # Centralized API client
│   │   ├── queryClient.ts # React Query setup
│   │   ├── utils.ts       # General utilities
│   │   └── toast-utils.ts # Toast notifications
│   ├── hooks/             # Custom React hooks
│   │   ├── use-api.ts     # API hooks
│   │   ├── use-toast.ts   # Toast hook
│   │   └── use-auth.ts    # Authentication hook
│   ├── shared/            # Shared types and configs
│   │   ├── types/         # TypeScript types
│   │   ├── config/        # Configuration files
│   │   └── constants/     # Application constants
│   ├── assets/            # Static assets
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── public/                # Static public files
├── dist/                  # Build output
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind CSS config
├── tsconfig.json          # TypeScript config
└── package.json           # Dependencies
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

Key environment variables:
- `VITE_API_URL`: Backend API URL (default: http://localhost:5000)
- `VITE_STRIPE_PUBLIC_KEY`: Stripe public key for payments
- Feature flags for enabling/disabling features

### 3. Development Server
```bash
npm run dev
```

The application will start at `http://localhost:3000`

### 4. Production Build
```bash
npm run build
```

Build output will be in the `dist/` directory.

## Development Guidelines

### Component Structure
```typescript
// Example component structure
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast-utils';

export function StoryCard({ storyId }: { storyId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['stories', storyId],
    queryFn: () => apiClient.stories.get(storyId),
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="p-4 border rounded-lg">
      <h3>{data?.title}</h3>
      <Button onClick={() => toast.success('Action completed')}>
        Action
      </Button>
    </div>
  );
}
```

### API Integration
All API calls must go through the centralized API client:
```typescript
// ✅ Good
import { apiClient } from '@/lib/api-client';
const stories = await apiClient.stories.list();

// ❌ Bad
const response = await fetch('/api/stories');
```

### State Management
Use React Query for server state:
```typescript
// Queries
const { data, isLoading } = useQuery({
  queryKey: ['stories'],
  queryFn: () => apiClient.stories.list(),
});

// Mutations
const mutation = useMutation({
  mutationFn: (data) => apiClient.stories.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['stories'] });
    toast.success('Story created');
  },
});
```

### Styling Guidelines
- Use Tailwind CSS utility classes
- Follow the design system in tailwind.config.ts
- Use CSS variables for theming
- Support dark mode with `dark:` variants

### Internationalization
All user-facing text must use the i18n system:
```typescript
import { UIMessages } from '@/shared/config/i18n-config';

// Use i18n messages
<h1>{UIMessages.getTitle('STORY_LIBRARY')}</h1>
<p>{UIMessages.getMessage('WELCOME_MESSAGE', { name: userName })}</p>
```

## Key Components

### EnhancedVoiceRecorder
Reusable voice recording component for emotion-based samples:
- Status indicators (unlock/checkmark/lock)
- Horizontal button layout
- Intensity badges
- Progress tracking

### UniversalNarrationPlayer
Standard narration playback component:
- Segment-based audio playback
- Auto-advance between segments
- Manual navigation controls
- Conversation style support

### StoryLibrary
Main story management interface:
- Grid/list view toggle
- Filtering and sorting
- Bulk actions
- Story cards with actions

### AdminDashboard
Comprehensive admin interface:
- User management
- Story analytics
- System monitoring
- Cache management

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

## Performance Optimization

- Lazy loading for routes
- Image optimization
- Code splitting
- React Query caching
- Memoization for expensive operations

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Deployment

### Build for Production
```bash
npm run build
```

### Serve Static Files
The `dist/` directory can be served by any static file server:
- Nginx
- Apache
- Vercel
- Netlify
- Cloudflare Pages

### Environment Variables
Ensure all `VITE_` prefixed variables are set in production.

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check VITE_API_URL is correct
   - Ensure backend is running
   - Check CORS configuration

2. **Build Errors**
   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify import paths

3. **Style Issues**
   - Run `npm run build` to rebuild CSS
   - Check Tailwind configuration
   - Verify PostCSS setup

## Contributing

1. Follow TypeScript strict mode
2. Use the established component patterns
3. Write tests for new features
4. Update documentation
5. Use conventional commits

## License

Proprietary - All rights reserved