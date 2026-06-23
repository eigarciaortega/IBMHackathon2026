import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import auth from './authMiddleware.js';

const { requireRole } = auth;

/**
 * Feature: officespace-management, Property 9: Autorización basada en rol
 *
 * For any solicitud de creación, actualización o eliminación de un Espacio
 * realizada por un Usuario con Rol COLABORADOR, el sistema responde 403 sin
 * modificar datos; y for any operación de Espacio realizada por un Usuario con
 * Rol ADMINISTRADOR el sistema la autoriza. ADMINISTRADOR es un superconjunto
 * de COLABORADOR.
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 14.6
 */

const ROLES = ['ADMINISTRADOR', 'COLABORADOR'];

/** Operaciones de escritura sobre Espacio que solo ADMINISTRADOR puede realizar (R2.2). */
const ESPACIO_WRITE_OPS = ['create', 'update', 'delete'];

/** Construye una solicitud simulada con un usuario autenticado del rol dado. */
function makeReq(role) {
  return { user: { sub: 'u-prop', role } };
}

/** Niveles de jerarquía: un rol satisface un requerido si su nivel es >=. */
const LEVEL = { COLABORADOR: 1, ADMINISTRADOR: 2 };

describe('Feature: officespace-management, Property 9: Autorización basada en rol', () => {
  it('un COLABORADOR recibe 403 sin efectos en operaciones de escritura de Espacio (requireRole ADMINISTRADOR)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ESPACIO_WRITE_OPS), (op) => {
        // La operación de escritura sobre Espacio exige rol ADMINISTRADOR (R2.2).
        const req = makeReq('COLABORADOR');
        const next = vi.fn();
        let dataModified = false;
        const res = {
          status: () => {
            dataModified = true; // marcar si alguna mutación llegara a ejecutarse
            return res;
          },
          json: () => res,
        };

        requireRole('ADMINISTRADOR')(req, res, next);

        // Debe rechazarse con 403 vía next(err), sin autorizar la operación.
        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('AUTHORIZATION_ERROR');
        // No se debe haber ejecutado la operación (no se autorizó al siguiente handler).
        expect(dataModified).toBe(false);
        // `op` queda bloqueada independientemente de cuál sea.
        expect(ESPACIO_WRITE_OPS).toContain(op);
      }),
      { numRuns: 200 },
    );
  });

  it('un ADMINISTRADOR es autorizado en cualquier operación de escritura de Espacio', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ESPACIO_WRITE_OPS), (op) => {
        const req = makeReq('ADMINISTRADOR');
        const next = vi.fn();

        requireRole('ADMINISTRADOR')(req, {}, next);

        // Autorizado: next() sin error.
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0]).toBeUndefined();
        expect(ESPACIO_WRITE_OPS).toContain(op);
      }),
      { numRuns: 200 },
    );
  });

  it('coherencia con la jerarquía de roles para cualquier combinación usuario/requerido (ADMINISTRADOR superconjunto de COLABORADOR)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ROLES), fc.constantFrom(...ROLES), (userRole, requiredRole) => {
        const req = makeReq(userRole);
        const next = vi.fn();

        requireRole(requiredRole)(req, {}, next);

        const err = next.mock.calls[0][0];
        const authorized = LEVEL[userRole] >= LEVEL[requiredRole];

        if (authorized) {
          // Autorizado: next() sin error. Incluye ADMINISTRADOR sobre op de COLABORADOR (superconjunto).
          expect(err).toBeUndefined();
        } else {
          // Solo caso: COLABORADOR sobre requerido ADMINISTRADOR → 403.
          expect(err).toBeDefined();
          expect(err.statusCode).toBe(403);
          expect(err.code).toBe('AUTHORIZATION_ERROR');
        }
      }),
      { numRuns: 200 },
    );
  });
});
