import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  createLoginAttemptTracker,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_SECONDS,
  LOCK_DURATION_MS,
} from './loginAttemptTracker.js';

/**
 * Feature: officespace-management, Property 19: Bloqueo tras intentos fallidos
 *
 * For any secuencia de 5 intentos de inicio de sesión fallidos consecutivos de
 * un mismo Usuario, el Servicio_Autenticacion SHALL bloquear los nuevos intentos
 * durante 300 segundos respondiendo con código HTTP 429.
 *
 * Validates: Requirements 1.4
 */
describe('loginAttemptTracker — PBT', () => {
  // Generadores deterministas: instante inicial (epoch ms) y id de usuario.
  const startArb = fc.integer({ min: 0, max: 4_000_000_000_000 });
  const usuarioArb = fc.string({ minLength: 1, maxLength: 64 });

  it('Feature: officespace-management, Property 19: 5 fallos consecutivos bloquean 300 s (HTTP 429)', () => {
    fc.assert(
      fc.property(
        startArb,
        usuarioArb,
        // Pequeños incrementos de tiempo (ms) entre cada uno de los 5 fallos:
        // siguen siendo "consecutivos" mientras no expire ningún bloqueo previo.
        fc.array(fc.integer({ min: 0, max: 1000 }), {
          minLength: MAX_FAILED_ATTEMPTS,
          maxLength: MAX_FAILED_ATTEMPTS,
        }),
        // Offset arbitrario dentro de la ventana de bloqueo (< 300 s).
        fc.integer({ min: 0, max: LOCK_DURATION_MS - 1 }),
        // Offset arbitrario en o después del fin del bloqueo (>= 300 s).
        fc.integer({ min: 0, max: 10 * LOCK_DURATION_MS }),
        (start, usuario, deltas, withinOffset, afterOffset) => {
          const tracker = createLoginAttemptTracker();

          // Registrar 5 fallos consecutivos en instantes crecientes.
          let t = start;
          let lockTime = start;
          for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
            t += deltas[i];
            tracker.recordFailure(usuario, t);
            lockTime = t; // instante del 5.º (último) fallo => momento del bloqueo
          }

          // Antes de alcanzar los 5 fallos no debe haber bloqueo.
          // (verificado de forma explícita en el caso de < 5 fallos más abajo)

          // En el instante del bloqueo el usuario está bloqueado (=> HTTP 429).
          expect(tracker.isLocked(usuario, lockTime)).toBe(true);
          expect(tracker.lockRemainingMs(usuario, lockTime)).toBe(LOCK_DURATION_MS);

          // Permanece bloqueado para cualquier instante < lockedUntil (dentro de 300 s).
          const withinTime = lockTime + withinOffset;
          expect(tracker.isLocked(usuario, withinTime)).toBe(true);

          // El instante de desbloqueo es exactamente lockTime + 300 s.
          const lockedUntil = lockTime + LOCK_DURATION_MS;
          expect(tracker.getState(usuario).lockedUntil).toBe(lockedUntil);

          // Justo antes de cumplirse los 300 s sigue bloqueado.
          expect(tracker.isLocked(usuario, lockedUntil - 1)).toBe(true);

          // En o después de los 300 s ya no está bloqueado.
          const afterTime = lockedUntil + afterOffset;
          expect(tracker.isLocked(usuario, afterTime)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Feature: officespace-management, Property 19: menos de 5 fallos NO bloquea', () => {
    fc.assert(
      fc.property(
        startArb,
        usuarioArb,
        // Entre 0 y 4 fallos consecutivos (estrictamente menos que el umbral).
        fc.array(fc.integer({ min: 0, max: 1000 }), {
          minLength: 0,
          maxLength: MAX_FAILED_ATTEMPTS - 1,
        }),
        (start, usuario, deltas) => {
          const tracker = createLoginAttemptTracker();

          let t = start;
          for (let i = 0; i < deltas.length; i += 1) {
            t += deltas[i];
            tracker.recordFailure(usuario, t);
          }

          // Con menos de MAX_FAILED_ATTEMPTS fallos no hay bloqueo en ningún instante.
          expect(tracker.getFailedAttempts(usuario)).toBe(deltas.length);
          expect(tracker.isLocked(usuario, t)).toBe(false);
          expect(tracker.isLocked(usuario, t + LOCK_DURATION_MS)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('LOCK_DURATION_SECONDS es 300 s (coherencia con R1.4)', () => {
    expect(LOCK_DURATION_SECONDS).toBe(300);
    expect(LOCK_DURATION_MS).toBe(300 * 1000);
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
  });
});
