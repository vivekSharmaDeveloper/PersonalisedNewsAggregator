#!/bin/bash

# Stop Local Development Environment (Bash Version)

echo "🛑 Stopping local development environment..."

# Stop Docker containers
echo "Stopping MongoDB and Redis containers..."
docker stop mongo-dev redis-dev 2>/dev/null || true
docker rm mongo-dev redis-dev 2>/dev/null || true

# Kill Node.js processes using saved PIDs
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null || true
    rm .backend.pid
fi

if [ -f ".ml.pid" ]; then
    ML_PID=$(cat .ml.pid)
    kill $ML_PID 2>/dev/null || true
    rm .ml.pid
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null || true
    rm .frontend.pid
fi

# Fallback: kill any remaining Node.js processes on these ports
echo "Cleaning up any remaining processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

echo "✅ All services stopped!"
