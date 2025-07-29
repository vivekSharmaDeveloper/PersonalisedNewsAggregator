# Personalized News Aggregator Startup Script
# This script helps you start the application with proper setup

Write-Host "🚀 Starting Personalized News Aggregator..." -ForegroundColor Green

# Check if Docker is running
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if docker-compose is available
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not available. Please install Docker Compose." -ForegroundColor Red
    exit 1
}

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  No .env file found. Creating from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "📝 Please edit the .env file with your API keys before continuing." -ForegroundColor Yellow
    Write-Host "   You can get API keys from:" -ForegroundColor Cyan
    Write-Host "   - NewsAPI: https://newsapi.org/" -ForegroundColor Cyan
    Write-Host "   - Google Cloud: https://cloud.google.com/natural-language/" -ForegroundColor Cyan
    Write-Host "   - SendGrid: https://sendgrid.com/" -ForegroundColor Cyan
    
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

# Clean up any existing containers
Write-Host "🧹 Cleaning up existing containers..." -ForegroundColor Yellow
docker-compose down -v 2>$null

# Build and start services
Write-Host "🔨 Building and starting services..." -ForegroundColor Green
docker-compose up --build -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service status
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "🎉 Application should be ready!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:5000/api/v1/" -ForegroundColor Cyan
Write-Host "🤖 ML Service: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "🗄️  MongoDB: localhost:27017" -ForegroundColor Cyan
Write-Host "⚡ Redis: localhost:6379" -ForegroundColor Cyan

Write-Host ""
Write-Host "📋 Useful Commands:" -ForegroundColor Yellow
Write-Host "   View logs: docker-compose logs -f" -ForegroundColor White
Write-Host "   Stop services: docker-compose down" -ForegroundColor White
Write-Host "   Restart: docker-compose restart" -ForegroundColor White
