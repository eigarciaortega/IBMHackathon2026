// Configuración global de pruebas (Vitest + Testing Library).
// Añade matchers de jest-dom y limpia el DOM/localStorage entre pruebas.

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
  } catch {
    // localStorage no disponible.
  }
});
