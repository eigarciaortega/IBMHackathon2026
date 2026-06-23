// Pruebas de componente de la Vista de administración (tarea 9.5).
//
// Cubren los criterios de aceptación de R11:
//   - Render del Tablero_Ocupacion (estado ocupado/libre) y la tabla de Espacios (R11.1, R11.2).
//   - Formulario de creación/edición con campos obligatorios y Recursos opcional (R11.3).
//   - Validación de campos obligatorios/ inválidos conservando los datos (R11.5).
//   - Confirmación explícita antes de eliminar (R11.6).
//   - Refresco de la tabla y mensaje de éxito tras cada operación (R11.4).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminPage from './AdminPage';
import * as catalogApi from '../api/catalogApi';

vi.mock('../api/catalogApi');
vi.mock('../api/bookingApi');

import * as bookingApi from '../api/bookingApi';

/** Devuelve la fila de la tabla de Espacios que contiene el nombre indicado. */
async function filaEspacio(nombre) {
  const seccion = (await screen.findByRole('heading', { name: 'Espacios' })).closest('section');
  return within(seccion).getByText(nombre).closest('tr');
}

/** Datos de ejemplo del listado de Espacios (forma del catalog-service). */
const ESPACIOS = [
  {
    id_espacio: 1,
    nombre: 'Sala Alfa',
    tipo: 'Sala de juntas',
    capacidad: 8,
    piso: 2,
    ubicacion: 'Ala norte',
    activo: true,
    recursos: [
      { id_recurso: 1, nombre: 'proyector' },
      { id_recurso: 2, nombre: 'aire acondicionado' },
    ],
  },
  {
    id_espacio: 2,
    nombre: 'Escritorio 12',
    tipo: 'Escritorio individual',
    capacidad: 1,
    piso: 1,
    ubicacion: 'Open space',
    activo: true,
    recursos: [],
  },
];

/** Datos de ejemplo del Tablero_Ocupacion. */
const OCUPACION = [
  { id_espacio: 1, nombre: 'Sala Alfa', piso: 2, ubicacion: 'Ala norte', estado: 'ocupado' },
  { id_espacio: 2, nombre: 'Escritorio 12', piso: 1, ubicacion: 'Open space', estado: 'libre' },
];

function mockCargaInicial() {
  catalogApi.listEspacios.mockResolvedValue({ espacios: ESPACIOS });
  catalogApi.getOcupacion.mockResolvedValue(OCUPACION);
  catalogApi.listRecursos.mockResolvedValue({
    recursos: [
      { id_recurso: 1, nombre: 'Proyector' },
      { id_recurso: 2, nombre: 'Aire acondicionado' },
    ],
  });
  bookingApi.todasLasReservas.mockResolvedValue({ reservas: [] });
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCargaInicial();
  });

  it('muestra el Tablero_Ocupacion con el estado de cada espacio (R11.1)', async () => {
    render(<AdminPage />);

    const titulo = await screen.findByText('Tablero de ocupación (hoy)');
    const seccion = titulo.closest('section');
    expect(within(seccion).getByText('ocupado')).toBeInTheDocument();
    expect(within(seccion).getByText('libre')).toBeInTheDocument();
    // Identifica el espacio por nombre, piso y ubicación.
    expect(within(seccion).getByText('Ala norte')).toBeInTheDocument();
  });

  it('muestra la tabla de Espacios con sus atributos y Recursos (R11.2)', async () => {
    render(<AdminPage />);

    const seccion = (await screen.findByRole('heading', { name: 'Espacios' })).closest('section');
    expect(within(seccion).getByText('Sala Alfa')).toBeInTheDocument();
    expect(within(seccion).getByText('Escritorio 12')).toBeInTheDocument();
    // Recursos resueltos por nombre.
    expect(within(seccion).getByText('proyector, aire acondicionado')).toBeInTheDocument();
  });

  it('valida campos obligatorios al crear, conservando los datos y sin llamar a la API (R11.5)', async () => {
    render(<AdminPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Crear espacio' }));

    // Introduce solo el nombre; deja obligatorios vacíos.
    fireEvent.change(screen.getByLabelText('Nombre/identificador *'), {
      target: { value: 'Sala Beta' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    // Mensajes de error por los campos faltantes.
    expect(await screen.findByText('Seleccione un Tipo_Espacio válido.')).toBeInTheDocument();
    expect(screen.getByText('La Capacidad debe ser un entero entre 1 y 1000.')).toBeInTheDocument();
    expect(screen.getByText('La Ubicacion es obligatoria.')).toBeInTheDocument();

    // No se llamó a createEspacio y los datos introducidos se conservan.
    expect(catalogApi.createEspacio).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre/identificador *')).toHaveValue('Sala Beta');
  });

  it('crea un espacio válido y refresca la tabla con mensaje de éxito (R11.3, R11.4)', async () => {
    catalogApi.createEspacio.mockResolvedValue({ espacio: { id_espacio: 3 } });
    render(<AdminPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Crear espacio' }));

    fireEvent.change(screen.getByLabelText('Nombre/identificador *'), {
      target: { value: 'Sala Beta' },
    });
    fireEvent.change(screen.getByLabelText('Tipo de espacio *'), {
      target: { value: 'Sala de juntas' },
    });
    fireEvent.change(screen.getByLabelText('Capacidad *'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Piso *'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Ubicación *'), { target: { value: 'Ala sur' } });
    // Selecciona recursos mediante el checklist.
    fireEvent.click(screen.getByLabelText('Proyector'));
    fireEvent.click(screen.getByLabelText('Aire acondicionado'));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(catalogApi.createEspacio).toHaveBeenCalledWith({
        nombre: 'Sala Beta',
        tipo: 'Sala de juntas',
        capacidad: 10,
        piso: 3,
        ubicacion: 'Ala sur',
        recursos: [1, 2],
      });
    });

    expect(await screen.findByText('Espacio creado correctamente.')).toBeInTheDocument();
    // Refresco: la carga inicial + recarga tras crear.
    expect(catalogApi.listEspacios).toHaveBeenCalledTimes(2);
  });

  it('precarga el formulario al editar y envía la actualización (R11.3)', async () => {
    catalogApi.updateEspacio.mockResolvedValue({ espacio: { id_espacio: 1 } });
    render(<AdminPage />);

    const fila = await filaEspacio('Sala Alfa');
    fireEvent.click(within(fila).getByRole('button', { name: 'Editar' }));

    expect(screen.getByLabelText('Nombre/identificador *')).toHaveValue('Sala Alfa');
    expect(screen.getByLabelText('Capacidad *')).toHaveValue(8);
    // Los recursos del espacio quedan marcados en el checklist (ids 1 y 2).
    expect(screen.getByLabelText('Proyector')).toBeChecked();
    expect(screen.getByLabelText('Aire acondicionado')).toBeChecked();

    fireEvent.change(screen.getByLabelText('Capacidad *'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(catalogApi.updateEspacio).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ nombre: 'Sala Alfa', capacidad: 12 }),
      );
    });
    expect(await screen.findByText('Espacio actualizado correctamente.')).toBeInTheDocument();
  });

  it('exige confirmación explícita antes de eliminar (R11.6)', async () => {
    catalogApi.deleteEspacio.mockResolvedValue(null);
    render(<AdminPage />);

    const fila = await filaEspacio('Sala Alfa');
    fireEvent.click(within(fila).getByRole('button', { name: 'Eliminar' }));

    // Aparece el diálogo de confirmación; aún no se ha eliminado nada.
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByRole('heading', { name: 'Confirmar eliminación' })).toBeInTheDocument();
    expect(catalogApi.deleteEspacio).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar eliminación' }));

    await waitFor(() => {
      expect(catalogApi.deleteEspacio).toHaveBeenCalledWith(1);
    });
    expect(await screen.findByText('Espacio eliminado correctamente.')).toBeInTheDocument();
    expect(catalogApi.listEspacios).toHaveBeenCalledTimes(2);
  });

  it('cancela la eliminación sin llamar a la API (R11.6)', async () => {
    render(<AdminPage />);

    const fila = await filaEspacio('Sala Alfa');
    fireEvent.click(within(fila).getByRole('button', { name: 'Eliminar' }));

    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(catalogApi.deleteEspacio).not.toHaveBeenCalled();
  });
});
