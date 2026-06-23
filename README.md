Contexto del escenario
El cliente llamado Corporativo Alpha es una empresa multinacional que esta transicionando a un método de trabajo hibrido, es decir su operación será de manera presencial y remota
Actualmente gestiona la reserva de salas de juntas y espacios de trabajo “Hot Desks” mediante un archivo de Excel compartido, esto ha causado una serie de problemas:
• Duplicidad de reservas, es decir, sucede cuando dos equipos llegan a la misma sala
• Espacios subutilizados
• Falta de visibilidad sobre quien esta en la oficina
• Ausencia sobre el control de acceso y permisos otorgados
El objetivo como consultor Junior es desarrollar un MVP (Producto Minimo Viable) de una aplicación web que digitalice, automatice y optimice la gestión de espacios de Corporativo Alpha

Requerimientos Funcionales
2.1 Sistema de Autenticación y Roles
El sistema debe implementar un mecanismo de autenticación básico que permita diferenciar entre roles. No se requiere un sistema de login robusto con encriptación avanzada, pero sí debe cumplir:
Requisitos Mínimos de Autenticación:

Login Simulado/Simplificado:
o Pantalla de login con usuario y contraseña
o Validación básica (puede ser contra datos hardcodeados o en BD)
o Generación de token JWT simple para mantener sesión
o Tiempo estimado: No más de 2-3 horas de desarrollo

Dos Roles Obligatorios:
o Administrador: Acceso completo (CRUD de espacios además de todas las funciones de Colaborador)

o Colaborador: Solo puede buscar, reservar y gestionar sus propias reservas


Usuarios de Prueba Predefinidos:
Admin:
Usuario: admin@corporativoalpha.com
Password: Admin123
Rol: ADMINISTRADOR
Colaboradores:
Usuario: carlos.mendez@corporativoalpha.com / Password: User123 / Rol: COLABORADOR
Usuario: ana.torres@corporativoalpha.com / Password: User123 / Rol: COLABORADOR
2.2 Módulo de Gestión (Rol: Administrador)

CRUD de Espacios: Capacidad de dar de alta salas o escritorios con atributos:
o Nombre/ID
o Tipo (Sala de juntas, Escritorio individual)
o Capacidad (personas)
o Recursos (¿Tiene proyector? ¿Tiene aire acondicionado?)
o Piso/Ubicación

Dashboard de Ocupación: Vista rápida de qué espacios están ocupados el día de hoy

2.3 Módulo de Reserva (Rol: Colaborador)

Buscador de Disponibilidad: El usuario selecciona fecha y hora (inicio/fin) y el sistema muestra solo los espacios disponibles

Motor de Reservas (Lógica Crítica):o El sistema NO debe permitir reservas encimadas (overlapping) en el mismo espacio
o El sistema debe validar que la fecha de reserva no sea en el pasado
o El sistema debe validar que la capacidad solicitada no exceda la del espacio
"Mis Reservas": El usuario puede ver su historial y cancelar reservas futuras

2.4 Requisitos de Interfaz de Usuario (UI/UX)
Se requieren MÍNIMO 4 pantallas funcionales para garantizar una experiencia completa:
Pantallas Obligatorias:

Pantalla de Login (Simulado)
o Formulario simple con usuario/contraseña
o Botón de "Iniciar Sesión"
o Mensaje de error si credenciales inválidas
o Redirección según rol después del login

Panel de Búsqueda con Filtros
o Selector de fecha y rango horario
o Filtros por tipo de espacio (Sala/Escritorio)
o Filtro por capacidad mínima
o Lista de resultados con disponibilidad en tiempo real
o Botón "Reservar" por cada espacio disponible

Confirmación de Reserva
o Resumen de la reserva (espacio, fecha, hora, capacidad)
o Formulario para ingresar número de asistentes
o Botón "Confirmar Reserva"
o Mensaje de éxito/error
o Opción de "Ver Mis Reservas"

Vista de Administración (Solo Admin)
o Dashboard con ocupación del día
o Tabla de espacios con opciones CRUD
o Formulario para crear/editar espacios
o Estadísticas básicas (opcional pero valorado)

Requerimientos Técnicos (Stack Tecnológico)
3.1 Arquitectura del Sistema
DECISIÓN ARQUITECTÓNICA EXPLÍCITA:
El sistema debe implementarse como Microservicios con Base de Datos Compartida (Arquitectura Híbrida).
Estructura de Servicios Requerida:
/officespace-starter-2026
|
|----/catalog-service # Microservicio A: Gestión de Espacios
| |---src
| | |---/controllers
| | |---/models
| | |---/routes

| | |---/services
| |--- package.json
| |--- Dockerfile
| |--- README.md
|
|---/booking-service # Microservicio B: Motor de Reservas
| |--- /src
| | |---/controllers
| | |---/models
| | |---/routes
| | |---/services
| | |---/validators # Validaciones críticas
| |--- package.json
| |--- Dockerfile
| |--- README.md
|
|-- /auth-service # Microservicio C: Autenticación (OPCIONAL)
| └── (Si el equipo decide separar la autenticación)
|
|--- /frontend # Aplicación Web
| |--- /public
| |--- /src
| | |---/components
| | |---/pages #Las 4 pantallas mínimo
| | |---/services #API clients
| | |---/utils
| |--- package.json
| |--- Dockerfile
|
|--- /shared-infra # Configuración Común}
| |---init-db.sql # Script de inicialización DB
| |---/scripts
|
|---docker-compose.yml # Orquestación de contenedores
|---README.md # Documentación principal
Aunque los servicios comparten la misma base de datos PostgreSQL, cada servicio debe:
• Tener su propio puerto y proceso independiente
• Comunicarse con otros servicios vía HTTP (no acceso directo a funciones)

• Poder desplegarse y escalarse de forma independiente
• Tener su propio Dockerfile
3.2 Stack Tecnológico
• Backend: Para la parte de backend se utilizo una arquitectura en capaz
• Frontend: Libre elección (React, Angular, Vue, o HTML/CSS/JS puro)
o Se valora la usabilidad (UX) más que la estética visual avanzada
o Obligatorio: Implementar las 4 pantallas mínimas especificadas
• Base de Datos: Relacional (MySQL/PostgreSQL/SQL Server) o NoSQL (MongoDB/Firebase)
o Requisito: Debe existir un diagrama de entidad-relación (o esquema de documentos) lógico
o Recomendado: PostgreSQL 15+ (incluido en el starter kit)
• Repositorio: Todo el código debe estar en GitHub/GitLab con un historial de commits claro
3.3 Documentación de API (OBLIGATORIO)
NUEVO REQUISITO: Para facilitar la comunicación Dev-QA y la evaluación, se requiere:

Swagger/OpenAPI Specification:
o Documentación interactiva de todos los endpoints
o Debe estar accesible en /api-docs cuando se levante el proyecto
o Incluir ejemplos de request/response para cada endpoint
Herramientas Aceptadas:
o Swagger UI (Node.js: swagger-jsdoc + swagger-ui-express)
o Springdoc (Java/Spring Boot)
o FastAPI (Python - genera Swagger automáticamente)
o NSwag (C#/.NET)
Contenido Mínimo de la Documentación:
o Descripción de cada endpoint
o Parámetros requeridos y opcionales
o Códigos de respuesta HTTP (200, 400, 401, 404, 409, 500)
o Modelos de datos (schemas)
o Ejemplos de uso
Beneficio: QA puede comenzar a diseñar pruebas en paralelo al desarrollo, y los jueces pueden evaluar la API sin necesidad de leer código.
Starter Kit: OfficeSpace - Gestión Híbrida Inteligente
4.1 Estructura de Archivos Recomendada
/officespace-starter-2026
│
├── /catalog-service # Microservicio A (Lista de salas/escritorios)
├── /booking-service # Microservicio B (Motor de reservas y lógica)
├── /frontend # Aplicación Web React/Vue/Angular
├── /shared-infra # Configuración común
│ └── init-db.sql # Script de base de datos
├── /docs # Documentación técnica
│ ├── ARCHITECTURE.md # Decisiones arquitectónicas
│ └── API_CONTRACT.md # Contrato de API
├── docker-compose.yml # Orquestación de contenedores
└── README.md # Manual de instrucciones
4.2 El Desafío de Lógica (Para el README)
Se debe incluir estas instrucciones en el README.md del kit:
REGLAS DEL RETO:
Validación de Capacidad: No puedes reservar una sala para 6 personas si su capacidad es de 4.
Validación de Horario (The Core): El sistema debe impedir que se cree una reserva si el espacio ya está ocupado en ese intervalo.
o Ejemplo: Si alguien reservó de 09:00 a 10:00, no puedes reservar de 09:30 a 11:00.
Consistencia Temporal: Las reservas no pueden tener una hora de fin menor a la de inicio.
Validación de Fecha: No se pueden crear reservas en el pasado.
Autenticación: Solo usuarios autenticados pueden crear reservas. Solo administradores pueden gestionar espacios.
