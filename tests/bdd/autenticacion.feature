# language: es
Característica: Autenticación y control de acceso
  Como usuario del sistema OfficeSpace
  Quiero iniciar sesión de forma segura
  Para acceder a las funciones correspondientes a mi rol

  Antecedentes:
    Dado que el sistema está disponible
    Y existen los usuarios semilla

  Escenario: Inicio de sesión exitoso como administrador
    Cuando inicio sesión con "admin@corporativoalpha.com" y "Admin123"
    Entonces recibo un código HTTP 200
    Y obtengo un token JWT con rol "ADMINISTRADOR"
    Y soy redirigido a la vista de administración

  Escenario: Inicio de sesión exitoso como colaborador
    Cuando inicio sesión con "carlos.mendez@corporativoalpha.com" y "User123"
    Entonces recibo un código HTTP 200
    Y obtengo un token JWT con rol "COLABORADOR"
    Y soy redirigido al panel de búsqueda

  Escenario: Credenciales inválidas
    Cuando inicio sesión con "admin@corporativoalpha.com" y "claveIncorrecta"
    Entonces recibo un código HTTP 401
    Y no se emite ningún token
    Y permanezco en la pantalla de inicio de sesión

  Escenario: Bloqueo tras cinco intentos fallidos
    Dado que he fallado 5 intentos de inicio de sesión consecutivos para "ana.torres@corporativoalpha.com"
    Cuando intento iniciar sesión una vez más
    Entonces recibo un código HTTP 429
    Y el acceso queda bloqueado temporalmente

  Escenario: Acceso a un endpoint protegido sin token
    Cuando solicito "GET /reservas/mias" sin token de autenticación
    Entonces recibo un código HTTP 401
