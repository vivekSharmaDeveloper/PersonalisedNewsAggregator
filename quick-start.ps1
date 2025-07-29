# Quick Local Development Setup
Write-Host "Starting Local Development Environment..." -ForegroundColor Green

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "Please install Node.js 18+ first" -ForegroundColor Red
    exit 1
}

# Clean up existing containers
Write-Host "Cleaning up existing containers..." -ForegroundColor Yellow
docker stop mongo-dev redis-dev 2>$null
docker rm mongo-dev redis-dev 2>$null

# Start MongoDB and Redis
Write-Host "Starting MongoDB and Redis..." -ForegroundColor Yellow
docker run -d --name mongo-dev -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password123 mongo:7.0
docker run -d --name redis-dev -p 6379:6379 redis:7.0-alpine redis-server --requirepass redis123

Write-Host "Waiting for databases..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "server/node_modules")) {
    Write-Host "Installing server dependencies..."
    Set-Location server
    npm install
    Set-Location ..
}

if (-not (Test-Path "client/node_modules")) {
    Write-Host "Installing client dependencies..."
    Set-Location client
    npm install
    Set-Location ..
}

if (-not (Test-Path "ml_inference_service/node_modules")) {
    Write-Host "Installing ML service dependencies..."
    Set-Location ml_inference_service
    npm install
    Set-Location ..
}

# Create environment files
if (-not (Test-Path "server/.env")) {
    Write-Host "Creating server .env file..."
    $envContent = "NODE_ENV=development`nPORT=5000`nMONGODB_URI=mongodb://admin:password123@localhost:27017/news-aggregator?authSource=admin`nREDIS_URL=redis://:redis123@localhost:6379`nJWT_SECRET=your-super-secret-jwt-key`nNEWSAPI_KEY=your_newsapi_key_here`nGOOGLECLOUD_APIKEY=your_google_cloud_api_key_here`nSENDGRID_API_KEY=your_sendgrid_api_key_here"
    $envContent | Out-File -FilePath "server\.env" -Encoding UTF8
}

if (-not (Test-Path "client/.env.local")) {
    Write-Host "Creating client .env file..."
    "NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1/" | Out-File -FilePath "client\.env.local" -Encoding UTF8
}

Write-Host ""
Write-Host "Starting all services..." -ForegroundColor Green

# Start services in separate windows
Write-Host "Starting backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\server'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Starting ML service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\ml_inference_service'; npm start"

Start-Sleep -Seconds 3

Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\client'; npm run dev"

Write-Host ""
Write-Host "All services are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000/api/v1/" -ForegroundColor Cyan
Write-Host "ML Service: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "MongoDB: localhost:27017" -ForegroundColor Cyan
Write-Host "Redis: localhost:6379" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Edit server/.env with your API keys" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop: Close the PowerShell windows and run:" -ForegroundColor Red
Write-Host "docker stop mongo-dev redis-dev && docker rm mongo-dev redis-dev" -ForegroundColor White
