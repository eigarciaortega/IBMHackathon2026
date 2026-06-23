package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/i0dk1/OfficeSpace/booking-service/internal/models"
)

// NotificacionRepository accede a la bitácora de notificaciones. El INSERT dispara
// (vía trigger) un pg_notify que el listener reenvía por SSE; este repositorio no
// se ocupa del tiempo real, solo persiste y consulta.
type NotificacionRepository struct {
	pool *pgxpool.Pool
}

func NewNotificacionRepository(pool *pgxpool.Pool) *NotificacionRepository {
	return &NotificacionRepository{pool: pool}
}

// Crear registra una notificación. El trigger de la base publica el evento.
func (r *NotificacionRepository) Crear(ctx context.Context, n models.NuevaNotificacion) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO notificaciones (tipo, mensaje, actor_email, recurso) VALUES ($1, $2, $3, $4)`,
		n.Tipo, n.Mensaje, n.ActorEmail, n.Recurso)
	return err
}

// ListarRecientes devuelve las últimas notificaciones (más nuevas primero).
func (r *NotificacionRepository) ListarRecientes(ctx context.Context, limite int) ([]models.Notificacion, error) {
	filas, err := r.pool.Query(ctx,
		`SELECT id, tipo, mensaje, actor_email, recurso, leida, creado_en
		   FROM notificaciones ORDER BY creado_en DESC, id DESC LIMIT $1`, limite)
	if err != nil {
		return nil, err
	}
	defer filas.Close()

	lista := []models.Notificacion{}
	for filas.Next() {
		var n models.Notificacion
		if err := filas.Scan(&n.ID, &n.Tipo, &n.Mensaje, &n.ActorEmail, &n.Recurso, &n.Leida, &n.CreadoEn); err != nil {
			return nil, err
		}
		lista = append(lista, n)
	}
	return lista, filas.Err()
}

// ContarNoLeidas devuelve cuántas notificaciones siguen sin leer.
func (r *NotificacionRepository) ContarNoLeidas(ctx context.Context) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `SELECT count(*) FROM notificaciones WHERE NOT leida`).Scan(&n)
	return n, err
}

// MarcarTodasLeidas marca como leídas todas las notificaciones pendientes.
func (r *NotificacionRepository) MarcarTodasLeidas(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `UPDATE notificaciones SET leida = TRUE WHERE NOT leida`)
	return err
}
