import { describe, it, expect } from 'vitest';
import {
  createLoginAttemptTracker,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS,
} from './loginAttemptTracker.js';

describe('loginAttemptTracker', () => {
  it('no bloquea antes de alcanzar el máximo de fallos', () => {
    const tracker = createLoginAttemptTracker();
    const now = 1000;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i += 1) {
      tracker.recordFailure('user', now);
    }
    expect(tracker.isLocked('user', now)).toBe(false);
    expect(tracker.getFailedAttempts('user')).toBe(MAX_FAILED_ATTEMPTS - 1);
  });

  it('bloquea 300 s tras 5 fallos consecutivos', () => {
    const tracker = createLoginAttemptTracker();
    const now = 1000;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      tracker.recordFailure('user', now);
    }
    expect(tracker.isLocked('user', now)).toBe(true);
    // Sigue bloqueado justo antes de los 300 s.
    expect(tracker.isLocked('user', now + LOCK_DURATION_MS - 1)).toBe(true);
    // Se desbloquea al cumplirse los 300 s.
    expect(tracker.isLocked('user', now + LOCK_DURATION_MS)).toBe(false);
  });

  it('reinicia el contador tras un login exitoso', () => {
    const tracker = createLoginAttemptTracker();
    const now = 1000;
    tracker.recordFailure('user', now);
    tracker.recordFailure('user', now);
    tracker.recordSuccess('user');
    expect(tracker.getFailedAttempts('user')).toBe(0);
    expect(tracker.isLocked('user', now)).toBe(false);
  });

  it('reinicia el conteo una vez expira la ventana de bloqueo', () => {
    const tracker = createLoginAttemptTracker();
    const now = 1000;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      tracker.recordFailure('user', now);
    }
    const afterLock = now + LOCK_DURATION_MS;
    const state = tracker.recordFailure('user', afterLock);
    expect(state.failedAttempts).toBe(1);
    expect(tracker.isLocked('user', afterLock)).toBe(false);
  });

  it('rastrea usuarios de forma independiente', () => {
    const tracker = createLoginAttemptTracker();
    const now = 1000;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      tracker.recordFailure('a', now);
    }
    expect(tracker.isLocked('a', now)).toBe(true);
    expect(tracker.isLocked('b', now)).toBe(false);
  });
});
