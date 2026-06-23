import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import * as appModule from './app.js';

/**
 * Pruebas de endpoint para `GET /ocupacion` (tarea 4.6) con un repositorio de
 * ocupación simulado (sin MySQL en vivo). Se monta la app real del catalog-service
 * (que cablea el router de ocupación con los middlewares compartidos de auth y
 * errores), se arranca en un puerto efímero y se ejercita con `fetch`. La fecha
 * de referencia se inyecta vía `ahora` para que las pruebas sean deterministas.
 *
 * Cubre:
 *  - Colección vacía → 200 [] (R4.4)
 *  - Resolución ocupado/libre identificando nombre/piso/ubicacion (R4.1, R4.2)
 *  - Fallo de consulta → 500 sin alterar estado (R4.5)
 *  - Protección del endpoint: 401 sin token, 403 con rol no ADMINISTRADOR (R2.1, R2.2)
 */

const JWT_SECRET = 'test-secret-ocupacion';
const AHORA = new Date('2024-06-15T12:00:00Z');

// La factoría de la app puede exportarse como `crearApp` o `createApp`.
const construirApp = appModule.crearApp || appModule.createApp;

function tokenPara(role, sub = 'u1') {
  return jwt.sign({ sub, role }, JWT_SECRET, { algorithm: 'HS256', expiresIn: 3600 });
}

/** Repositorio de ocupación simulado: solo `obtenerEspaciosYReservas`. */
function repoSimulado(impl) {
  return { obtenerEspaciosYReservas: impl };
}

/** Arranca la app real con un repositorio de ocupación dado. */
async function arrancarApp(ocupacionRepository) {
  const app = construirApp({
    ocupacionRepository,
    jwtSecret: JWT_SECRET,
    ahora: () => AHORA,
    logger: () => {},
  });
  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = servidor.address();
  return {
    url: `http://127.0.0.1:${port}`,
    cerrar: () => new Promise((resolve) => servidor.close(resolve)),
  };
}

describe('GET /ocupacion (endpoint)', () => {
  it('devuelve 200 con colección vacía cuando no hay Espacios (R4.4)', async () => {
    const repo = repoSimulado(async () => ({ espacios: [], reservas: [] }));
    const ctx = await arrancarApp(repo);
    try {
      const res = await fetch(`${ctx.url}/ocupacion`, {
        headers: { Authorization: `Bearer ${tokenPara('ADMINISTRADOR')}` },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    } finally {
      await ctx.cerrar();
    }
  });

  it('devuelve estado ocupado/libre por Espacio con nombre/piso/ubicacion (R4.1, R4.2)', async () => {
    const repo = repoSimulado(async () => ({
      espacios: [
        { id_espacio: 1, nombre: 'Sala A', piso: 1, ubicacion: 'Norte' },
        { id_espacio: 2, nombre: 'Escritorio B', piso: 2, ubicacion: 'Sur' },
      ],
      reservas: [
        {
          id_espacio: 1,
          estado_reserva: 'Activo',
          fecha_inicio: '2024-06-15T09:00:00Z',
          fecha_fin: '2024-06-15T18:00:00Z',
        },
      ],
    }));
    const ctx = await arrancarApp(repo);
    try {
      const res = await fetch(`${ctx.url}/ocupacion`, {
        headers: { Authorization: `Bearer ${tokenPara('ADMINISTRADOR')}` },
      });
      expect(res.status).toBe(200);
      const cuerpo = await res.json();
      expect(cuerpo).toEqual([
        { id_espacio: 1, nombre: 'Sala A', piso: 1, ubicacion: 'Norte', estado: 'ocupado' },
        { id_espacio: 2, nombre: 'Escritorio B', piso: 2, ubicacion: 'Sur', estado: 'libre' },
      ]);
    } finally {
      await ctx.cerrar();
    }
  });

  it('devuelve 500 con contrato de error cuando la consulta falla (R4.5)', async () => {
    const repo = repoSimulado(async () => {
      throw new Error('fallo de consulta simulado');
    });
    const ctx = await arrancarApp(repo);
    try {
      const res = await fetch(`${ctx.url}/ocupacion`, {
        headers: { Authorization: `Bearer ${tokenPara('ADMINISTRADOR')}` },
      });
      expect(res.status).toBe(500);
      const cuerpo = await res.json();
      expect(cuerpo.error).toBeDefined();
      expect(cuerpo.error.code).toBe('INTERNAL_ERROR');
    } finally {
      await ctx.cerrar();
    }
  });

  it('rechaza con 401 cuando falta el Token_JWT (R2.1)', async () => {
    const repo = repoSimulado(async () => ({ espacios: [], reservas: [] }));
    const ctx = await arrancarApp(repo);
    try {
      const res = await fetch(`${ctx.url}/ocupacion`);
      expect(res.status).toBe(401);
    } finally {
      await ctx.cerrar();
    }
  });

  it('rechaza con 403 cuando el Rol no es ADMINISTRADOR (R2.2)', async () => {
    const repo = repoSimulado(async () => ({ espacios: [], reservas: [] }));
    const ctx = await arrancarApp(repo);
    try {
      const res = await fetch(`${ctx.url}/ocupacion`, {
        headers: { Authorization: `Bearer ${tokenPara('COLABORADOR')}` },
      });
      expect(res.status).toBe(403);
    } finally {
      await ctx.cerrar();
    }
  });
});
