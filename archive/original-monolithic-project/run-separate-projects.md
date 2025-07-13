# Running Backend and Frontend Projects Separately

## Current Issue
The main project is still running the monolithic application from the root directory. To run truly separate projects, follow these steps:

## Option 1: Manual Terminal Sessions

### Terminal 1 - Backend API
```bash
cd backend-project
npm run dev
```
- Runs on: http://localhost:5000
- Database: Uses configured DATABASE_URL
- API endpoints: /api/*

### Terminal 2 - Frontend App
```bash
cd frontend-project
npm run dev
```
- Runs on: http://localhost:5173
- Connects to: http://localhost:5000 (backend API)
- Pure frontend application

## Option 2: Using Start Scripts

### Backend
```bash
cd backend-project
./start-backend.sh
```

### Frontend
```bash
cd frontend-project
./start-frontend.sh
```

## Project Structure After Split

```
project-root/
├── backend-project/          # Standalone backend
│   ├── package.json         # Backend dependencies
│   ├── .env                 # Backend environment (DATABASE_URL, API keys)
│   ├── start-backend.sh     # Backend startup script
│   └── [backend files]
├── frontend-project/         # Standalone frontend
│   ├── package.json         # Frontend dependencies
│   ├── .env                 # Frontend environment (VITE_API_URL)
│   ├── start-frontend.sh    # Frontend startup script
│   └── [frontend files]
└── [legacy monolithic files] # Can be removed after split
```

## Key Points

1. **Backend runs independently** on port 5000
2. **Frontend runs independently** on port 5173
3. **No shared dependencies** between projects
4. **Frontend communicates with backend** via API calls to http://localhost:5000
5. **Environment variables separated** - backend has all secrets, frontend only has API URL

## Next Steps

1. Stop the current monolithic workflow
2. Run backend and frontend in separate terminals
3. Verify they communicate properly
4. Clean up root directory files (optional)