# Guía de Despliegue — NeoWallet

## Despliegue local con Docker Compose

```bash
# 1. Clonar el repositorio
git clone https://github.com/i0dk1/NeoWallet.git
cd NeoWallet

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con valores seguros (especialmente INTERNAL_API_KEY)

# 3. Levantar toda la infraestructura
docker-compose up --build

# 4. Verificar
curl http://localhost:3000/health   # accounts-service
curl http://localhost:3001/health   # processor-service
```

La primera ejecución carga automáticamente los esquemas SQL y los datos semilla (usuarios A, B, C).

## Puertos

| Servicio | Puerto | Acceso |
|----------|--------|--------|
| accounts-db | 5432 | localhost |
| processor-db | 5433 | localhost |
| accounts-service | 3000 | localhost |
| processor-service | 3001 | localhost |

## Swagger

- accounts-service: http://localhost:3000/api-docs
- processor-service: http://localhost:3001/api-docs

## Variables de entorno requeridas

Ver `.env.example` para la lista completa. Las críticas son:
- `INTERNAL_API_KEY` — debe coincidir entre ambos servicios
- Credenciales de ambas bases de datos
- `ACCOUNTS_SERVICE_URL` — URL interna de accounts para el processor

## Despliegue en producción (Hetzner + Dokploy)

1. Provisionar servidor Hetzner con Docker instalado
2. Instalar Dokploy: `curl -sSL https://dokploy.com/install.sh | sh`
3. Crear proyecto en Dokploy y conectar el repositorio
4. Configurar variables de entorno en Dokploy (especialmente `INTERNAL_API_KEY`)
5. Usar `docker-compose.prod.yml` como compose de producción
6. Cargar los `init-*.sql` al primer arranque (Dokploy los monta automáticamente vía volumes)
7. Configurar proxy inverso para exponer solo los endpoints públicos