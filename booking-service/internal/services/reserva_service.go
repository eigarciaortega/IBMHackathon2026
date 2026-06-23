// Package services contiene la lógica de negocio del booking-service: el motor de
// reservas y sus validaciones críticas.
package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/i0dk1/OfficeSpace/booking-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/clients"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/models"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/validators"
)

// ReservaRepositorio es la dependencia de datos (interfaz para pruebas).
type ReservaRepositorio interface {
	Crear(ctx context.Context, req models.CrearReservaRequest, email string) (*models.Reserva, error)
	ExisteSolapamiento(ctx context.Context, espacioID int, fecha, inicio, fin string) (bool, error)
	ListarPorUsuario(ctx context.Context, email string) ([]models.Reserva, error)
	OcupacionPorFecha(ctx context.Context, fecha string) ([]models.Reserva, error)
	ObtenerPorID(ctx context.Context, id int) (*models.Reserva, error)
	Cancelar(ctx context.Context, id int) (*models.Reserva, error)
}

// CatalogoClient valida la existencia y capacidad del espacio por HTTP.
type CatalogoClient interface {
	ObtenerEspacio(ctx context.Context, id int, token string) (*clients.EspacioDTO, error)
}

// Notificador registra eventos de negocio para el centro de notificaciones del
// administrador. Es opcional: si es nil, el servicio no emite notificaciones.
type Notificador interface {
	Crear(ctx context.Context, n models.NuevaNotificacion) error
}

// ReservaService implementa el motor de reservas.
type ReservaService struct {
	repo    ReservaRepositorio
	catalog CatalogoClient
	loc     *time.Location
	notif   Notificador
	// Reloj permite inyectar el "ahora" en pruebas; por defecto time.Now.
	Reloj func() time.Time
}

func NewReservaService(repo ReservaRepositorio, catalog CatalogoClient, loc *time.Location) *ReservaService {
	return &ReservaService{repo: repo, catalog: catalog, loc: loc, Reloj: time.Now}
}

// ConNotificador conecta un Notificador para emitir alertas tras crear o cancelar
// reservas. Devuelve el propio servicio para encadenar.
func (s *ReservaService) ConNotificador(n Notificador) *ReservaService {
	s.notif = n
	return s
}

// notificar emite una notificación en modo best-effort: un fallo aquí nunca debe
// tumbar la operación de reserva.
func (s *ReservaService) notificar(ctx context.Context, n models.NuevaNotificacion) {
	if s.notif == nil {
		return
	}
	if err := s.notif.Crear(ctx, n); err != nil {
		log.Printf("no se pudo registrar la notificación %q: %v", n.Tipo, err)
	}
}

// CrearReserva aplica todas las validaciones críticas y crea la reserva. El
// solapamiento se valida en la app y, además, queda garantizado por la restricción
// de exclusión de la base: ambos caminos devuelven 409 (nunca 200).
func (s *ReservaService) CrearReserva(ctx context.Context, token, email string, req models.CrearReservaRequest) (*models.Reserva, error) {
	// 1. Consistencia temporal: fin > inicio (y formato válido).
	if err := validators.ValidarConsistenciaTemporal(req.HoraInicio, req.HoraFin); err != nil {
		return nil, err
	}
	// 2. No reservar en el pasado (zona horaria America/Mexico_City).
	if err := validators.ValidarNoEnPasado(req.Fecha, req.HoraInicio, s.Reloj(), s.loc); err != nil {
		return nil, err
	}
	// 3. Capacidad/existencia del espacio: consultando catalog-service por HTTP.
	espacio, err := s.catalog.ObtenerEspacio(ctx, req.EspacioID, token)
	if err != nil {
		return nil, err
	}
	if err := validators.ValidarCapacidad(req.Asistentes, espacio.Capacidad); err != nil {
		return nil, err
	}
	// 4. No solapamiento (chequeo en la app).
	solapa, err := s.repo.ExisteSolapamiento(ctx, req.EspacioID, req.Fecha, req.HoraInicio, req.HoraFin)
	if err != nil {
		return nil, err
	}
	if solapa {
		return nil, apperror.ErrReservaSolapada
	}
	// 5. Inserción (la restricción de exclusión blinda contra condiciones de carrera).
	reserva, err := s.repo.Crear(ctx, req, email)
	if err != nil {
		return nil, err
	}
	s.notificar(ctx, models.NuevaNotificacion{
		Tipo:       models.TipoReservaCreada,
		Mensaje:    fmt.Sprintf("%s reservó %s el %s de %s a %s", email, espacio.Nombre, req.Fecha, req.HoraInicio, req.HoraFin),
		ActorEmail: email,
		Recurso:    espacio.Nombre,
	})
	return reserva, nil
}

// MisReservas devuelve el historial de reservas del usuario autenticado.
func (s *ReservaService) MisReservas(ctx context.Context, email string) ([]models.Reserva, error) {
	return s.repo.ListarPorUsuario(ctx, email)
}

// Disponibilidad indica si un espacio está libre en el intervalo dado.
func (s *ReservaService) Disponibilidad(ctx context.Context, espacioID int, fecha, inicio, fin string) (*models.DisponibilidadResponse, error) {
	if err := validators.ValidarFecha(fecha); err != nil {
		return nil, err
	}
	if err := validators.ValidarConsistenciaTemporal(inicio, fin); err != nil {
		return nil, err
	}
	solapa, err := s.repo.ExisteSolapamiento(ctx, espacioID, fecha, inicio, fin)
	if err != nil {
		return nil, err
	}
	return &models.DisponibilidadResponse{
		EspacioID:  espacioID,
		Fecha:      fecha,
		HoraInicio: inicio,
		HoraFin:    fin,
		Disponible: !solapa,
	}, nil
}

// Ocupacion devuelve las reservas confirmadas de una fecha (dashboard admin).
func (s *ReservaService) Ocupacion(ctx context.Context, fecha string) ([]models.Reserva, error) {
	if err := validators.ValidarFecha(fecha); err != nil {
		return nil, err
	}
	return s.repo.OcupacionPorFecha(ctx, fecha)
}

// Cancelar cancela una reserva propia. Si la reserva es de otro usuario devuelve
// 403; si no existe, 404.
func (s *ReservaService) Cancelar(ctx context.Context, id int, email string) (*models.Reserva, error) {
	reserva, err := s.repo.ObtenerPorID(ctx, id)
	if err != nil {
		return nil, err
	}
	if reserva.UsuarioEmail != email {
		return nil, apperror.ErrAccesoDenegado
	}
	cancelada, err := s.repo.Cancelar(ctx, id)
	if err != nil {
		return nil, err
	}
	s.notificar(ctx, models.NuevaNotificacion{
		Tipo:       models.TipoReservaCancelada,
		Mensaje:    fmt.Sprintf("%s canceló su reserva del %s de %s a %s", email, cancelada.Fecha, cancelada.HoraInicio, cancelada.HoraFin),
		ActorEmail: email,
	})
	return cancelada, nil
}
