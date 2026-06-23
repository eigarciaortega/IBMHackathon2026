package services

import (
	"context"
	"errors"
	"testing"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/models"
)

// repoFake implementa EspacioRepositorio sin tocar la BD.
type repoFake struct {
	creado    *models.EspacioRequest
	espacios  []models.Espacio
	errListar error
}

func (f *repoFake) Listar(_ context.Context, _ models.FiltroEspacios) ([]models.Espacio, error) {
	return f.espacios, f.errListar
}
func (f *repoFake) ObtenerPorID(_ context.Context, _ int) (*models.Espacio, error) {
	return nil, apperror.ErrEspacioNoEncontrado
}
func (f *repoFake) Crear(_ context.Context, req models.EspacioRequest) (*models.Espacio, error) {
	f.creado = &req
	return &models.Espacio{ID: 1, Nombre: req.Nombre, Tipo: req.Tipo, Capacidad: req.Capacidad, Piso: req.Piso}, nil
}
func (f *repoFake) Actualizar(_ context.Context, _ int, req models.EspacioRequest) (*models.Espacio, error) {
	return &models.Espacio{ID: 1, Nombre: req.Nombre, Tipo: req.Tipo, Capacidad: req.Capacidad}, nil
}
func (f *repoFake) Eliminar(_ context.Context, _ int) error { return nil }

func codigoDe(t *testing.T, err error) string {
	t.Helper()
	var ae *apperror.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("se esperaba *AppError, se obtuvo %v", err)
	}
	return ae.Codigo
}

func TestCrearValidaciones(t *testing.T) {
	svc := NewEspacioService(&repoFake{})
	casos := []struct {
		nombre   string
		req      models.EspacioRequest
		codigo   string
	}{
		{"nombre vacío", models.EspacioRequest{Nombre: "  ", Tipo: "SALA", Capacidad: 2}, "NOMBRE_REQUERIDO"},
		{"tipo inválido", models.EspacioRequest{Nombre: "X", Tipo: "OFICINA", Capacidad: 2}, "TIPO_INVALIDO"},
		{"capacidad cero", models.EspacioRequest{Nombre: "X", Tipo: "SALA", Capacidad: 0}, "CAPACIDAD_INVALIDA"},
		{"capacidad negativa", models.EspacioRequest{Nombre: "X", Tipo: "DESK", Capacidad: -3}, "CAPACIDAD_INVALIDA"},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			_, err := svc.Crear(context.Background(), c.req, "admin@x.com")
			if got := codigoDe(t, err); got != c.codigo {
				t.Errorf("código = %q; se esperaba %q", got, c.codigo)
			}
		})
	}
}

func TestCrearExitosoNormaliza(t *testing.T) {
	repo := &repoFake{}
	svc := NewEspacioService(repo)
	_, err := svc.Crear(context.Background(), models.EspacioRequest{
		Nombre: "  Sala Norte  ", Tipo: "SALA", Capacidad: 4, Piso: "  Piso 2  ",
	}, "admin@x.com")
	if err != nil {
		t.Fatalf("no se esperaba error: %v", err)
	}
	if repo.creado.Nombre != "Sala Norte" || repo.creado.Piso != "Piso 2" {
		t.Errorf("no se normalizaron los espacios en blanco: %+v", repo.creado)
	}
}
