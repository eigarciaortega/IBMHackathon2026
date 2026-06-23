Contexto del escenario 
El cliente llamado Corporativo Alpha es una empresa multinacional que esta transicionando a un método de trabajo hibrido, es decir su operación será de manera presencial y remota
Actualmente gestiona la reserva  de salas de juntas y espacios de trabajo “Hot Desks” mediante un archivo de Excel compartido, esto ha causado una serie de problemas:
•	Duplicidad de reservas, es decir, sucede cuando dos equipos llegan a la misma sala 
•	Espacios subutilizados
•	Falta de visibilidad  sobre quien esta en la oficina
•	Ausencia sobre el control de acceso y permisos otorgados
El objetivo como consultor Junior es desarrollar un MVP (Producto Minimo Viable) de una aplicación web que digitalice, automatice y optimice la gestión de espacios de  Corporativo Alpha

Requerimientos Funcionales
2.1 Sistema de Autenticación y Roles
El sistema debe implementar un mecanismo de autenticación básico que permita diferenciar entre roles. No se requiere un sistema de login robusto con encriptación avanzada, pero sí debe cumplir:
Requisitos Mínimos de Autenticación:
1.	Login Simulado/Simplificado:
o	Pantalla de login con usuario y contraseña
o	Validación básica (puede ser contra datos hardcodeados o en BD)
o	Generación de token JWT simple para mantener sesión
o	Tiempo estimado: No más de 2-3 horas de desarrollo

<img width="628" height="432" alt="Image" src="https://github.com/user-attachments/assets/28c21f06-22d6-4d55-a3ef-d1d2f8010abe" />

2.	Dos Roles Obligatorios:
o	Administrador: Acceso completo (CRUD de espacios además de todas las funciones de Colaborador)

<img width="1820" height="1012" alt="Image" src="https://github.com/user-attachments/assets/3a0b3401-3a37-431e-a150-9be2ed6b977e" />

o	Colaborador: Solo puede buscar, reservar y gestionar sus propias reservas

<img width="1852" height="1002" alt="Image" src="https://github.com/user-attachments/assets/e700be83-626c-450e-8b1b-8140c7f60497" />

3.	Usuarios de Prueba Predefinidos:
Admin:
- Usuario: admin@corporativoalpha.com
- Password: Admin123
- Rol: ADMINISTRADOR
Colaboradores:
- Usuario: carlos.mendez@corporativoalpha.com / Password: User123 / Rol: COLABORADOR
- Usuario: ana.torres@corporativoalpha.com / Password: User123 / Rol: COLABORADOR

2.2 Módulo de Gestión (Rol: Administrador)
1.	CRUD de Espacios: Capacidad de dar de alta salas o escritorios con atributos:
o	Nombre/ID
o	Tipo (Sala de juntas, Escritorio individual)
o	Capacidad (personas)
o	Recursos (¿Tiene proyector? ¿Tiene aire acondicionado?)
o	Piso/Ubicación

<img width="793" height="912" alt="Image" src="https://github.com/user-attachments/assets/81ce86c5-a8b8-4722-8eee-662ad0777167" />

2.	Dashboard de Ocupación: Vista rápida de qué espacios están ocupados el día de hoy

<img width="1792" height="352" alt="Image" src="https://github.com/user-attachments/assets/97f99517-63b5-4c2c-8ce6-df03b4732227" />

2.3 Módulo de Reserva (Rol: Colaborador)
1.	Buscador de Disponibilidad: El usuario selecciona fecha y hora (inicio/fin) y el sistema muestra solo los espacios disponibles

<img width="1781" height="377" alt="Image" src="https://github.com/user-attachments/assets/0d2c8772-0c50-42c3-b952-52cce4bdb93f" />

3.	Motor de Reservas (Lógica Crítica):o	El sistema NO debe permitir reservas encimadas (overlapping) en el mismo espacio
o	El sistema debe validar que la fecha de reserva no sea en el pasado
o	El sistema debe validar que la capacidad solicitada no exceda la del espacio
3.	"Mis Reservas": El usuario puede ver su historial y cancelar reservas futuras

<img width="1770" height="557" alt="Image" src="https://github.com/user-attachments/assets/43305a37-7275-47a4-b74d-f6bc97950522" />

2.4 Requisitos de Interfaz de Usuario (UI/UX)
Se requieren MÍNIMO 4 pantallas funcionales para garantizar una experiencia completa:
Pantallas Obligatorias:
1.	Pantalla de Login (Simulado)
o	Formulario simple con usuario/contraseña
o	Botón de "Iniciar Sesión"
o	Mensaje de error si credenciales inválidas
o	Redirección según rol después del login

2.	Panel de Búsqueda con Filtros
o	Selector de fecha y rango horario
o	Filtros por tipo de espacio (Sala/Escritorio)
o	Filtro por capacidad mínima
o	Lista de resultados con disponibilidad en tiempo real
o	Botón "Reservar" por cada espacio disponible
3.	Confirmación de Reserva
o	Resumen de la reserva (espacio, fecha, hora, capacidad)
o	Formulario para ingresar número de asistentes
o	Botón "Confirmar Reserva"
o	Mensaje de éxito/error
o	Opción de "Ver Mis Reservas"
4.	Vista de Administración (Solo Admin)
o	Dashboard con ocupación del día
o	Tabla de espacios con opciones CRUD
o	Formulario para crear/editar espacios
o	Estadísticas básicas (opcional pero valorado)
3. Requerimientos Técnicos (Stack Tecnológico)
3.1 Arquitectura del Sistema
DECISIÓN ARQUITECTÓNICA EXPLÍCITA:
El sistema debe implementarse como Microservicios con Base de Datos Compartida (Arquitectura Híbrida). 
Estructura de Servicios Requerida:

<img width="572" height="757" alt="image" src="https://github.com/user-attachments/assets/dc5d8a3a-8bb1-42e1-a786-86db4b0f3921" />
<img width="522" height="487" alt="image" src="https://github.com/user-attachments/assets/2d53fed1-db27-43c0-9c90-ebcdc0469a1d" />


Aunque los servicios comparten la misma base de datos PostgreSQL, cada servicio debe:
•	Tener su propio puerto y proceso independiente
•	Comunicarse con otros servicios vía HTTP (no acceso directo a funciones)

•	Poder desplegarse y escalarse de forma independiente
•	Tener su propio Dockerfile
3.2 Stack Tecnológico
•	Backend: Para la parte de backend se utilizo una arquitectura en capaz
•	Frontend: Libre elección (React, Angular, Vue, o HTML/CSS/JS puro)
o	Se valora la usabilidad (UX) más que la estética visual avanzada
o	Obligatorio: Implementar las 4 pantallas mínimas especificadas
•	Base de Datos: Relacional (MySQL/PostgreSQL/SQL Server) o NoSQL (MongoDB/Firebase)
o	Requisito: Debe existir un diagrama de entidad-relación (o esquema de documentos) lógico
o	Recomendado: PostgreSQL 15+ (incluido en el starter kit)
•	Repositorio: Todo el código debe estar en GitHub/GitLab con un historial de commits claro
3.3 Documentación de API (OBLIGATORIO)
NUEVO REQUISITO: Para facilitar la comunicación Dev-QA y la evaluación, se requiere:
1.	Swagger/OpenAPI Specification:
o	Documentación interactiva de todos los endpoints
o	Debe estar accesible en /api-docs cuando se levante el proyecto
o	Incluir ejemplos de request/response para cada endpoint
2.	Herramientas Aceptadas:
o	Swagger UI (Node.js: swagger-jsdoc + swagger-ui-express)
o	Springdoc (Java/Spring Boot)
o	FastAPI (Python - genera Swagger automáticamente)
o	NSwag (C#/.NET)
3.	Contenido Mínimo de la Documentación:
o	Descripción de cada endpoint
o	Parámetros requeridos y opcionales
o	Códigos de respuesta HTTP (200, 400, 401, 404, 409, 500)
o	Modelos de datos (schemas)
o	Ejemplos de uso
Beneficio: QA puede comenzar a diseñar pruebas en paralelo al desarrollo, y los jueces pueden evaluar la API sin necesidad de leer código.
________________________________________
4. Starter Kit: OfficeSpace - Gestión Híbrida Inteligente
4.1 Estructura de Archivos Recomendada
<img width="627" height="345" alt="image" src="https://github.com/user-attachments/assets/06a4ae40-c29b-48ab-87d8-21f4ee7dfade" />

4.2 El Desafío de Lógica (Para el README)
Se debe incluir estas instrucciones en el README.md del kit:
REGLAS DEL RETO:
1.	Validación de Capacidad: No puedes reservar una sala para 6 personas si su capacidad es de 4.
2.	Validación de Horario (The Core): El sistema debe impedir que se cree una reserva si el espacio ya está ocupado en ese intervalo.
o	Ejemplo: Si alguien reservó de 09:00 a 10:00, no puedes reservar de 09:30 a 11:00.
3.	Consistencia Temporal: Las reservas no pueden tener una hora de fin menor a la de inicio.
4.	Validación de Fecha: No se pueden crear reservas en el pasado.
5.	Autenticación: Solo usuarios autenticados pueden crear reservas. Solo administradores pueden gestionar espacios.
