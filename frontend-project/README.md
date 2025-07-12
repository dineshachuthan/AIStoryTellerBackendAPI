# AIStoryTellerFrontEnd

A modern React frontend for the collaborative storytelling platform.

## Features

- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **TanStack Query** for server state management
- **Wouter** for lightweight routing
- **Tailwind CSS** with shadcn/ui components
- **Dark/Light theme** support
- **Responsive design** for mobile and desktop

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

## Installation

```bash
# Clone the repository
git clone https://github.com/dineshachuthan/AIStoryTellerFrontEnd.git
cd AIStoryTellerFrontEnd

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api
```

## Development

```bash
# Start development server
npm run dev

# The application will be available at http://localhost:3000
```

## Building for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── navbar.tsx      # Navigation component
│   └── theme-provider.tsx
├── hooks/              # Custom React hooks
│   ├── use-auth.ts     # Authentication hook
│   └── use-toast.ts    # Toast notification hook
├── lib/                # Utility libraries
│   ├── api-client.ts   # API client for backend communication
│   └── utils.ts        # Utility functions
├── pages/              # Page components
│   ├── home.tsx        # Home page
│   ├── login.tsx       # Login/register page
│   ├── stories.tsx     # Stories listing page
│   ├── story-detail.tsx # Story detail page
│   └── profile.tsx     # User profile page
├── App.tsx             # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## Key Features

### Authentication
- Login/register with email and password
- JWT token-based authentication
- Protected routes for authenticated users

### Stories Management
- Create, read, update, and delete stories
- Search and filter stories
- Story categories and genres
- Draft and published states

### User Profile
- View account information
- Activity statistics
- Account management

### Voice Integration
- Voice recording management
- Audio file upload and processing
- Voice sample organization

## API Integration

The frontend communicates with the backend through a centralized API client (`src/lib/api-client.ts`). All API endpoints are typed and provide consistent error handling.

### Available API Endpoints

- **Authentication**: `/api/auth/*`
- **Stories**: `/api/stories/*`
- **Voice**: `/api/user/voice-recordings/*`
- **Health**: `/api/health`

## Deployment

### Development Deployment
```bash
npm run build
npm run preview
```

### Production Deployment
1. Build the application: `npm run build`
2. Deploy the `dist/` folder to your web server
3. Configure your web server to handle client-side routing
4. Set the production API URL in environment variables

## Independent Development

This frontend is designed to work independently from the backend project. It communicates with the backend through well-defined API contracts and can be developed, tested, and deployed separately.

### Backend API Requirements

The frontend expects a backend API with the following endpoints:

- `GET /api/auth/user` - Get current user
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/stories` - Get all stories
- `GET /api/stories/:id` - Get story by ID
- `POST /api/stories` - Create new story
- `PUT /api/stories/:id` - Update story
- `DELETE /api/stories/:id` - Delete story
- `GET /api/user/:id/voice-recordings` - Get voice recordings
- `POST /api/user/voice-recordings` - Upload voice recording
- `DELETE /api/user/voice-recordings/:id` - Delete voice recording
- `GET /api/health` - Health check

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.