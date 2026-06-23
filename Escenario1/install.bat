@echo off
echo ========================================
echo Meeting Room Reservation System
echo Microservices Installation Script
echo ========================================
echo.

echo Checking Docker installation...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [OK] Docker is installed

echo.
echo Checking Docker Compose...
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Compose is not installed
    pause
    exit /b 1
)
echo [OK] Docker Compose is installed

echo.
echo ========================================
echo Starting services...
echo ========================================
echo.
echo This will:
echo 1. Build Docker images for all services
echo 2. Start PostgreSQL database
echo 3. Initialize database schema
echo 4. Start User Service (port 8001)
echo 5. Start Room Service (port 8002)
echo 6. Start Reservation Service (port 8003)
echo.

docker-compose up --build -d

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start services
    echo Check the logs with: docker-compose logs
    pause
    exit /b 1
)

echo.
echo ========================================
echo Services started successfully!
echo ========================================
echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.
echo Service URLs:
echo - User Service API: http://localhost:8001/docs
echo - Room Service API: http://localhost:8002/docs
echo - Reservation Service API: http://localhost:8003/docs
echo.
echo Database:
echo - PostgreSQL: localhost:5432
echo - Database: meeting_rooms
echo - User: postgres
echo - Password: postgres123
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Open http://localhost:8001/docs in your browser
echo 2. Try the interactive API documentation
echo 3. Read QUICK_START.md for usage examples
echo 4. Check logs with: docker-compose logs -f
echo.
echo To stop services: docker-compose down
echo To restart: docker-compose restart
echo.
pause

@REM Made with Bob
