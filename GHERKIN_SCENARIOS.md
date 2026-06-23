# Escenarios BDD (Gherkin) — OfficeSpace

Lenguaje: español de Gherkin. 15 escenarios que cubren autenticación, espacios, reservas, asistencia, exportación, auditoría, dashboard y FAQ.

```gherkin
# language: es

Característica: Autenticación y roles
  Para proteger el sistema
  Como plataforma corporativa
  Quiero autenticar usuarios y diferenciar roles

  Escenario: Login de administrador exitoso
    Dado que existe el usuario "admin@corporativoalpha.com" con rol ADMIN
    Cuando inicia sesión con la contraseña "Admin123"
    Entonces el sistema responde 200
    Y devuelve un token JWT válido
    Y muestra el menú administrativo

  Escenario: Login de colaborador exitoso
    Dado que existe el usuario "colaborador@corporativoalpha.com" con rol COLLABORATOR
    Cuando inicia sesión con la contraseña "Colab123"
    Entonces el sistema responde 200
    Y NO muestra las rutas administrativas

  Escenario: Login con credenciales inválidas
    Dado que existe el usuario "admin@corporativoalpha.com"
    Cuando inicia sesión con la contraseña "incorrecta"
    Entonces el sistema responde 401
    Y muestra "Usuario o contraseña incorrectos"
    Y no entrega ningún token
```

```gherkin
# language: es

Característica: Gestión de espacios (Administrador)
  Para administrar el inventario de espacios
  Como administrador
  Quiero crear, editar y eliminar espacios

  Antecedentes:
    Dado que he iniciado sesión como ADMIN

  Escenario: Crear un espacio
    Cuando creo un espacio "Sala Innovación" con capacidad 8 en "Piso 1" zona "Norte"
    Entonces el sistema responde 201
    Y el espacio queda en estado AVAILABLE
    Y se registra el evento "CREATE_SPACE" en auditoría

  Escenario: Editar un espacio
    Dado que existe el espacio "Sala Innovación"
    Cuando actualizo su capacidad a 12
    Entonces el sistema responde 200
    Y se registra el evento "UPDATE_SPACE"

  Escenario: Eliminar (desactivar) un espacio
    Dado que existe el espacio "Sala Innovación" sin reservas futuras
    Cuando lo elimino
    Entonces su estado cambia a INACTIVE
    Y deja de aparecer para los colaboradores
    Y se registra el evento "DISABLE_SPACE"
```

```gherkin
# language: es

Característica: Reservas y anti-solapamiento
  Para evitar conflictos de horario
  Como colaborador
  Quiero reservar espacios disponibles sin choques

  Antecedentes:
    Dado que he iniciado sesión como COLLABORATOR
    Y existe el espacio "Sala Creativa" en estado AVAILABLE con capacidad 8

  Escenario: Crear una reserva válida
    Cuando reservo "Sala Creativa" el "2026-12-01" de "09:00" a "10:00" para 4 personas
    Entonces el sistema responde 201
    Y la reserva queda en estado CONFIRMED
    Y recibo una notificación "Reserva creada"

  Escenario: Evitar reservas solapadas
    Dado que existe una reserva de "Sala Creativa" el "2026-12-01" de "09:00" a "10:00"
    Cuando intento reservar "Sala Creativa" el "2026-12-01" de "09:30" a "10:30"
    Entonces el sistema responde 409
    Y la reserva no se crea

  Escenario: Permitir reservas consecutivas
    Dado que existe una reserva de "Sala Creativa" el "2026-12-01" de "09:00" a "10:00"
    Cuando reservo "Sala Creativa" el "2026-12-01" de "10:00" a "11:00"
    Entonces el sistema responde 201

  Escenario: Cancelar una reserva propia
    Dado que tengo una reserva CONFIRMED futura
    Cuando la cancelo
    Entonces su estado cambia a CANCELLED
    Y el horario vuelve a estar disponible
    Y se registra el evento "CANCEL_BOOKING"
```

```gherkin
# language: es

Característica: Control de asistencia
  Para conocer el uso real de los espacios
  Como administrador
  Quiero verificar la asistencia tras finalizar la reserva

  Antecedentes:
    Dado que he iniciado sesión como ADMIN
    Y existe una reserva CONFIRMED cuya hora de fin ya pasó

  Escenario: Ver reservas por verificar
    Cuando abro la sección "Reservas por verificar"
    Entonces veo las reservas finalizadas que siguen en estado CONFIRMED

  Escenario: Marcar asistencia (ATTENDED)
    Cuando marco la reserva como "Asistió"
    Entonces su estado cambia a ATTENDED
    Y se registra el evento "MARK_ATTENDED"
    Y aumenta la tasa de asistencia del dashboard

  Escenario: Marcar inasistencia (NO_SHOW)
    Cuando marco la reserva como "No asistió"
    Entonces su estado cambia a NO_SHOW
    Y se registra el evento "MARK_NO_SHOW"
```

```gherkin
# language: es

Característica: Datos, métricas y soporte
  Para gobernar y analizar el sistema
  Como administrador
  Quiero exportar datos, ver métricas, auditar y consultar el FAQ

  Escenario: Exportar datos a CSV
    Dado que he iniciado sesión como ADMIN
    Cuando exporto las reservas en formato CSV
    Entonces descargo un archivo "bookings.csv"
    Y el archivo de usuarios no incluye contraseñas

  Escenario: Consultar la auditoría
    Dado que he iniciado sesión como ADMIN
    Y se han generado eventos en el sistema
    Cuando consulto la auditoría filtrando por "CREATE_BOOKING"
    Entonces veo la lista paginada de eventos con usuario, fecha y resultado

  Escenario: Ver el dashboard administrativo
    Dado que he iniciado sesión como ADMIN
    Cuando abro el dashboard
    Entonces veo ocupación, horas pico, espacios más usados y la tasa de asistencia

  Escenario: Consultar el asistente FAQ
    Dado que he iniciado sesión
    Cuando pregunto "como reservo un espacio" en el asistente FAQ
    Entonces recibo la respuesta correspondiente
    Y si no hay coincidencia, recibo categorías y preguntas sugeridas
```
