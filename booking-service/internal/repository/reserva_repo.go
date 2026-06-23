// Package repository implementa el acceso a datos con pgx. Sin lógica de negocio.
package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/i0dk1/OfficeSpace/booking-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/models"
)

// Códigos SQLSTATE relevantes de PostgreSQL.
const (
	codigoExclusionViolada = "23P01" // exclusion_violation (restricción anti-solapamiento)
	codigoFKViolada        = "23503" // foreign_key_violation (espacio inexistente)
)

// ReservaRepository accede a la tabla reservas.
type ReservaRepository struct {
	pool *pgxpool.Pool
}

func NewReservaRepository(pool *pgxpool.Pool) *ReservaRepository {
	return &ReservaRepository{pool: pool}
}

// columnas con las horas/fechas formateadas como texto para una API simple.
const columnas = `
	id, espacio_id, usuario_email,
	to_char(fecha,'YYYY-MM-DD') AS fecha,
	to_char(hora_inicio,'HH24:MI') AS hora_inicio,
	to_char(hora_fin,'HH24:MI') AS hora_fin,
	asistentes, estado, creado_en`

func escanear(fila pgx.Row, r *models.Reserva) error {
	return fila.Scan(&r.ID, &r.EspacioID, &r.UsuarioEmail, &r.Fecha, &r.HoraInicio, &r.HoraFin, &r.Asistentes, &r.Estado, &r.CreadoEn)
}

// Crear inserta una reserva CONFIRMADA. Si la restricción de exclusión detecta un
// solapamiento (incluso por condición de carrera), se mapea a ErrReservaSolapada
// (409). Una violación de FK (espacio inexistente) se mapea a ErrEspacioNoEncontrado.
func (r *ReservaRepository) Crear(ctx context.Context, req models.CrearReservaRequest, email string) (*models.Reserva, error) {
	consulta := `
		INSERT INTO reservas (espacio_id, usuario_email, fecha, hora_inicio, hora_fin, asistentes)
		VALUES ($1, $2, $3::date, $4::time, $5::time, $6)
		RETURNING ` + columnas

	var reserva models.Reserva
	fila := r.pool.QueryRow(ctx, consulta, req.EspacioID, email, req.Fecha, req.HoraInicio, req.HoraFin, req.Asistentes)
	if err := escanear(fila, &reserva); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			switch pgErr.Code {
			case codigoExclusionViolada:
				return nil, apperror.ErrReservaSolapada
			case codigoFKViolada:
				return nil, apperror.ErrEspacioNoEncontrado
			}
		}
		return nil, err
	}
	return &reserva, nil
}

// ExisteSolapamiento verifica, a nivel de aplicación, si ya hay una reserva
// CONFIRMADA que se traslape con el intervalo dado (límites exclusivos).
func (r *ReservaRepository) ExisteSolapamiento(ctx context.Context, espacioID int, fecha, inicio, fin string) (bool, error) {
	consulta := `
		SELECT EXISTS (
			SELECT 1 FROM reservas
			WHERE espacio_id = $1
			  AND fecha = $2::date
			  AND estado = 'CONFIRMADA'
			  AND hora_inicio < $4::time
			  AND hora_fin > $3::time
		)`
	var existe bool
	if err := r.pool.QueryRow(ctx, consulta, espacioID, fecha, inicio, fin).Scan(&existe); err != nil {
		return false, err
	}
	return existe, nil
}

// ListarPorUsuario devuelve todas las reservas de un usuario (historial).
func (r *ReservaRepository) ListarPorUsuario(ctx context.Context, email string) ([]models.Reserva, error) {
	consulta := "SELECT " + columnas + " FROM reservas WHERE usuario_email = $1 ORDER BY fecha DESC, hora_inicio DESC"
	return r.consultarLista(ctx, consulta, email)
}

// OcupacionPorFecha devuelve las reservas CONFIRMADAS de una fecha (dashboard).
func (r *ReservaRepository) OcupacionPorFecha(ctx context.Context, fecha string) ([]models.Reserva, error) {
	consulta := "SELECT " + columnas + " FROM reservas WHERE fecha = $1::date AND estado = 'CONFIRMADA' ORDER BY espacio_id, hora_inicio"
	return r.consultarLista(ctx, consulta, fecha)
}

// ObtenerPorID devuelve una reserva o ErrReservaNoEncontrada.
func (r *ReservaRepository) ObtenerPorID(ctx context.Context, id int) (*models.Reserva, error) {
	consulta := "SELECT " + columnas + " FROM reservas WHERE id = $1"
	var reserva models.Reserva
	if err := escanear(r.pool.QueryRow(ctx, consulta, id), &reserva); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrReservaNoEncontrada
		}
		return nil, err
	}
	return &reserva, nil
}

// Cancelar marca la reserva como CANCELADA (libera el horario) y la devuelve.
func (r *ReservaRepository) Cancelar(ctx context.Context, id int) (*models.Reserva, error) {
	consulta := "UPDATE reservas SET estado = 'CANCELADA' WHERE id = $1 RETURNING " + columnas
	var reserva models.Reserva
	if err := escanear(r.pool.QueryRow(ctx, consulta, id), &reserva); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrReservaNoEncontrada
		}
		return nil, err
	}
	return &reserva, nil
}

func (r *ReservaRepository) consultarLista(ctx context.Context, consulta string, args ...interface{}) ([]models.Reserva, error) {
	filas, err := r.pool.Query(ctx, consulta, args...)
	if err != nil {
		return nil, err
	}
	defer filas.Close()

	reservas := []models.Reserva{}
	for filas.Next() {
		var reserva models.Reserva
		if err := escanear(filas, &reserva); err != nil {
			return nil, err
		}
		reservas = append(reservas, reserva)
	}
	return reservas, filas.Err()
}
