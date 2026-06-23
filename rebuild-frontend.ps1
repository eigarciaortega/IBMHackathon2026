# Script para reconstruir y reiniciar el frontend de NeoWallet
# Ejecutar desde la raíz del proyecto

Write-Host "=== Reconstruyendo Frontend de NeoWallet ===" -ForegroundColor Green

# Paso 1: Detener el contenedor actual
Write-Host "`n1. Deteniendo contenedor frontend..." -ForegroundColor Yellow
docker-compose stop frontend

# Paso 2: Eliminar el contenedor
Write-Host "`n2. Eliminando contenedor frontend..." -ForegroundColor Yellow
docker-compose rm -f frontend

# Paso 3: Reconstruir la imagen
Write-Host "`n3. Reconstruyendo imagen frontend..." -ForegroundColor Yellow
docker-compose build --no-cache frontend

# Paso 4: Iniciar el contenedor
Write-Host "`n4. Iniciando contenedor frontend..." -ForegroundColor Yellow
docker-compose up -d frontend

# Paso 5: Esperar a que el servicio esté listo
Write-Host "`n5. Esperando a que el servicio esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Paso 6: Verificar estado
Write-Host "`n6. Verificando estado del servicio..." -ForegroundColor Yellow
docker-compose ps frontend

# Paso 7: Verificar logs
Write-Host "`n7. Últimos logs del frontend:" -ForegroundColor Yellow
docker-compose logs --tail=20 frontend

# Paso 8: Test de conectividad
Write-Host "`n8. Probando conectividad..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ Frontend accesible - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Frontend no accesible - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Proceso Completado ===" -ForegroundColor Green
Write-Host "Accede a: http://localhost" -ForegroundColor Cyan
Write-Host "`nSi aún tienes problemas, ejecuta:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f frontend" -ForegroundColor Cyan

# Made with Bob
