// Pruebas unitarias del cliente HTTP centralizado (tarea 9.1).
//
// Cubren las tres responsabilidades del cliente:
//   1. Adjunta `Authorization: Bearer <token>` desde la sesión.
//   2. Intercepta 401 (invoca el handler de sesión no autorizada).
//   3. Normaliza el contrato de error `{ error: { code, message, fields } }`.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { request, normalizeError, ApiError, setUnauthorizedHandler } from './httpClient';
import { setSession, clearSession } from '../auth/session';

/** Construye una Response simulada para fetch. */
function mockResponse({ status = 200, body = null, ok } = {}) {
  return {
    status,
    ok: ok != null ? ok : status >= 200 && status < 300,
    text: async () => (body == null ? '' : JSON.stringify(body)),
  };
}

describe('httpClient', () => {
  beforeEach(() => {
    clearSession();
    // Restaurar un handler de 401 neutro entre pruebas.
    setUnauthorizedHandler(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adjunta el header Authorization Bearer cuando hay token en sesión', async () => {
    setSession({ token: 'abc.def.ghi', role: 'COLABORADOR' });
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ status: 200, body: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await request('http://svc', '/recurso');

    expect(data).toEqual({ ok: true });
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('no adjunta Authorization cuando no hay token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ status: 200, body: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await request('http://svc', '/publico');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('serializa el body como JSON y fija Content-Type en métodos con cuerpo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ status: 201, body: { id: 1 } }));
    vi.stubGlobal('fetch', fetchMock);

    await request('http://svc', '/reservas', { method: 'POST', body: { espacio: 5 } });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://svc/reservas');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.body).toBe(JSON.stringify({ espacio: 5 }));
  });

  it('intercepta 401 invocando el handler de sesión no autorizada y lanza ApiError', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({ status: 401, body: { error: { code: 'AUTHENTICATION_ERROR', message: 'expirado' } } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(request('http://svc', '/protegido')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'AUTHENTICATION_ERROR',
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('normaliza el contrato de error del backend en respuestas no exitosas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        status: 400,
        body: { error: { code: 'VALIDATION_ERROR', message: 'campo inválido', fields: ['horaFin'] } },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const err = await request('http://svc', '/x', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('campo inválido');
    expect(err.fields).toEqual(['horaFin']);
    expect(err.status).toBe(400);
  });

  it('aplica un error de respaldo cuando la respuesta no sigue el contrato', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ status: 500, body: null }));
    vi.stubGlobal('fetch', fetchMock);

    const err = await request('http://svc', '/x').catch((e) => e);
    expect(err.status).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('traduce un fallo de red a un ApiError de NETWORK_ERROR', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const err = await request('http://svc', '/x').catch((e) => e);
    expect(err.status).toBe(0);
    expect(err.code).toBe('NETWORK_ERROR');
  });

  it('devuelve null en respuestas 204 sin cuerpo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await request('http://svc', '/x', { method: 'DELETE' });
    expect(data).toBeNull();
  });

  describe('normalizeError', () => {
    it('usa el contrato de error cuando está presente', () => {
      const err = normalizeError(409, { error: { code: 'OVERLAP_CONFLICT', message: 'solapa' } });
      expect(err.code).toBe('OVERLAP_CONFLICT');
      expect(err.status).toBe(409);
    });

    it('cae al mensaje por estado cuando no hay contrato', () => {
      const err = normalizeError(403, null);
      expect(err.code).toBe('AUTHORIZATION_ERROR');
    });
  });
});
