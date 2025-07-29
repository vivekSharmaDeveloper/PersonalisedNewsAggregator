# Fast Development Setup - Runs Frontend Locally
# This avoids the slow Docker build for the frontend

Write-Host "⚡ Fast Development Setup - Personalized News Aggregator" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Start backend services only (no frontend in Docker)
Write-Host "🔧 Starting backend services..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
Write-Host "⏳ Waiting for backend services..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check if client dependencies are installed
if (-not (Test-Path "client/node_modules")) {
    Write-Host "📦 Installing client dependencies..." -ForegroundColor Yellow
    cd client
    npm install
    cd ..
}

Write-Host "📊 Backend Service Status:" -ForegroundColor Cyan
docker-compose -f docker-compose.dev.yml ps

Write-Host ""
Write-Host "🚀 Starting frontend development server..." -ForegroundColor Green

# Start frontend in development mode
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd client; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "🎉 Development environment is ready!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000 (running locally)" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:5000/api/v1/" -ForegroundColor Cyan
Write-Host "🤖 ML Service: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "🗄️  MongoDB: localhost:27017" -ForegroundColor Cyan
Write-Host "⚡ Redis: localhost:6379" -ForegroundColor Cyan

Write-Host ""
Write-Host "📋 Useful Commands:" -ForegroundColor Yellow
Write-Host "   View backend logs: docker-compose -f docker-compose.dev.yml logs -f" -ForegroundColor White
Write-Host "   Stop backend: docker-compose -f docker-compose.dev.yml down" -ForegroundColor White
Write-Host "   Frontend will open automatically in your browser" -ForegroundColor White
