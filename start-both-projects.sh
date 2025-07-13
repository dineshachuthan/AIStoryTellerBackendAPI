#!/bin/bash

echo "🚀 Starting Full Stack Application..."
echo "📦 Backend: http://localhost:5000"
echo "🌐 Frontend: http://localhost:5173"
echo "=================================="

# Start backend in background
echo "Starting backend..."
cd backend-project && npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend in background
echo "Starting frontend..."
cd ../frontend-project && npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID