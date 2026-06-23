// Pruebas del módulo transversal de retroalimentación visual (R12).
//
// Verifican el contrato de los criterios de aceptación R12.1–R12.4:
//   - Toasts de éxito/error visibles y con auto-descarte ≥3 s o descarte manual.
//   - Indicador de progreso solo para operaciones que superan 1 s.
//   - Conservación del estado ante fallo (el error se relanza al llamador).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FeedbackProvider } from './FeedbackProvider';
import { useFeedback } from './useFeedback';
import {
  TOAST_DURATION_MS,
  PROGRESS_DELAY_MS,
} from './feedbackConstants';

// Componente de prueba que expone la API de feedback mediante botones/atajos.
function Harness({ onReady }) {
  const api = useFeedback();
  if (onReady) onReady(api);
  return null;
}

/** Renderiza el proveedor y captura la API de feedback. */
function setup(providerProps = {}) {
  let api;
  render(
    <FeedbackProvider {...providerProps}>
      <Harness onReady={(a) => { api = a; }} />
    </FeedbackProvider>,
  );
  return { getApi: () => api };
}

describe('FeedbackProvider - toasts (R12.1, R12.2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('muestra un toast de éxito con el mensaje indicado', () => {
    const { getApi } = setup();
    act(() => {
      getApi().notifySuccess('Reserva creada');
    });
    const toast = screen.getByTestId('toast-success');
    expect(toast).toHaveTextContent('Reserva creada');
    expect(toast).toHaveAttribute('role', 'status');
  });

  it('muestra un toast de error con role="alert" e indicando el motivo', () => {
    const { getApi } = setup();
    act(() => {
      getApi().notifyError('Credenciales inválidas');
    });
    const toast = screen.getByTestId('toast-error');
    expect(toast).toHaveTextContent('Credenciales inválidas');
    expect(toast).toHaveAttribute('role', 'alert');
  });

  it('mantiene el toast visible al menos 3 segundos y lo descarta después de la duración', () => {
    const { getApi } = setup();
    act(() => {
      getApi().notifySuccess('Operación exitosa');
    });
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();

    // Sigue visible a los 3 s (mínimo exigido por R12.1).
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();

    // Se auto-descarta tras la duración configurada (≥3 s).
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 3000);
    });
    expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument();
  });

  it('permite descartar manualmente un toast antes de su expiración', () => {
    const { getApi } = setup();
    act(() => {
      getApi().notifyError('Error temporal');
    });
    const button = screen.getByLabelText('Descartar mensaje');
    act(() => {
      button.click();
    });
    expect(screen.queryByTestId('toast-error')).not.toBeInTheDocument();
  });

  it('mantiene el toast indefinidamente cuando la duración es null', () => {
    const { getApi } = setup();
    act(() => {
      getApi().notifySuccess('Persistente', { duration: null });
    });
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS * 5);
    });
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();
  });

  it('apila múltiples toasts simultáneos', () => {
    const { getApi } = setup();
    act(() => {
      getApi().notifySuccess('Uno');
      getApi().notifyError('Dos');
    });
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();
    expect(screen.getByTestId('toast-error')).toBeInTheDocument();
  });
});

describe('FeedbackProvider - indicador de progreso (R12.4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('NO muestra el indicador para operaciones que finalizan antes de 1 s', async () => {
    const { getApi } = setup();
    let resolve;
    const action = () => new Promise((res) => { resolve = res; });

    let runPromise;
    act(() => {
      runPromise = getApi().runWithFeedback(action, { successMessage: 'Listo' });
    });

    // Antes del umbral de 1 s no hay spinner.
    act(() => {
      vi.advanceTimersByTime(PROGRESS_DELAY_MS - 1);
    });
    expect(screen.queryByTestId('progress-indicator')).not.toBeInTheDocument();

    // La operación termina rápido: nunca debe mostrarse el indicador.
    await act(async () => {
      resolve('ok');
      await runPromise;
    });
    expect(screen.queryByTestId('progress-indicator')).not.toBeInTheDocument();
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();
  });

  it('muestra el indicador cuando la operación supera 1 s y lo oculta al finalizar', async () => {
    const { getApi } = setup();
    let resolve;
    const action = () => new Promise((res) => { resolve = res; });

    let runPromise;
    act(() => {
      runPromise = getApi().runWithFeedback(action, { successMessage: 'Listo' });
    });

    // Tras superar el umbral aparece el indicador (R12.4).
    act(() => {
      vi.advanceTimersByTime(PROGRESS_DELAY_MS);
    });
    expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();

    // Al finalizar la operación, el indicador desaparece.
    await act(async () => {
      resolve('ok');
      await runPromise;
    });
    expect(screen.queryByTestId('progress-indicator')).not.toBeInTheDocument();
  });
});

describe('FeedbackProvider - runWithFeedback éxito/fallo (R12.2, R12.3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('devuelve el resultado y notifica éxito en el camino feliz', async () => {
    const { getApi } = setup();
    let result;
    await act(async () => {
      result = await getApi().runWithFeedback(async () => 42, {
        successMessage: 'Hecho',
      });
    });
    expect(result).toBe(42);
    expect(screen.getByTestId('toast-success')).toHaveTextContent('Hecho');
  });

  it('notifica error y relanza la excepción para conservar el estado (R12.3)', async () => {
    const { getApi } = setup();
    const boom = new Error('Fallo del servidor');

    let captured;
    await act(async () => {
      try {
        await getApi().runWithFeedback(async () => { throw boom; });
      } catch (e) {
        captured = e;
      }
    });

    // El error se relanza para que el llamador no aplique cambios parciales.
    expect(captured).toBe(boom);
    expect(screen.getByTestId('toast-error')).toHaveTextContent('Fallo del servidor');
  });

  it('usa el errorMessage derivado de una función cuando se proporciona', async () => {
    const { getApi } = setup();
    await act(async () => {
      try {
        await getApi().runWithFeedback(
          async () => { const e = new Error('x'); e.code = 'OVERLAP_CONFLICT'; throw e; },
          { errorMessage: (err) => `Conflicto: ${err.code}`, rethrow: false },
        );
      } catch {
        // rethrow:false no debería lanzar.
      }
    });
    expect(screen.getByTestId('toast-error')).toHaveTextContent('Conflicto: OVERLAP_CONFLICT');
  });

  it('no relanza cuando rethrow es false', async () => {
    const { getApi } = setup();
    let threw = false;
    let result;
    await act(async () => {
      try {
        result = await getApi().runWithFeedback(
          async () => { throw new Error('silencioso'); },
          { rethrow: false },
        );
      } catch {
        threw = true;
      }
    });
    expect(threw).toBe(false);
    expect(result).toBeUndefined();
    expect(screen.getByTestId('toast-error')).toBeInTheDocument();
  });
});

describe('useFeedback fuera del proveedor', () => {
  it('lanza un error descriptivo', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Harness />)).toThrow(
      'useFeedback debe usarse dentro de <FeedbackProvider>',
    );
    spy.mockRestore();
  });
});
