# Solución al Error de Creación de Salas

## Problemas Identificados

El error al crear salas se debe a tres problemas principales:

1. **Modelo SQLAlchemy incorrecto**: La columna `recursos` tenía `default=list` que causa problemas en SQLAlchemy
2. **Falta de validación**: No había manejo adecuado de listas vacías o valores None
3. **Configuración de Nginx incorrecta**: Loop de redirección (ERR_TOO_MANY_REDIRECTS) por proxy_pass mal configurado

## Cambios Realizados

### 1. Modelo de Datos (`room-service/models.py`)
- ✅ Cambiado `default=list` a `server_default='[]'`
- ✅ Agregado `nullable=False` para garantizar que siempre haya un valor

### 2. Lógica de Creación (`room-service/main.py`)
- ✅ Validación explícita de `recursos` antes de guardar
- ✅ Manejo de errores con try-catch y rollback
- ✅ Mensajes de error descriptivos en español
- ✅ Logging para debugging

### 3. Script de Migración de Base de Datos
- ✅ Creado `database/fix_recursos_column.sql` para actualizar la columna

### 4. Configuración de Nginx (`frontend/nginx.conf`)
- ✅ Corregido proxy_pass para evitar loops de redirección
- ✅ Agregado `proxy_redirect off` en todas las rutas API
- ✅ Rutas sin `/` al final para evitar conflictos

## Pasos para Aplicar la Solución

### Opción 1: Con Docker (Recomendado)

```bash
# 1. Detener los servicios
docker-compose down

# 2. Aplicar el script de migración a la base de datos
docker-compose up -d postgres
docker exec -i escenario1-postgres-1 psql -U postgres -d meeting_rooms < database/fix_recursos_column.sql

# 3. Reconstruir y reiniciar los servicios (IMPORTANTE: frontend también)
docker-compose build room-service frontend
docker-compose up -d

# 4. Verificar los logs
docker-compose logs -f room-service
docker-compose logs -f frontend
```

### Opción 2: Sin Docker (Desarrollo Local)

```bash
# 1. Aplicar el script SQL directamente a PostgreSQL
psql -U postgres -d meeting_rooms -f database/fix_recursos_column.sql

# 2. Reiniciar el servicio de salas
# (Si está corriendo localmente, detenerlo y volverlo a iniciar)
cd room-service
python main.py
```

## Verificación

Después de aplicar los cambios:

1. **Abrir el panel de administración** en el navegador
2. **Intentar crear una nueva sala** con los siguientes datos de prueba:
   - Nombre: "Sala de Prueba"
   - Tipo: "sala"
   - Capacidad: 10
   - Recursos: Agregar algunos recursos como "computadora", "proyector"

3. **Verificar que se crea exitosamente** sin errores

## Cambios Técnicos Detallados

### Antes (Problemático):
```python
# models.py
recursos = Column(JSONB, default=list)  # ❌ Incorrecto

# main.py
new_room = Room(
    recursos=room_data.recursos,  # ❌ Puede ser None
    ...
)
db.add(new_room)
db.commit()  # ❌ Sin manejo de errores
```

### Después (Corregido):
```python
# models.py
recursos = Column(JSONB, nullable=False, server_default='[]')  # ✅ Correcto

# main.py
recursos_list = room_data.recursos if room_data.recursos is not None else []  # ✅ Validación
new_room = Room(
    recursos=recursos_list,  # ✅ Siempre es una lista
    ...
)
try:
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room
except Exception as e:
    db.rollback()  # ✅ Rollback en caso de error
    raise HTTPException(...)  # ✅ Error descriptivo
```

## Notas Adicionales

- Los cambios son compatibles con datos existentes
- El script SQL actualiza automáticamente registros con `recursos = NULL`
- Los logs ahora muestran errores detallados para debugging
- La validación funciona tanto para crear como para actualizar salas

## Soporte

Si el problema persiste después de aplicar estos cambios:

1. Verificar los logs del servicio: `docker-compose logs room-service`
2. Verificar la conexión a la base de datos
3. Confirmar que el script SQL se ejecutó correctamente
4. Revisar la consola del navegador (F12) para errores del frontend