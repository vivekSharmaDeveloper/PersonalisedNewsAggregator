# Stop Local Development Environment

Write-Host "🛑 Stopping local development environment..." -ForegroundColor Red

# Stop Docker containers
Write-Host "Stopping MongoDB and Redis containers..." -ForegroundColor Yellow
docker stop mongo-dev redis-dev 2>$null
docker rm mongo-dev redis-dev 2>$null

# Kill Node.js processes
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "✅ All services stopped!" -ForegroundColor Green
