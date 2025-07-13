#!/bin/bash
echo "🌐 Starting Frontend Application..."
echo "📂 Working Directory: $(pwd)"
echo "🔧 Environment: $(node -e "console.log(process.env.NODE_ENV || 'development')")"
echo "🔗 API URL: $(node -e "console.log(process.env.VITE_API_URL || 'http://localhost:5000')")"
echo "⚡ Starting development server on port 5173..."
echo "============================================="
npm run dev