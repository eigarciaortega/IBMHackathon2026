import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import cancellation from './cancellationValidator.js';

const { cancellationValidator, ESTADO_CANCELADO } = cancellation;

/**
 * Feature: officespace-management, Property 11: Reglas de cancelación de Reservas propias
 *
 * For any Reserva propia, la cancelación SHALL cambiar su `estado_reserva` a
 * "Cancelado" (HTTP 200) si y solo si su `fecha_inicio` es posterior al instante
 * actual y su `estado_reserva` no es ya "Cancelado"; en cualquier otro caso
 * (pasada o ya cancelada) el sistema SHALL rechazar la solicitud y conservar el
 * estado original.
 *
 * Alcance: esta propiedad se centra en Reservas **propias** (id_usuario === usuario.sub).
 * La regla de propiedad/403 (R7.6) se cubre en Property 10 (tarea 5.10).
 *
 * **Validates: Requirements 7.3, 7.4, 7.5**
 */
describe('Feature: officespace-management, Property 11: Reglas de cancelación de Reservas propias', () => {
  // Instante de referencia inyectado (UTC) para reproducibilidad.
  const AHORA_MS = Date.parse('2025-06-15T12:00:00Z');

  it('autoriza la cancelación si y solo si la Reserva propia es futura y no está cancelada', () => {
    fc.assert(
      fc.property(
        // Identificador del propietario/solicitante (Reserva propia: ambos coinciden).
        fc.oneof(fc.integer({ min: 1, max: 100000 }), fc.uuid()),
        // Desplazamiento en ms del inicio respecto a `ahora`: cubre pasado, exacto y futuro.
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        // Estado de la Reserva.
        fc.constantFrom('Activo', ESTADO_CANCELADO),
        (sub, offsetMs, estado) => {
          const fechaInicio = new Date(AHORA_MS + offsetMs);
          const reserva = {
            id_usuario: sub, // Reserva propia
            fecha_inicio: fechaInicio,
            estado_reserva: estado,
          };
          const usuario = { sub };

          const resultado = cancellationValidator(reserva, usuario, new Date(AHORA_MS));

          // Autorización esperada calculada de forma independiente:
          // futura (inicio > ahora) Y no cancelada.
          const esFutura = AHORA_MS + offsetMs > AHORA_MS;
          const noCancelada = estado !== ESTADO_CANCELADO;
          const esperadoAutorizado = esFutura && noCancelada;

          expect(resultado.autorizado).toBe(esperadoAutorizado);

          if (esperadoAutorizado) {
            // R7.3: cancelación autorizada (mapeable a 200).
            expect(resultado.statusCode).toBeUndefined();
          } else {
            // R7.4 / R7.5: rechazo conservando el estado original (no autorizado).
            // La Reserva de entrada no es mutada por la función pura.
            expect(resultado.autorizado).toBe(false);
            expect(reserva.estado_reserva).toBe(estado);
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});
