#!/bin/bash

# Ultra-Fast Local Development Setup (Bash Version)
# Runs everything locally - no Docker build delays

echo "🚀 Ultra-Fast Local Development Setup"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Please install Node.js 18+ first"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js $NODE_VERSION detected"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Please install Docker first"
    exit 1
fi

echo "✅ Docker detected"

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker stop mongo-dev redis-dev 2>/dev/null || true
docker rm mongo-dev redis-dev 2>/dev/null || true

# Start MongoDB and Redis with Docker (quick pull, no build)
echo "🗄️ Starting MongoDB and Redis..."
docker run -d --name mongo-dev -p 27017:27017 \
    -e MONGO_INITDB_ROOT_USERNAME=admin \
    -e MONGO_INITDB_ROOT_PASSWORD=password123 \
    mongo:7.0

docker run -d --name redis-dev -p 6379:6379 \
    redis:7.0-alpine redis-server --requirepass redis123

echo "⏳ Waiting for databases to start..."
sleep 10

# Install dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server
    npm install
    cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client
    npm install
    cd ..
fi

if [ ! -d "ml_inference_service/node_modules" ]; then
    echo "📦 Installing ML service dependencies..."
    cd ml_inference_service
    npm install
    cd ..
fi

# Create .env files if they don't exist
if [ ! -f "server/.env" ]; then
    echo "📝 Creating server .env file..."
    cat > server/.env << EOF
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://admin:password123@localhost:27017/news-aggregator?authSource=admin
REDIS_URL=redis://:redis123@localhost:6379
JWT_SECRET=your-super-secret-jwt-key-for-development
NEWSAPI_KEY=your_newsapi_key_here
GOOGLECLOUD_APIKEY=your_google_cloud_api_key_here
SENDGRID_API_KEY=your_sendgrid_api_key_here
EOF
fi

if [ ! -f "client/.env.local" ]; then
    echo "📝 Creating client .env file..."
    cat > client/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1/
EOF
fi

echo ""
echo "🚀 Starting all services..."

# Start backend in background
echo "Starting backend server..."
cd server
npm run dev &
BACKEND_PID=$!
cd ..

sleep 3

# Start ML service in background
echo "Starting ML inference service..."
cd ml_inference_service
npm start &
ML_PID=$!
cd ..

sleep 3

# Start frontend in background
echo "Starting frontend..."
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

# Save PIDs for cleanup
echo $BACKEND_PID > .backend.pid
echo $ML_PID > .ml.pid
echo $FRONTEND_PID > .frontend.pid

echo ""
echo "🎉 All services are starting up!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000/api/v1/"
echo "🤖 ML Service: http://localhost:3001/health"
echo "🗄️ MongoDB: localhost:27017"
echo "⚡ Redis: localhost:6379"
echo ""
echo "⚠️ Note: Edit server/.env with your real API keys for full functionality"
echo ""
echo "🛑 To stop everything:"
echo "   ./stop-local.sh"
echo ""
echo "📊 Monitor logs with:"
echo "   tail -f server logs, client logs, ml_inference_service logs"
echo ""
echo "✅ Setup complete! Services are running in the background."
