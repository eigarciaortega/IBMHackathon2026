-- OfficeSpace - Script de inicialización de base de datos
-- Las tablas y esquema son gestionados por TypeORM (synchronize: true).
-- Este script solo garantiza que la DB exista y agrega extensiones útiles.

-- Extensión para UUIDs (por si se migra a UUIDs en el futuro)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Los usuarios semilla (admin, carlos.mendez, ana.torres) son creados
-- automáticamente por el catalog-service en su ciclo onApplicationBootstrap.
