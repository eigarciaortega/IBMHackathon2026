package services

import (
	"context"
	"net/http"
	"strings"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/models"
)

// RecursoRepositorio es la dependencia de datos del catálogo de recursos.
type RecursoRepositorio interface {
	Listar(ctx context.Context) ([]models.Recurso, error)
	Crear(ctx context.Context, nombre string) (*models.Recurso, error)
	Actualizar(ctx context.Context, id int, nombre string) (*models.Recurso, error)
	Eliminar(ctx context.Context, id int) error
}

// RecursoService implementa la lógica del catálogo de recursos.
type RecursoService struct {
	repo RecursoRepositorio
}

func NewRecursoService(repo RecursoRepositorio) *RecursoService {
	return &RecursoService{repo: repo}
}

func (s *RecursoService) Listar(ctx context.Context) ([]models.Recurso, error) {
	return s.repo.Listar(ctx)
}

func (s *RecursoService) Crear(ctx context.Context, req models.RecursoRequest) (*models.Recurso, error) {
	nombre, err := nombreValido(req.Nombre)
	if err != nil {
		return nil, err
	}
	return s.repo.Crear(ctx, nombre)
}

func (s *RecursoService) Actualizar(ctx context.Context, id int, req models.RecursoRequest) (*models.Recurso, error) {
	nombre, err := nombreValido(req.Nombre)
	if err != nil {
		return nil, err
	}
	return s.repo.Actualizar(ctx, id, nombre)
}

func (s *RecursoService) Eliminar(ctx context.Context, id int) error {
	return s.repo.Eliminar(ctx, id)
}

func nombreValido(nombre string) (string, error) {
	limpio := strings.TrimSpace(nombre)
	if limpio == "" {
		return "", apperror.Nuevo(http.StatusBadRequest, "NOMBRE_REQUERIDO", "El nombre del recurso es obligatorio.")
	}
	return limpio, nil
}
