// Package services contiene la lógica de negocio del catalog-service.
package services

import (
	"context"
	"net/http"
	"strings"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/models"
)

// EspacioRepositorio es la dependencia de datos del servicio (interfaz para tests).
type EspacioRepositorio interface {
	Listar(ctx context.Context, filtro models.FiltroEspacios) ([]models.Espacio, error)
	ObtenerPorID(ctx context.Context, id int) (*models.Espacio, error)
	Crear(ctx context.Context, req models.EspacioRequest) (*models.Espacio, error)
	Actualizar(ctx context.Context, id int, req models.EspacioRequest) (*models.Espacio, error)
	Eliminar(ctx context.Context, id int) error
}

// EspacioService implementa la lógica de catálogo de espacios.
type EspacioService struct {
	repo EspacioRepositorio
}

func NewEspacioService(repo EspacioRepositorio) *EspacioService {
	return &EspacioService{repo: repo}
}

func (s *EspacioService) Listar(ctx context.Context, filtro models.FiltroEspacios) ([]models.Espacio, error) {
	return s.repo.Listar(ctx, filtro)
}

func (s *EspacioService) Obtener(ctx context.Context, id int) (*models.Espacio, error) {
	return s.repo.ObtenerPorID(ctx, id)
}

func (s *EspacioService) Crear(ctx context.Context, req models.EspacioRequest) (*models.Espacio, error) {
	if err := validar(req); err != nil {
		return nil, err
	}
	return s.repo.Crear(ctx, normalizar(req))
}

func (s *EspacioService) Actualizar(ctx context.Context, id int, req models.EspacioRequest) (*models.Espacio, error) {
	if err := validar(req); err != nil {
		return nil, err
	}
	return s.repo.Actualizar(ctx, id, normalizar(req))
}

func (s *EspacioService) Eliminar(ctx context.Context, id int) error {
	return s.repo.Eliminar(ctx, id)
}

// validar aplica las reglas de negocio sobre el cuerpo de un espacio.
func validar(req models.EspacioRequest) error {
	if strings.TrimSpace(req.Nombre) == "" {
		return apperror.Nuevo(http.StatusBadRequest, "NOMBRE_REQUERIDO", "El nombre del espacio es obligatorio.")
	}
	if req.Tipo != models.TipoSala && req.Tipo != models.TipoDesk {
		return apperror.Nuevo(http.StatusBadRequest, "TIPO_INVALIDO", "El tipo debe ser SALA o DESK.")
	}
	if req.Capacidad <= 0 {
		return apperror.Nuevo(http.StatusBadRequest, "CAPACIDAD_INVALIDA", "La capacidad debe ser mayor a cero.")
	}
	return nil
}

func normalizar(req models.EspacioRequest) models.EspacioRequest {
	req.Nombre = strings.TrimSpace(req.Nombre)
	req.Piso = strings.TrimSpace(req.Piso)
	return req
}
