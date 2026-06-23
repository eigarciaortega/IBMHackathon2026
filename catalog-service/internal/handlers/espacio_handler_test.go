package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/models"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/services"
)

// repoFake implementa services.EspacioRepositorio para las pruebas de handlers.
type repoFake struct {
	filtroRecibido models.FiltroEspacios
	espacios       []models.Espacio
}

func (f *repoFake) Listar(_ context.Context, filtro models.FiltroEspacios) ([]models.Espacio, error) {
	f.filtroRecibido = filtro
	return f.espacios, nil
}
func (f *repoFake) ObtenerPorID(_ context.Context, id int) (*models.Espacio, error) {
	return &models.Espacio{ID: id, Nombre: "X", Tipo: "SALA", Capacidad: 4}, nil
}
func (f *repoFake) Crear(_ context.Context, req models.EspacioRequest) (*models.Espacio, error) {
	return &models.Espacio{ID: 99, Nombre: req.Nombre, Tipo: req.Tipo, Capacidad: req.Capacidad}, nil
}
func (f *repoFake) Actualizar(_ context.Context, id int, req models.EspacioRequest) (*models.Espacio, error) {
	return &models.Espacio{ID: id, Nombre: req.Nombre}, nil
}
func (f *repoFake) Eliminar(_ context.Context, _ int) error { return nil }

func nuevoHandler(repo *repoFake) *EspacioHandler {
	return NewEspacioHandler(services.NewEspacioService(repo))
}

func TestListarAplicaFiltros(t *testing.T) {
	repo := &repoFake{espacios: []models.Espacio{{ID: 1, Tipo: "DESK", Capacidad: 1}}}
	h := nuevoHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/spaces?tipo=DESK&capacidad_min=1", nil)
	rec := httptest.NewRecorder()
	h.Listar(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; se esperaba 200", rec.Code)
	}
	if repo.filtroRecibido.Tipo != "DESK" || repo.filtroRecibido.CapacidadMin != 1 {
		t.Errorf("el filtro no llegó al repositorio: %+v", repo.filtroRecibido)
	}
	var lista []models.Espacio
	if err := json.Unmarshal(rec.Body.Bytes(), &lista); err != nil {
		t.Fatalf("respuesta no es un arreglo JSON: %v", err)
	}
}

func TestListarFiltroInvalido(t *testing.T) {
	h := nuevoHandler(&repoFake{})
	req := httptest.NewRequest(http.MethodGet, "/spaces?capacidad_min=abc", nil)
	rec := httptest.NewRecorder()
	h.Listar(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; se esperaba 400", rec.Code)
	}
}

func TestCrearHandler(t *testing.T) {
	h := nuevoHandler(&repoFake{})

	t.Run("201 con cuerpo válido", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/spaces",
			strings.NewReader(`{"nombre":"Sala Z","tipo":"SALA","capacidad":5}`))
		rec := httptest.NewRecorder()
		h.Crear(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("status = %d; se esperaba 201 (%s)", rec.Code, rec.Body.String())
		}
	})

	t.Run("400 con tipo inválido", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/spaces",
			strings.NewReader(`{"nombre":"Sala Z","tipo":"OFICINA","capacidad":5}`))
		rec := httptest.NewRecorder()
		h.Crear(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d; se esperaba 400", rec.Code)
		}
	})
}
