# language: es
Característica: Autenticación y control de acceso por rol
  Como Corporativo Alpha
  Quiero proteger los endpoints y separar lo que puede hacer cada rol
  Para tener control de acceso (algo que el Excel compartido no daba)

  Escenario: Login exitoso devuelve un JWT con el rol
    Cuando inicio sesión con "admin@corporativoalpha.com" y "Admin123"
    Entonces la respuesta es 200
    Y recibo un token JWT
    Y el rol es "ADMINISTRADOR"

  Escenario: Login con contraseña incorrecta
    Cuando inicio sesión con "admin@corporativoalpha.com" y "incorrecta"
    Entonces la respuesta es 401
    Y el código de error es "CREDENCIALES_INVALIDAS"

  Escenario: Un endpoint protegido rechaza peticiones sin token
    Dado que no envío ningún token
    Cuando consulto la lista de espacios
    Entonces la respuesta es 401

  Escenario: Un colaborador no puede crear espacios
    Dado que inicié sesión como "carlos.mendez@corporativoalpha.com"
    Cuando intento crear un espacio
    Entonces la respuesta es 403
    Y el código de error es "ACCESO_DENEGADO"

  Escenario: Un administrador sí puede crear espacios
    Dado que inicié sesión como "admin@corporativoalpha.com"
    Cuando intento crear un espacio
    Entonces la respuesta es 201

  Escenario: Un colaborador no puede cancelar la reserva de otro
    Dado que inicié sesión como "ana.torres@corporativoalpha.com"
    Y existe una reserva de "carlos.mendez@corporativoalpha.com"
    Cuando intento cancelar esa reserva
    Entonces la respuesta es 403
    Y el código de error es "ACCESO_DENEGADO"
