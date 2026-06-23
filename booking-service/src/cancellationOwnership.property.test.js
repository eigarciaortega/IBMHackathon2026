import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import cancellation from './cancellationValidator.js';

const { cancellationValidator } = cancellation;

/**
 * Feature: officespace-management, Property 10: Propiedad de Reserva en
 * cancelación/modificación — For any solicitud de modificación o cancelación de
 * una Reserva realizada por un Usuario que NO es su propietario, el sistema
 * SHALL responder con código HTTP 403 sin modificar la Reserva.
 *
 * Validates: Requirements 2.5, 7.6
 *
 * Estrategia: se generan Reservas cuyo `id_usuario` (propietario) y el `sub`
 * del Usuario solicitante DIFIEREN siempre, con `estado_reserva` y
 * `fecha_inicio` aleatorios (incluyendo pasadas/futuras y "Activo"/"Cancelado").
 * Así se comprueba que la verificación de propiedad (403) tiene precedencia
 * sobre cualquier otra condición y que la Reserva no se modifica.
 */

const ESTADOS = ['Activo', 'Cancelado'];

/** Genera un id (número o string numérico) para propietario/solicitante. */
const idArb = fc.oneof(
  fc.integer({ min: 1, max: 1_000_000 }),
  fc.integer({ min: 1, max: 1_000_000 }).map((n) => String(n))
);

/** Normaliza un id a su valor numérico para comparar igualdad semántica. */
function idValue(id) {
  return Number(id);
}

describe('Property 10: propiedad de Reserva en cancelación/modificación', () => {
  it('rechaza con 403 AUTHORIZATION_ERROR cuando el solicitante no es el propietario', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        fc.constantFrom(...ESTADOS),
        // fecha_inicio aleatoria: puede ser pasada o futura respecto a `ahora`.
        fc.integer({ min: -10_000_000_000, max: 10_000_000_000 }),
        fc.date({ min: new Date('2000-01-01T00:00:00Z'), max: new Date('2100-01-01T00:00:00Z') }),
        (ownerId, requesterId, estado, offsetMs, ahora) => {
          // Forzar que propietario y solicitante DIFIERAN siempre.
          fc.pre(idValue(ownerId) !== idValue(requesterId));

          const fechaInicio = new Date(ahora.getTime() + offsetMs);
          const reserva = {
            id_reserva: 42,
            id_usuario: ownerId,
            fecha_inicio: fechaInicio,
            estado_reserva: estado,
          };
          const snapshot = JSON.stringify(reserva);
          const usuario = { sub: requesterId };

          const resultado = cancellationValidator(reserva, usuario, ahora);

          // 403 con código de autorización, sin importar estado/fecha.
          expect(resultado.autorizado).toBe(false);
          expect(resultado.statusCode).toBe(403);
          expect(resultado.codigoError).toBe('AUTHORIZATION_ERROR');

          // La Reserva no se modifica.
          expect(JSON.stringify(reserva)).toBe(snapshot);
        }
      ),
      { numRuns: 200 }
    );
  });
});
