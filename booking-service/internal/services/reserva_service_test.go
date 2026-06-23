package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/i0dk1/OfficeSpace/booking-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/clients"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/models"
)

// --- dobles de prueba ---

type repoFake struct {
	solapa       bool
	errSolapa    error
	creada       *models.Reserva
	errCrear     error
	obtenida     *models.Reserva
	errObtener   error
	cancelada    *models.Reserva
}

func (f *repoFake) Crear(_ context.Context, req models.CrearReservaRequest, email string) (*models.Reserva, error) {
	if f.errCrear != nil {
		return nil, f.errCrear
	}
	return &models.Reserva{ID: 100, EspacioID: req.EspacioID, UsuarioEmail: email, Fecha: req.Fecha,
		HoraInicio: req.HoraInicio, HoraFin: req.HoraFin, Asistentes: req.Asistentes, Estado: models.EstadoConfirmada}, nil
}
func (f *repoFake) ExisteSolapamiento(_ context.Context, _ int, _, _, _ string) (bool, error) {
	return f.solapa, f.errSolapa
}
func (f *repoFake) ListarPorUsuario(_ context.Context, _ string) ([]models.Reserva, error) { return nil, nil }
func (f *repoFake) OcupacionPorFecha(_ context.Context, _ string) ([]models.Reserva, error) { return nil, nil }
func (f *repoFake) ObtenerPorID(_ context.Context, _ int) (*models.Reserva, error) {
	return f.obtenida, f.errObtener
}
func (f *repoFake) Cancelar(_ context.Context, _ int) (*models.Reserva, error) {
	r := *f.obtenida
	r.Estado = models.EstadoCancelada
	return &r, nil
}

type catalogFake struct {
	espacio *clients.EspacioDTO
	err     error
}

func (c catalogFake) ObtenerEspacio(_ context.Context, _ int, _ string) (*clients.EspacioDTO, error) {
	return c.espacio, c.err
}

func codigoDe(t *testing.T, err error) string {
	t.Helper()
	var ae *apperror.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("se esperaba *AppError, se obtuvo %v", err)
	}
	return ae.Codigo
}

func servicio(repo *repoFake, cat catalogFake) *ReservaService {
	loc, err := time.LoadLocation("America/Mexico_City")
	if err != nil {
		loc = time.UTC
	}
	s := NewReservaService(repo, cat, loc)
	// "ahora" fijo para pruebas deterministas.
	s.Reloj = func() time.Time { return time.Date(2026, 6, 23, 12, 0, 0, 0, loc) }
	return s
}

func reqValida() models.CrearReservaRequest {
	return models.CrearReservaRequest{EspacioID: 1, Fecha: "2026-06-24", HoraInicio: "09:00", HoraFin: "10:00", Asistentes: 4}
}

func TestCrearReservaExitosa(t *testing.T) {
	s := servicio(&repoFake{}, catalogFake{espacio: &clients.EspacioDTO{ID: 1, Capacidad: 8}})
	r, err := s.CrearReserva(context.Background(), "tok", "ana@x.com", reqValida())
	if err != nil {
		t.Fatalf("no se esperaba error: %v", err)
	}
	if r.Estado != models.EstadoConfirmada || r.UsuarioEmail != "ana@x.com" {
		t.Errorf("reserva inesperada: %+v", r)
	}
}

func TestCrearReservaSolapada(t *testing.T) {
	s := servicio(&repoFake{solapa: true}, catalogFake{espacio: &clients.EspacioDTO{ID: 1, Capacidad: 8}})
	_, err := s.CrearReserva(context.Background(), "tok", "ana@x.com", reqValida())
	if c := codigoDe(t, err); c != "RESERVA_SOLAPADA" {
		t.Errorf("código %q; se esperaba RESERVA_SOLAPADA", c)
	}
}

func TestCrearReservaCapacidadExcedida(t *testing.T) {
	s := servicio(&repoFake{}, catalogFake{espacio: &clients.EspacioDTO{ID: 1, Capacidad: 2}})
	req := reqValida()
	req.Asistentes = 5
	_, err := s.CrearReserva(context.Background(), "tok", "ana@x.com", req)
	if c := codigoDe(t, err); c != "CAPACIDAD_EXCEDIDA" {
		t.Errorf("código %q; se esperaba CAPACIDAD_EXCEDIDA", c)
	}
}

func TestCrearReservaFechaPasada(t *testing.T) {
	s := servicio(&repoFake{}, catalogFake{espacio: &clients.EspacioDTO{ID: 1, Capacidad: 8}})
	req := reqValida()
	req.Fecha = "2020-01-01"
	_, err := s.CrearReserva(context.Background(), "tok", "ana@x.com", req)
	if c := codigoDe(t, err); c != "FECHA_PASADA" {
		t.Errorf("código %q; se esperaba FECHA_PASADA", c)
	}
}

func TestCrearReservaFinMenorInicio(t *testing.T) {
	s := servicio(&repoFake{}, catalogFake{espacio: &clients.EspacioDTO{ID: 1, Capacidad: 8}})
	req := reqValida()
	req.HoraInicio, req.HoraFin = "10:00", "09:00"
	_, err := s.CrearReserva(context.Background(), "tok", "ana@x.com", req)
	if c := codigoDe(t, err); c != "HORARIO_INVALIDO" {
		t.Errorf("código %q; se esperaba HORARIO_INVALIDO", c)
	}
}

func TestCrearReservaEspacioNoEncontrado(t *testing.T) {
	s := servicio(&repoFake{}, catalogFake{err: apperror.ErrEspacioNoEncontrado})
	_, err := s.CrearReserva(context.Background(), "tok", "ana@x.com", reqValida())
	if c := codigoDe(t, err); c != "ESPACIO_NO_ENCONTRADO" {
		t.Errorf("código %q; se esperaba ESPACIO_NO_ENCONTRADO", c)
	}
}

func TestCancelarReservaAjena(t *testing.T) {
	repo := &repoFake{obtenida: &models.Reserva{ID: 5, UsuarioEmail: "otro@x.com", Estado: models.EstadoConfirmada}}
	s := servicio(repo, catalogFake{})
	_, err := s.Cancelar(context.Background(), 5, "ana@x.com")
	if c := codigoDe(t, err); c != "ACCESO_DENEGADO" {
		t.Errorf("código %q; se esperaba ACCESO_DENEGADO", c)
	}
}

func TestCancelarReservaPropia(t *testing.T) {
	repo := &repoFake{obtenida: &models.Reserva{ID: 5, UsuarioEmail: "ana@x.com", Estado: models.EstadoConfirmada}}
	s := servicio(repo, catalogFake{})
	r, err := s.Cancelar(context.Background(), 5, "ana@x.com")
	if err != nil {
		t.Fatalf("no se esperaba error: %v", err)
	}
	if r.Estado != models.EstadoCancelada {
		t.Errorf("estado = %q; se esperaba CANCELADA", r.Estado)
	}
}

func TestCancelarReservaInexistente(t *testing.T) {
	repo := &repoFake{errObtener: apperror.ErrReservaNoEncontrada}
	s := servicio(repo, catalogFake{})
	_, err := s.Cancelar(context.Background(), 999, "ana@x.com")
	if c := codigoDe(t, err); c != "RESERVA_NO_ENCONTRADA" {
		t.Errorf("código %q; se esperaba RESERVA_NO_ENCONTRADA", c)
	}
}
