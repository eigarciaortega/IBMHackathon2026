# NeoWallet - Makefile
# Comandos útiles para desarrollo

.PHONY: help install start stop restart logs clean test db-reset

# Por defecto, mostrar ayuda
help:
	@echo "=========================================="
	@echo "NeoWallet - Comandos Disponibles"
	@echo "=========================================="
	@echo ""
	@echo "  make install    - Instalar dependencias"
	@echo "  make start      - Iniciar servicios"
	@echo "  make stop       - Detener servicios"
	@echo "  make restart    - Reiniciar servicios"
	@echo "  make logs       - Ver logs"
	@echo "  make clean      - Limpiar contenedores y volúmenes"
	@echo "  make test       - Ejecutar pruebas"
	@echo "  make db-reset   - Resetear bases de datos"
	@echo ""

# Instalar dependencias
install:
	@echo "📦 Instalando dependencias..."
	cd accounts-service && npm install
	cd processor-service && npm install
	@echo "✅ Dependencias instaladas"

# Iniciar servicios
start:
	@echo "🚀 Iniciando servicios..."
	docker-compose up -d --build
	@echo "✅ Servicios iniciados"
	@echo "   Accounts Service: http://localhost:3000"
	@echo "   Processor Service: http://localhost:3001"

# Detener servicios
stop:
	@echo "🛑 Deteniendo servicios..."
	docker-compose down
	@echo "✅ Servicios detenidos"

# Reiniciar servicios
restart: stop start

# Ver logs
logs:
	docker-compose logs -f

# Limpiar todo
clean:
	@echo "🧹 Limpiando contenedores y volúmenes..."
	docker-compose down -v
	@echo "✅ Limpieza completada"

# Resetear bases de datos
db-reset: clean start
	@echo "✅ Bases de datos reseteadas"

# Ejecutar pruebas básicas
test:
	@echo "🧪 Ejecutando pruebas..."
	@echo "Health Checks:"
	@curl -s http://localhost:3000/health | jq .
	@curl -s http://localhost:3001/health | jq .
	@echo ""
	@echo "Consultando usuarios:"
	@curl -s http://localhost:3000/accounts | jq .
