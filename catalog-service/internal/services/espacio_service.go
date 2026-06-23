// Package services contiene la lógica de negocio del catalog-service.
package services

import (
	"context"
	"fmt"
	"log"
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

// Notificador registra eventos del catálogo para el centro de notificaciones del
// administrador. Es opcional: si es nil, el servicio no emite notificaciones.
type Notificador interface {
	Crear(ctx context.Context, n models.NuevaNotificacion) error
}

// EspacioService implementa la lógica de catálogo de espacios.
type EspacioService struct {
	repo  EspacioRepositorio
	notif Notificador
}

func NewEspacioService(repo EspacioRepositorio) *EspacioService {
	return &EspacioService{repo: repo}
}

// ConNotificador conecta un Notificador para emitir alertas tras el CRUD de
// espacios. Devuelve el propio servicio para encadenar.
func (s *EspacioService) ConNotificador(n Notificador) *EspacioService {
	s.notif = n
	return s
}

// notificar emite una notificación en modo best-effort: un fallo aquí nunca debe
// tumbar la operación de catálogo.
func (s *EspacioService) notificar(ctx context.Context, n models.NuevaNotificacion) {
	if s.notif == nil {
		return
	}
	if err := s.notif.Crear(ctx, n); err != nil {
		log.Printf("no se pudo registrar la notificación %q: %v", n.Tipo, err)
	}
}

func (s *EspacioService) Listar(ctx context.Context, filtro models.FiltroEspacios) ([]models.Espacio, error) {
	return s.repo.Listar(ctx, filtro)
}

func (s *EspacioService) Obtener(ctx context.Context, id int) (*models.Espacio, error) {
	return s.repo.ObtenerPorID(ctx, id)
}

func (s *EspacioService) Crear(ctx context.Context, req models.EspacioRequest, actor string) (*models.Espacio, error) {
	if err := validar(req); err != nil {
		return nil, err
	}
	espacio, err := s.repo.Crear(ctx, normalizar(req))
	if err != nil {
		return nil, err
	}
	s.notificar(ctx, models.NuevaNotificacion{
		Tipo:       models.TipoEspacioCreado,
		Mensaje:    fmt.Sprintf("%s creó el espacio %s", actor, espacio.Nombre),
		ActorEmail: actor,
		Recurso:    espacio.Nombre,
	})
	return espacio, nil
}

func (s *EspacioService) Actualizar(ctx context.Context, id int, req models.EspacioRequest, actor string) (*models.Espacio, error) {
	if err := validar(req); err != nil {
		return nil, err
	}
	espacio, err := s.repo.Actualizar(ctx, id, normalizar(req))
	if err != nil {
		return nil, err
	}
	s.notificar(ctx, models.NuevaNotificacion{
		Tipo:       models.TipoEspacioActualizado,
		Mensaje:    fmt.Sprintf("%s actualizó el espacio %s", actor, espacio.Nombre),
		ActorEmail: actor,
		Recurso:    espacio.Nombre,
	})
	return espacio, nil
}

func (s *EspacioService) Eliminar(ctx context.Context, id int, actor string) error {
	// Se resuelve el nombre antes de borrar para una notificación legible.
	nombre := ""
	if s.notif != nil {
		if e, err := s.repo.ObtenerPorID(ctx, id); err == nil {
			nombre = e.Nombre
		}
	}
	if err := s.repo.Eliminar(ctx, id); err != nil {
		return err
	}
	if nombre == "" {
		nombre = fmt.Sprintf("#%d", id)
	}
	s.notificar(ctx, models.NuevaNotificacion{
		Tipo:       models.TipoEspacioEliminado,
		Mensaje:    fmt.Sprintf("%s eliminó el espacio %s", actor, nombre),
		ActorEmail: actor,
		Recurso:    nombre,
	})
	return nil
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
