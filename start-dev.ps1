# Personalized News Aggregator - Development Startup Script (Windows)
# This script starts all necessary services for local development

Write-Host "🚀 Starting Personalized News Aggregator Development Environment" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green

# Function to check if a command exists
function Test-Command($command) {
    try {
        Get-Command $command -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Blue

if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 20+ first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "❌ npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

$dockerAvailable = Test-Command "docker"
if (-not $dockerAvailable) {
    Write-Host "⚠️  Docker is not installed. You'll need to start MongoDB and Redis manually." -ForegroundColor Yellow
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green

# Check if .env files exist
Write-Host "📄 Checking environment files..." -ForegroundColor Blue

if (-not (Test-Path "server\.env")) {
    Write-Host "⚠️  server\.env not found. Creating from example..." -ForegroundColor Yellow
    if (Test-Path "server\.env.example") {
        Copy-Item "server\.env.example" "server\.env"
        Write-Host "📝 Please edit server\.env with your actual API keys and configuration" -ForegroundColor Yellow
    } else {
        Write-Host "❌ server\.env.example not found. Please create server\.env manually." -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path "client\.env.local")) {
    Write-Host "⚠️  client\.env.local not found. Creating from example..." -ForegroundColor Yellow
    if (Test-Path "client\.env.example") {
        Copy-Item "client\.env.example" "client\.env.local"
    } else {
        "NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1/" | Out-File -FilePath "client\.env.local" -Encoding utf8
    }
}

Write-Host "✅ Environment files check passed" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue

Write-Host "Installing server dependencies..." -ForegroundColor Yellow
Set-Location "server"
npm install
Set-Location ".."

Write-Host "Installing client dependencies..." -ForegroundColor Yellow
Set-Location "client"
npm install
Set-Location ".."

Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Start services
Write-Host "🐳 Starting services..." -ForegroundColor Blue

if ($dockerAvailable) {
    Write-Host "Starting MongoDB and Redis with Docker..." -ForegroundColor Yellow
    docker-compose up -d mongodb redis
    
    # Wait for services to be ready
    Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Check if services are running
    $dockerStatus = docker-compose ps
    if ($dockerStatus -match "mongodb.*Up") {
        Write-Host "✅ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB failed to start" -ForegroundColor Red
        exit 1
    }
    
    if ($dockerStatus -match "redis.*Up") {
        Write-Host "✅ Redis is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis failed to start" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️  Please make sure MongoDB and Redis are running manually:" -ForegroundColor Yellow
    Write-Host "   MongoDB: mongodb://localhost:27017" -ForegroundColor Yellow
    Write-Host "   Redis: redis://localhost:6379" -ForegroundColor Yellow
    Read-Host "Press Enter to continue when services are ready"
}

# Start ML service
Write-Host "Starting ML inference service..." -ForegroundColor Yellow
Set-Location "ml_inference_service"
npm install 2>$null
$mlProcess = Start-Process -FilePath "node" -ArgumentList "app.js" -PassThru -NoNewWindow
Set-Location ".."

Write-Host "✅ ML inference service started (PID: $($mlProcess.Id))" -ForegroundColor Green

# Start server
Write-Host "Starting backend server..." -ForegroundColor Yellow
Set-Location "server"
$serverProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow
Set-Location ".."

Write-Host "✅ Backend server started (PID: $($serverProcess.Id))" -ForegroundColor Green

# Wait a bit for server to start
Start-Sleep -Seconds 5

# Start client
Write-Host "Starting frontend client..." -ForegroundColor Yellow
Set-Location "client"
$clientProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow
Set-Location ".."

Write-Host "✅ Frontend client started (PID: $($clientProcess.Id))" -ForegroundColor Green

# Wait for services to be fully ready
Write-Host "⏳ Waiting for all services to be ready..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Health check
Write-Host "🏥 Performing health checks..." -ForegroundColor Blue

# Check backend
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/health" -UseBasicParsing -TimeoutSec 5
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "✅ Backend API is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Backend API health check failed, but it might still be starting..." -ForegroundColor Yellow
}

# Check frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend is accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Frontend health check failed, but it might still be starting..." -ForegroundColor Yellow
}

# Check ML service
try {
    $mlResponse = Invoke-WebRequest -Uri "http://localhost:3001/detect-fake-news" -Method Post -Body '{"text":"test"}' -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
    if ($mlResponse.StatusCode -eq 200) {
        Write-Host "✅ ML service is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  ML service health check failed, but it might still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 All services started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access your application:" -ForegroundColor Blue
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "   Backend API: http://localhost:5000/api/v1" -ForegroundColor Green
Write-Host "   API Health: http://localhost:5000/api/v1/health" -ForegroundColor Green
Write-Host "   ML Service: http://localhost:3001" -ForegroundColor Green
Write-Host ""
Write-Host "🛑 To stop all services:" -ForegroundColor Blue
Write-Host "   Run: .\stop-dev.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Process IDs:" -ForegroundColor Blue
Write-Host "   Server: $($serverProcess.Id)"
Write-Host "   Client: $($clientProcess.Id)"
Write-Host "   ML Service: $($mlProcess.Id)"
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green

# Create stop script
$stopScript = @"
# Stop Development Environment Script
Write-Host "🛑 Stopping Personalized News Aggregator Development Environment" -ForegroundColor Yellow

try { Stop-Process -Id $($serverProcess.Id) -Force -ErrorAction SilentlyContinue } catch {}
try { Stop-Process -Id $($clientProcess.Id) -Force -ErrorAction SilentlyContinue } catch {}
try { Stop-Process -Id $($mlProcess.Id) -Force -ErrorAction SilentlyContinue } catch {}

if (Test-Command "docker-compose") {
    docker-compose down 2>`$null
}

Write-Host "✅ All services stopped" -ForegroundColor Green
"@

$stopScript | Out-File -FilePath "stop-dev.ps1" -Encoding utf8

Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Yellow

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # Cleanup on exit
    Write-Host "`n🛑 Stopping all services..." -ForegroundColor Yellow
    try { Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue } catch {}
    try { Stop-Process -Id $clientProcess.Id -Force -ErrorAction SilentlyContinue } catch {}
    try { Stop-Process -Id $mlProcess.Id -Force -ErrorAction SilentlyContinue } catch {}
    Write-Host "✅ All services stopped" -ForegroundColor Green
}
