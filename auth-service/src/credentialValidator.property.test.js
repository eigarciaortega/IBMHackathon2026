import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateLoginInput,
  USUARIO_MIN_LENGTH,
  USUARIO_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from './credentialValidator.js';

/**
 * Prueba basada en propiedades (PBT) para la validación de entrada del login.
 *
 * Feature: officespace-management, Property 18: Validación de entrada del login.
 * Para toda solicitud de login en la que el campo usuario o contraseña esté
 * ausente, vacío o exceda sus límites de longitud (usuario 1..254, contraseña
 * 1..128), el Servicio_Autenticacion SHALL rechazarla (→ HTTP 400) sin emitir
 * Token_JWT; y para toda entrada con longitudes válidas SHALL aceptarla.
 *
 * Validates: Requirements 1.3
 */

const NUM_RUNS = 200; // mínimo requerido: 100

// Generadores de valores con longitud válida dentro de los límites.
const validUsuario = fc.string({ minLength: USUARIO_MIN_LENGTH, maxLength: USUARIO_MAX_LENGTH });
const validPassword = fc.string({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH });

// Generadores de valores inválidos: ausente, vacío o que excede el máximo.
const invalidUsuario = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(''),
  fc.string({ minLength: USUARIO_MAX_LENGTH + 1, maxLength: USUARIO_MAX_LENGTH + 50 }),
);
const invalidPassword = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(''),
  fc.string({ minLength: PASSWORD_MAX_LENGTH + 1, maxLength: PASSWORD_MAX_LENGTH + 50 }),
);

// Cualquier valor de campo, válido o inválido (para combinar con un campo inválido fijo).
const anyUsuario = fc.oneof(validUsuario, invalidUsuario);
const anyPassword = fc.oneof(validPassword, invalidPassword);

describe('Feature: officespace-management, Property 18: Validación de entrada del login', () => {
  it('acepta (valid=true, sin campos, sin token) toda entrada con longitudes válidas', () => {
    fc.assert(
      fc.property(validUsuario, validPassword, (usuario, password) => {
        const result = validateLoginInput({ usuario, password });
        expect(result.valid).toBe(true);
        expect(result.fields).toEqual([]);
        // No emite Token_JWT: el validador es lógica pura de forma.
        expect(result.token).toBeUndefined();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rechaza listando "usuario" cuando el usuario está ausente/vacío/excede el límite, sin token', () => {
    fc.assert(
      fc.property(invalidUsuario, anyPassword, (usuario, password) => {
        const result = validateLoginInput({ usuario, password });
        expect(result.valid).toBe(false);
        expect(result.fields).toContain('usuario');
        expect(result.token).toBeUndefined();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rechaza listando "password" cuando la contraseña está ausente/vacía/excede el límite, sin token', () => {
    fc.assert(
      fc.property(anyUsuario, invalidPassword, (usuario, password) => {
        const result = validateLoginInput({ usuario, password });
        expect(result.valid).toBe(false);
        expect(result.fields).toContain('password');
        expect(result.token).toBeUndefined();
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
