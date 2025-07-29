# Ultra-Fast Local Development Setup
# Runs everything locally - no Docker build delays

Write-Host "🚀 Ultra-Fast Local Development Setup" -ForegroundColor Green

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Please install Node.js 18+ first" -ForegroundColor Red
    exit 1
}

# Start MongoDB and Redis with Docker (quick pull, no build)
Write-Host "🗄️ Starting MongoDB and Redis..." -ForegroundColor Yellow
docker run -d --name mongo-dev -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password123 mongo:7.0
docker run -d --name redis-dev -p 6379:6379 redis:7.0-alpine redis-server --requirepass redis123

Write-Host "⏳ Waiting for databases to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Install dependencies if needed
if (-not (Test-Path "server/node_modules")) {
    Write-Host "📦 Installing server dependencies..." -ForegroundColor Yellow
    cd server
    npm install
    cd ..
}

if (-not (Test-Path "client/node_modules")) {
    Write-Host "📦 Installing client dependencies..." -ForegroundColor Yellow
    cd client
    npm install
    cd ..
}

if (-not (Test-Path "ml_inference_service/node_modules")) {
    Write-Host "📦 Installing ML service dependencies..." -ForegroundColor Yellow
    cd ml_inference_service
    npm install
    cd ..
}

# Create .env if it doesn't exist
if (-not (Test-Path "server/.env")) {
    Write-Host "Creating server .env file..." -ForegroundColor Yellow
    $envContent = @'
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://admin:password123@localhost:27017/news-aggregator?authSource=admin
REDIS_URL=redis://:redis123@localhost:6379
JWT_SECRET=your-super-secret-jwt-key-for-development
NEWSAPI_KEY=your_newsapi_key_here
GOOGLECLOUD_APIKEY=your_google_cloud_api_key_here
SENDGRID_API_KEY=your_sendgrid_api_key_here
'@
    $envContent | Out-File -FilePath "server\.env" -Encoding UTF8
}

# Create client .env if it doesn't exist
if (-not (Test-Path "client/.env.local")) {
    Write-Host "Creating client .env file..." -ForegroundColor Yellow
    $clientEnvContent = @'
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1/
'@
    $clientEnvContent | Out-File -FilePath "client\.env.local" -Encoding UTF8
}

Write-Host ""
Write-Host "🚀 Starting all services..." -ForegroundColor Green

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd server; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start ML service
Write-Host "Starting ML inference service..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd ml_inference_service; npm start" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd client; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "🎉 All services starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:5000/api/v1/" -ForegroundColor Cyan
Write-Host "🤖 ML Service: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "🗄️ MongoDB: localhost:27017" -ForegroundColor Cyan
Write-Host "⚡ Redis: localhost:6379" -ForegroundColor Cyan

Write-Host ""
Write-Host "⚠️ Note: Edit server/.env with your real API keys for full functionality" -ForegroundColor Yellow
Write-Host ""
Write-Host "🛑 To stop everything:" -ForegroundColor Red
Write-Host "   docker stop mongo-dev redis-dev && docker rm mongo-dev redis-dev" -ForegroundColor White
Write-Host "   Close the PowerShell windows for the services" -ForegroundColor White
