# Historias de Usuario — NeoWallet P2P Payments

**Proyecto:** NeoWallet | **Versión:** 1.0 | **Estado:** Aprobado

---

## HU-001: Consultar Saldo

**Como** usuario de NeoWallet  
**Quiero** consultar mi saldo actual  
**Para** saber cuánto dinero tengo disponible antes de hacer una transferencia

**Criterios de Aceptación:**
- [ ] Puedo consultar mi saldo enviando mi ID de usuario
- [ ] El sistema retorna mi nombre, email y saldo con 2 decimales
- [ ] Si mi ID no existe recibo un error 404 claro
- [ ] La respuesta llega en menos de 100ms
- [ ] Necesito un token JWT válido para consultar

**Estimación:** 2 puntos | **Prioridad:** Alta

---

## HU-002: Recargar Saldo

**Como** usuario de NeoWallet  
**Quiero** agregar fondos a mi billetera  
**Para** tener saldo disponible para realizar transferencias

**Criterios de Aceptación:**
- [ ] Puedo indicar el monto a recargar y el método de pago (simulado)
- [ ] El monto debe ser mayor a $0.00
- [ ] El monto máximo de recarga es $50,000.00
- [ ] Recibo confirmación con el nuevo saldo actualizado
- [ ] Rechaza montos negativos o cero con error descriptivo
- [ ] La operación es atómica (todo o nada)

**Estimación:** 3 puntos | **Prioridad:** Alta

---

## HU-003: Transferir Dinero a Otro Usuario

**Como** usuario de NeoWallet  
**Quiero** enviar dinero a otro usuario  
**Para** pagar deudas o hacer pagos P2P de forma instantánea

**Criterios de Aceptación:**
- [ ] Puedo especificar el ID del destinatario y el monto
- [ ] El sistema verifica que tengo fondos suficientes antes de procesar
- [ ] El dinero se descuenta de mi cuenta y se agrega a la del destinatario
- [ ] Recibo un ID de transacción único para rastreo
- [ ] No puedo transferirme dinero a mí mismo
- [ ] Si algo falla durante el proceso, mi dinero es devuelto automáticamente
- [ ] No se pierde dinero bajo ninguna circunstancia

**Estimación:** 8 puntos | **Prioridad:** Crítica

---

## HU-004: Ver Historial de Transacciones

**Como** usuario de NeoWallet  
**Quiero** ver mis transacciones pasadas  
**Para** tener control de mis movimientos financieros

**Criterios de Aceptación:**
- [ ] Veo todas las transferencias que envié y recibí
- [ ] Cada transacción muestra: monto, fecha, tipo (enviado/recibido), estado
- [ ] Las transacciones están ordenadas de más reciente a más antigua
- [ ] El historial carga correctamente con autenticación JWT

**Estimación:** 3 puntos | **Prioridad:** Baja (Bonus)

---

## HU-005: Autenticación con JWT

**Como** usuario de NeoWallet  
**Quiero** obtener un token de acceso con mis credenciales  
**Para** poder utilizar los endpoints protegidos de la API

**Criterios de Aceptación:**
- [ ] Puedo autenticarme con mi email y contraseña
- [ ] Recibo un JWT token válido por 24 horas
- [ ] Los endpoints protegidos rechazan peticiones sin token con 401
- [ ] Un token inválido o expirado retorna 401

**Estimación:** 3 puntos | **Prioridad:** Alta

---

## Resumen del Backlog

| ID     | Historia                   | Puntos | Prioridad |
|--------|----------------------------|--------|-----------|
| HU-001 | Consultar saldo            | 2      | Alta      |
| HU-002 | Recargar saldo             | 3      | Alta      |
| HU-003 | Transferencia P2P          | 8      | Crítica   |
| HU-004 | Historial transacciones    | 3      | Baja      |
| HU-005 | Autenticación JWT          | 3      | Alta      |
| **Total** |                         | **19** |           |
