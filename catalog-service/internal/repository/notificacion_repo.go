package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/models"
)

// NotificacionRepository agrega notificaciones a la bitácora compartida. El INSERT
// dispara (vía trigger) un pg_notify que booking-service reenvía por SSE.
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
