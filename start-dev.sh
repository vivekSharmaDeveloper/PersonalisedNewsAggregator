#!/bin/bash

# Personalized News Aggregator - Development Startup Script
# This script starts all necessary services for local development

set -e

echo "🚀 Starting Personalized News Aggregator Development Environment"
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 20+ first.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${YELLOW}⚠️  Docker is not installed. You'll need to start MongoDB and Redis manually.${NC}"
    DOCKER_AVAILABLE=false
else
    DOCKER_AVAILABLE=true
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Check if .env files exist
echo -e "${BLUE}📄 Checking environment files...${NC}"

if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚠️  server/.env not found. Creating from example...${NC}"
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        echo -e "${YELLOW}📝 Please edit server/.env with your actual API keys and configuration${NC}"
    else
        echo -e "${RED}❌ server/.env.example not found. Please create server/.env manually.${NC}"
        exit 1
    fi
fi

if [ ! -f "client/.env.local" ]; then
    echo -e "${YELLOW}⚠️  client/.env.local not found. Creating from example...${NC}"
    if [ -f "client/.env.example" ]; then
        cp client/.env.example client/.env.local
    else
        echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1/" > client/.env.local
    fi
fi

echo -e "${GREEN}✅ Environment files check passed${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"

echo -e "${YELLOW}Installing server dependencies...${NC}"
cd server && npm install
cd ..

echo -e "${YELLOW}Installing client dependencies...${NC}"
cd client && npm install
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Start services
echo -e "${BLUE}🐳 Starting services...${NC}"

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${YELLOW}Starting MongoDB and Redis with Docker...${NC}"
    docker-compose up -d mongodb redis
    
    # Wait for services to be ready
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    sleep 10
    
    # Check if services are running
    if docker-compose ps | grep -q "mongodb.*Up"; then
        echo -e "${GREEN}✅ MongoDB is running${NC}"
    else
        echo -e "${RED}❌ MongoDB failed to start${NC}"
        exit 1
    fi
    
    if docker-compose ps | grep -q "redis.*Up"; then
        echo -e "${GREEN}✅ Redis is running${NC}"
    else
        echo -e "${RED}❌ Redis failed to start${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Please make sure MongoDB and Redis are running manually:${NC}"
    echo -e "${YELLOW}   MongoDB: mongodb://localhost:27017${NC}"
    echo -e "${YELLOW}   Redis: redis://localhost:6379${NC}"
    read -p "Press Enter to continue when services are ready..."
fi

# Start ML service
echo -e "${YELLOW}Starting ML inference service...${NC}"
cd ml_inference_service
npm install 2>/dev/null || echo "ML service dependencies already installed"
node app.js &
ML_PID=$!
cd ..

echo -e "${GREEN}✅ ML inference service started (PID: $ML_PID)${NC}"

# Start server
echo -e "${YELLOW}Starting backend server...${NC}"
cd server
npm run dev &
SERVER_PID=$!
cd ..

echo -e "${GREEN}✅ Backend server started (PID: $SERVER_PID)${NC}"

# Wait a bit for server to start
sleep 5

# Start client
echo -e "${YELLOW}Starting frontend client...${NC}"
cd client
npm run dev &
CLIENT_PID=$!
cd ..

echo -e "${GREEN}✅ Frontend client started (PID: $CLIENT_PID)${NC}"

# Wait for services to be fully ready
echo -e "${BLUE}⏳ Waiting for all services to be ready...${NC}"
sleep 10

# Health check
echo -e "${BLUE}🏥 Performing health checks...${NC}"

# Check backend
if curl -f http://localhost:5000/api/v1/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend API health check failed, but it might still be starting...${NC}"
fi

# Check frontend
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend health check failed, but it might still be starting...${NC}"
fi

# Check ML service
if curl -f http://localhost:3001/detect-fake-news -X POST -H "Content-Type: application/json" -d '{"text":"test"}' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ ML service is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  ML service health check failed, but it might still be starting...${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo ""
echo -e "${BLUE}📱 Access your application:${NC}"
echo -e "   Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "   Backend API: ${GREEN}http://localhost:5000/api/v1${NC}"
echo -e "   API Health: ${GREEN}http://localhost:5000/api/v1/health${NC}"
echo -e "   ML Service: ${GREEN}http://localhost:3001${NC}"
echo ""
echo -e "${BLUE}🛑 To stop all services:${NC}"
echo -e "   ${YELLOW}kill $SERVER_PID $CLIENT_PID $ML_PID${NC}"
echo -e "   ${YELLOW}docker-compose down${NC} (if using Docker)"
echo ""
echo -e "${BLUE}📝 Process IDs:${NC}"
echo -e "   Server: $SERVER_PID"
echo -e "   Client: $CLIENT_PID"  
echo -e "   ML Service: $ML_PID"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"

# Create stop script
cat > stop-dev.sh << EOF
#!/bin/bash
echo "🛑 Stopping Personalized News Aggregator Development Environment"
kill $SERVER_PID $CLIENT_PID $ML_PID 2>/dev/null || true
docker-compose down 2>/dev/null || true
echo "✅ All services stopped"
EOF

chmod +x stop-dev.sh

# Keep script running
wait
