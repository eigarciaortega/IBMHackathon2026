# language: es

Caracteristica: Autenticacion de usuarios
  Como usuario del sistema
  Quiero poder iniciar sesion
  Para acceder a las funciones segun mi rol

  Escenario: Login exitoso como Administrador
    Dado que estoy en la pantalla de login
    Cuando ingreso el email "admin@corporativoalpha.com"
    Y ingreso la contrasena "Admin123"
    Y hago clic en "Iniciar Sesion"
    Entonces debo ser redirigido al panel de administracion
    Y debo ver el dashboard de ocupacion con filtro de fecha

  Escenario: Login exitoso como Colaborador
    Dado que estoy en la pantalla de login
    Cuando ingreso el email "carlos.mendez@corporativoalpha.com"
    Y ingreso la contrasena "User123"
    Y hago clic en "Iniciar Sesion"
    Entonces debo ser redirigido a la pantalla de busqueda de espacios

  Escenario: Login fallido con credenciales incorrectas
    Dado que estoy en la pantalla de login
    Cuando ingreso el email "usuario@falso.com"
    Y ingreso la contrasena "12345"
    Y hago clic en "Iniciar Sesion"
    Entonces debo ver el mensaje "Credenciales invalidas"

---

Caracteristica: Gestion de espacios
  Como administrador
  Quiero gestionar los espacios de trabajo
  Para mantener actualizado el catalogo de salas y escritorios

  Escenario: Crear un nuevo espacio exitosamente
    Dado que estoy autenticado como Administrador
    Y estoy en el panel de administracion
    Cuando hago clic en "+ Nuevo Espacio"
    Y ingreso el nombre "Sala de Innovacion"
    Y selecciono el tipo "Sala de juntas"
    Y ingreso la capacidad "10"
    Y ingreso el piso "Piso 4"
    Y marco los recursos Proyector y Pizarron
    Y hago clic en "Guardar Espacio"
    Entonces debo ver el nuevo espacio en la tabla con estado Libre

  Escenario: Editar un espacio existente
    Dado que estoy autenticado como Administrador
    Y existe el espacio "Sala Creativa"
    Cuando hago clic en "Editar" para ese espacio
    Y modifico la capacidad a "10"
    Y agrego el recurso "Microfono"
    Y hago clic en "Guardar Cambios"
    Entonces el espacio debe mostrar la capacidad y recursos actualizados

  Escenario: Eliminar un espacio existente
    Dado que estoy autenticado como Administrador
    Y existe el espacio "Sala de Innovacion"
    Cuando hago clic en "Eliminar" para ese espacio
    Y confirmo la eliminacion
    Entonces el espacio ya no debe aparecer en la tabla

  Escenario: Filtrar ocupacion por fecha en el dashboard
    Dado que estoy autenticado como Administrador
    Y estoy en el panel de administracion
    Cuando selecciono la fecha "25/06/2026"
    Y ingreso hora inicio "09:00" y hora fin "11:00"
    Y hago clic en "Ver ocupacion"
    Entonces debo ver que espacios estan libres y cuales ocupados para ese horario

---

Caracteristica: Busqueda de espacios
  Como colaborador
  Quiero buscar espacios disponibles
  Para encontrar el espacio que mejor se adapte a mis necesidades

  Escenario: Buscar espacios solo con fecha
    Dado que estoy autenticado como Colaborador
    Y estoy en la pantalla de busqueda
    Cuando selecciono la fecha "25/06/2026"
    Y no ingreso hora inicio ni fin
    Y hago clic en "Buscar Espacios"
    Entonces debo ver todos los espacios disponibles para ese dia

  Escenario: Buscar espacios con filtro de piso
    Dado que estoy autenticado como Colaborador
    Cuando selecciono la fecha "25/06/2026"
    Y selecciono el piso "Piso 2"
    Y hago clic en "Buscar Espacios"
    Entonces debo ver solo espacios ubicados en el Piso 2

  Escenario: Buscar espacios con filtro de recursos
    Dado que estoy autenticado como Colaborador
    Cuando selecciono la fecha "25/06/2026"
    Y marco el recurso "Proyector"
    Y hago clic en "Buscar Espacios"
    Entonces debo ver solo espacios que tengan proyector

  Escenario: Limpiar resultados al cambiar fecha
    Dado que estoy autenticado como Colaborador
    Y hay resultados de busqueda visibles
    Cuando cambio la fecha a una diferente
    Entonces los resultados anteriores deben desaparecer automaticamente

  Escenario: No se puede buscar en fecha pasada
    Dado que estoy autenticado como Colaborador
    Cuando selecciono una fecha anterior a hoy
    Y hago clic en "Buscar Espacios"
    Entonces debo ver el mensaje "La fecha seleccionada ya paso"

---

Caracteristica: Reserva de espacios
  Como colaborador
  Quiero reservar espacios de trabajo
  Para planificar mis actividades en la oficina

  Escenario: Crear reserva con hora preseleccionada
    Dado que estoy autenticado como Colaborador
    Y busque espacios con hora inicio "09:00" y hora fin "11:00"
    Cuando hago clic en "Reservar" en la "Sala Creativa"
    Y ingreso el numero de asistentes "5"
    Y hago clic en "Confirmar Reserva"
    Entonces debo ver el mensaje "Reserva confirmada"
    Y la reserva debe aparecer en "Mis Reservas"

  Escenario: Crear reserva sin hora preseleccionada
    Dado que estoy autenticado como Colaborador
    Y busque espacios solo con fecha
    Cuando hago clic en "Reservar" en cualquier espacio
    Y ingreso hora inicio "10:00" y hora fin "12:00" en la pantalla de confirmacion
    Y ingreso el numero de asistentes "3"
    Y hago clic en "Confirmar Reserva"
    Entonces debo ver el mensaje "Reserva confirmada"

  Escenario: Prevencion de reservas solapadas
    Dado que existe una reserva activa en "Sala Creativa" de 09:00 a 11:00
    Cuando busco espacios disponibles para el mismo horario
    Entonces la "Sala Creativa" no debe aparecer en los resultados

  Escenario: Validacion de capacidad excedida
    Dado que estoy autenticado como Colaborador
    Y el "Escritorio Ventana" tiene capacidad para 1 persona
    Cuando intento reservarlo para 5 asistentes
    Entonces debo ver el mensaje "El espacio solo tiene capacidad para 1 personas"

---

Caracteristica: Gestion de mis reservas
  Como colaborador
  Quiero gestionar mis reservas
  Para poder modificarlas o cancelarlas segun mis necesidades

  Escenario: Ver mis reservas con estados correctos
    Dado que estoy autenticado como Colaborador
    Cuando voy a "Mis Reservas"
    Entonces debo ver reservas con estado "Activa" en verde
    Y reservas pasadas con estado "Finalizada" en gris
    Y reservas canceladas con estado "Cancelada" en rojo

  Escenario: Modificar una reserva activa
    Dado que estoy autenticado como Colaborador
    Y tengo una reserva activa futura
    Cuando hago clic en "Modificar"
    Y cambio la fecha o el horario
    Y hago clic en "Guardar cambios"
    Entonces la reserva debe actualizarse con los nuevos datos

  Escenario: Cancelar una reserva futura
    Dado que estoy autenticado como Colaborador
    Y tengo una reserva activa en el futuro
    Cuando hago clic en "Cancelar Reserva"
    Y confirmo la cancelacion
    Entonces la reserva debe mostrar el estado "Cancelada"

---

Caracteristica: Seguridad y control de acceso
  Como sistema
  Quiero controlar el acceso segun el rol del usuario
  Para garantizar la seguridad de la informacion

  Escenario: Colaborador no puede acceder al panel de Admin
    Dado que estoy autenticado como Colaborador
    Cuando intento acceder a "/admin" directamente en el navegador
    Entonces debo ser redirigido al login

  Escenario: Usuario no autenticado no puede hacer reservas
    Dado que no estoy autenticado
    Cuando intento acceder a "/search" directamente
    Entonces debo ser redirigido al login