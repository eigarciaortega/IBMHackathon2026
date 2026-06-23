import { describe, it, expect, vi } from 'vitest';
import errors from './errors.js';

const {
  ERROR_CODES,
  ApiError,
  buildErrorBody,
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  overlapError,
  internalError,
  jsonParseErrorHandler,
  globalErrorHandler,
} = errors;

/**
 * Crea un objeto `res` simulado al estilo Express con `status`/`json`
 * encadenables para inspeccionar el código y cuerpo de respuesta.
 */
function makeRes({ headersSent = false } = {}) {
  const res = {
    headersSent,
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('buildErrorBody', () => {
  it('construye el contrato uniforme con code y message', () => {
    expect(buildErrorBody({ code: 'VALIDATION_ERROR', message: 'campo inválido' })).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'campo inválido' },
    });
  });

  it('incluye fields solo cuando hay elementos', () => {
    expect(buildErrorBody({ code: 'VALIDATION_ERROR', message: 'x', fields: ['horaFin'] })).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'x', fields: ['horaFin'] },
    });
  });

  it('omite fields cuando es vacío o ausente', () => {
    expect(buildErrorBody({ code: 'NOT_FOUND', message: 'x', fields: [] }).error).not.toHaveProperty(
      'fields',
    );
    expect(buildErrorBody({ code: 'NOT_FOUND', message: 'x' }).error).not.toHaveProperty('fields');
  });

  it('aplica INTERNAL_ERROR como código por defecto ante code inválido', () => {
    expect(buildErrorBody({ message: 'x' }).error.code).toBe('INTERNAL_ERROR');
  });

  it('no comparte la referencia del arreglo fields', () => {
    const fields = ['a'];
    const body = buildErrorBody({ code: 'VALIDATION_ERROR', message: 'x', fields });
    fields.push('b');
    expect(body.error.fields).toEqual(['a']);
  });
});

describe('ApiError y factorías', () => {
  it('cada factoría mapea al código HTTP normalizado correcto', () => {
    expect(validationError('v').statusCode).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(authenticationError().statusCode).toBe(ERROR_CODES.AUTHENTICATION_ERROR);
    expect(authorizationError().statusCode).toBe(ERROR_CODES.AUTHORIZATION_ERROR);
    expect(notFoundError().statusCode).toBe(ERROR_CODES.NOT_FOUND);
    expect(overlapError().statusCode).toBe(ERROR_CODES.OVERLAP_CONFLICT);
    expect(internalError().statusCode).toBe(ERROR_CODES.INTERNAL_ERROR);
  });

  it('ApiError es una instancia de Error y serializa al contrato', () => {
    const err = validationError('rango inválido', ['horaFin']);
    expect(err).toBeInstanceOf(Error);
    expect(err.toBody()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'rango inválido', fields: ['horaFin'] },
    });
  });
});

describe('jsonParseErrorHandler', () => {
  it('traduce JSON malformado a un 400 con el contrato uniforme', () => {
    const handler = jsonParseErrorHandler();
    const res = makeRes();
    const next = vi.fn();

    const syntaxErr = new SyntaxError('Unexpected token');
    syntaxErr.status = 400;
    syntaxErr.body = '{bad json';

    handler(syntaxErr, {}, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(next).not.toHaveBeenCalled();
  });

  it('delega al siguiente middleware otros errores', () => {
    const handler = jsonParseErrorHandler();
    const res = makeRes();
    const next = vi.fn();
    const other = new Error('algo más');

    handler(other, {}, res, next);

    expect(res.statusCode).toBeUndefined();
    expect(next).toHaveBeenCalledWith(other);
  });
});

describe('globalErrorHandler', () => {
  it('responde con el código y contrato de un ApiError conocido', () => {
    const handler = globalErrorHandler();
    const res = makeRes();
    handler(overlapError('solapa'), {}, res, vi.fn());

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: { code: 'OVERLAP_CONFLICT', message: 'solapa' } });
  });

  it('responde 500 genérico ante error no controlado sin filtrar detalles', () => {
    const logger = vi.fn();
    const handler = globalErrorHandler({ logger });
    const res = makeRes();
    const boom = new Error('detalle interno sensible');

    handler(boom, {}, res, vi.fn());

    expect(res.statusCode).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).not.toContain('sensible');
    expect(logger).toHaveBeenCalledWith(boom);
  });

  it('delega cuando los headers ya fueron enviados', () => {
    const handler = globalErrorHandler();
    const res = makeRes({ headersSent: true });
    const next = vi.fn();
    const err = new Error('x');

    handler(err, {}, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.statusCode).toBeUndefined();
  });
});
