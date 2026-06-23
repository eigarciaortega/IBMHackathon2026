import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';
import { verifyCredentials, ROLES } from './credentialValidator.js';

/**
 * Feature: officespace-management, Property 17: Rechazo de credenciales inválidas
 *
 * For any credencial que no coincida con ningún Usuario registrado, el
 * Servicio_Autenticacion SHALL rechazar el inicio de sesión sin emitir
 * Token_JWT y responder con código HTTP 401.
 *
 * A nivel de lógica pura, "rechazar sin emitir token" se observa como
 * `verifyCredentials` devolviendo `{ authenticated: false, role: null }`.
 * El endpoint traduce ese resultado a HTTP 401 (R1.2). Cualquier mismatch
 * (contraseña incorrecta, registro inexistente o usuario inactivo) debe
 * producir ese rechazo.
 *
 * Validates: Requirements 1.2
 */

const NUM_RUNS = 200; // >= 100 iteraciones requeridas por el diseño

// Contraseña "registrada" conocida; el hash bcrypt se calcula una sola vez con
// coste bajo (6) para mantener la prueba rápida.
const CORRECT_PASSWORD = 'User123';
const KNOWN_HASH = bcrypt.hashSync(CORRECT_PASSWORD, 6);

// Generador de roles válidos del sistema.
const arbRole = fc.constantFrom(ROLES.ADMINISTRADOR, ROLES.COLABORADOR);

// Generador de un registro de Usuario activo con un hash conocido para
// CORRECT_PASSWORD.
const arbActiveUserRecord = fc.record({
  id_usuario: fc.integer({ min: 1, max: 100000 }),
  email: fc.emailAddress(),
  password_hash: fc.constant(KNOWN_HASH),
  rol: arbRole,
  activo: fc.constant(true),
});

// Generador de contraseñas (1..128) que NO coinciden con la registrada.
const arbWrongPassword = fc
  .string({ minLength: 1, maxLength: 128 })
  .filter((p) => p !== CORRECT_PASSWORD);

function assertRejected(result) {
  expect(result.authenticated).toBe(false);
  expect(result.role).toBeNull();
}

describe('Property 17: Rechazo de credenciales inválidas', () => {
  it('rechaza contraseñas que no coinciden con el hash del usuario registrado', async () => {
    await fc.assert(
      fc.asyncProperty(arbActiveUserRecord, arbWrongPassword, async (record, wrongPassword) => {
        const result = await verifyCredentials({ password: wrongPassword }, record);
        assertRejected(result);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rechaza cuando el registro del usuario es null o undefined', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(null, undefined),
        fc.string({ minLength: 1, maxLength: 128 }),
        async (record, anyPassword) => {
          const result = await verifyCredentials({ password: anyPassword }, record);
          assertRejected(result);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('rechaza usuarios inactivos aun con la contraseña correcta', async () => {
    await fc.assert(
      fc.asyncProperty(arbActiveUserRecord, async (record) => {
        const inactiveRecord = { ...record, activo: false };
        // Incluso con la contraseña correcta, un usuario inactivo no se autentica.
        const result = await verifyCredentials({ password: CORRECT_PASSWORD }, inactiveRecord);
        assertRejected(result);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
