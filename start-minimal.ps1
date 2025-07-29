# Minimal Local Setup - Uses Existing Redis Container
Write-Host "Starting Minimal Development Environment..." -ForegroundColor Green

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "Please install Node.js 18+ first" -ForegroundColor Red
    exit 1
}

# Check existing containers
Write-Host "Checking existing containers..." -ForegroundColor Yellow
$existingRedis = docker ps --filter "name=my-redis" --format "{{.Names}}" 2>$null
if ($existingRedis) {
    Write-Host "Using existing Redis container: $existingRedis" -ForegroundColor Green
} else {
    Write-Host "No Redis found. Please start Redis manually or use docker-compose" -ForegroundColor Yellow
}

# Start MongoDB only (simpler image)
Write-Host "Starting MongoDB..." -ForegroundColor Yellow
docker stop newsagg-mongo 2>$null
docker rm newsagg-mongo 2>$null
docker run -d --name newsagg-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password123 mongo:latest

Write-Host "Waiting for MongoDB to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

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
    $envContent = "NODE_ENV=development`nPORT=5000`nMONGODB_URI=mongodb://admin:password123@localhost:27017/news-aggregator?authSource=admin`nREDIS_URL=redis://localhost:6379`nJWT_SECRET=your-super-secret-jwt-key`nNEWSAPI_KEY=your_newsapi_key_here`nGOOGLECLOUD_APIKEY=your_google_cloud_api_key_here`nSENDGRID_API_KEY=your_sendgrid_api_key_here"
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
Write-Host "Development environment is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000/api/v1/" -ForegroundColor Cyan
Write-Host "ML Service: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "MongoDB: localhost:27017" -ForegroundColor Cyan
Write-Host "Redis: localhost:6379 (using existing container)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Edit server/.env with your API keys" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop MongoDB: docker stop newsagg-mongo && docker rm newsagg-mongo" -ForegroundColor Red
