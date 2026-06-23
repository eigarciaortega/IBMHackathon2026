@echo off
echo ========================================
echo Reconstruyendo y reiniciando servicios
echo ========================================

echo.
echo [1/5] Deteniendo servicios...
docker-compose down

echo.
echo [2/5] Aplicando migracion de base de datos...
docker-compose up -d postgres
timeout /t 5 /nobreak >nul
docker exec -i meeting-rooms-db psql -U postgres -d meeting_rooms < database/fix_recursos_column.sql

echo.
echo [3/5] Reconstruyendo frontend y room-service...
docker-compose build --no-cache frontend room-service

echo.
echo [4/5] Iniciando todos los servicios...
docker-compose up -d

echo.
echo [5/5] Esperando que los servicios inicien...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo Verificando estado de los servicios...
echo ========================================
docker-compose ps

echo.
echo ========================================
echo Logs del frontend (ultimas 20 lineas):
echo ========================================
docker-compose logs --tail=20 frontend

echo.
echo ========================================
echo Logs del room-service (ultimas 20 lineas):
echo ========================================
docker-compose logs --tail=20 room-service

echo.
echo ========================================
echo COMPLETADO!
echo ========================================
echo.
echo Ahora puedes abrir http://localhost en tu navegador
echo.
pause

@REM Made with Bob
