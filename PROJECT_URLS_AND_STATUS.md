# Project URLs and Status

## ✅ Backend API - RUNNING
- **URL**: http://localhost:5000
- **Health Check**: http://localhost:5000/health
- **API Documentation**: http://localhost:5000/api/docs
- **Status**: ✅ ACTIVE (Running from backend-project/)

## ✅ Frontend Application - RUNNING
- **Project Location**: frontend-project/
- **URL**: http://localhost:3000
- **Status**: ✅ ACTIVE (Running from frontend-project/)

## 🚀 How to Start Frontend Separately

### Option 1: New Terminal
```bash
cd frontend-project
npm run dev
```

### Option 2: Start Script
```bash
./start-frontend.sh
```

## 📁 Project Structure (After Cleanup)
```
workspace/
├── backend-project/          # ✅ Independent backend API
│   ├── package.json         # Backend dependencies
│   ├── .env                 # Backend environment (DATABASE_URL, API keys)
│   └── index.ts             # Backend entry point
├── frontend-project/         # ✅ Independent frontend app
│   ├── package.json         # Frontend dependencies
│   ├── .env                 # Frontend environment (VITE_API_URL)
│   └── src/main.tsx         # Frontend entry point
├── archive/                  # 📦 Original monolithic project
│   └── original-monolithic-project/
│       └── [all original files moved here]
├── server/                   # 🔄 Minimal redirect (workflow compatibility)
│   └── index.ts             # Redirects to backend-project
└── package.json             # 🔄 Minimal launcher (workflow compatibility)
```

## 🧹 Clean Separation Status
- ✅ **server/** and **shared/** directories moved to archive
- ✅ **node_modules/** moved to archive  
- ✅ **All root config files** moved to archive
- ✅ **Only two independent projects** remain in workspace
- 🔄 **Minimal workflow compatibility** maintained with redirect script

## 🔗 Communication
- Frontend connects to backend via: http://localhost:5000
- Backend serves API endpoints: /api/*
- Both projects are completely independent

## 🎯 Current Status - FULLY OPERATIONAL

### 🌐 Frontend Application
**URL**: http://localhost:3000
**Status**: ✅ Running
**Features**: Login page, storytelling platform interface

### 🔧 Backend API Documentation  
**URL**: http://localhost:5000 (redirects to Swagger UI)
**Direct URL**: http://localhost:5000/api-docs
**Status**: ✅ Running
**Features**: Interactive API documentation, endpoint testing

### 🚀 How to Access Both Applications
1. **Frontend**: Click the port 3000 link in Replit (mapped to internal port 5001)
2. **Backend**: Click the port 80 link in Replit (mapped to internal port 5000)
3. Both applications run independently with single workflow

### 🔧 Replit Port Configuration
- **Frontend**: Internal port 5001 → External port 3000
- **Backend**: Internal port 5000 → External port 80 (main domain)
- **Access**: Use Replit's generated URLs with the correct port numbers

### 🎯 API First Development Status
✅ **OpenAPI Specification**: Complete YAML specification in `backend-project/openapi.yaml`
✅ **Swagger UI**: Interactive documentation at http://localhost:5000/api-docs
✅ **15 Endpoints**: All authentication, users, stories, and voice recording endpoints
✅ **Full CRUD Operations**: Create, Read, Update, Delete for all resources
✅ **Schema Validation**: Request/response schemas with detailed validation
✅ **Error Documentation**: Comprehensive error response specifications

### 📊 Current API Endpoints
- **Authentication**: 4 endpoints (login, register, logout, current user)
- **Users**: 3 endpoints (list, get by ID, create)
- **Stories**: 5 endpoints (list, create, get, update, delete)
- **Voice Recordings**: 3 endpoints (list, create, delete)
- **Total**: 15 fully documented endpoints with interactive testing