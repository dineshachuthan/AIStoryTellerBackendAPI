#!/bin/bash
echo "🚀 Starting Backend API Server..."
echo "📂 Working Directory: $(pwd)"
echo "🔧 Environment: $(node -e "console.log(process.env.NODE_ENV || 'development')")"
echo "💾 Database: $(node -e "console.log(process.env.DATABASE_URL ? 'Connected' : 'Not configured')")"
echo "⚡ Starting server on port 5000..."
echo "============================================="
npm run dev