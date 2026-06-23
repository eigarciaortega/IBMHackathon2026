package notifications

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// canal es el canal de PostgreSQL donde el trigger publica cada notificación.
const canal = "notificaciones"

// Escuchar mantiene una conexión dedicada con LISTEN y difunde por el hub cada
// NOTIFY recibido. Si la conexión se cae, reintenta hasta que se cancele el
// contexto. Pensado para ejecutarse en su propia goroutine.
func Escuchar(ctx context.Context, pool *pgxpool.Pool, hub *Hub) {
	for ctx.Err() == nil {
		if err := escucharUnaVez(ctx, pool, hub); err != nil && ctx.Err() == nil {
			log.Printf("listener de notificaciones: %v; reintentando en 2s", err)
			select {
			case <-ctx.Done():
			case <-time.After(2 * time.Second):
			}
		}
	}
}

func escucharUnaVez(ctx context.Context, pool *pgxpool.Pool, hub *Hub) error {
	// Conexión dedicada: WaitForNotification la ocupa de forma exclusiva.
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, "LISTEN "+canal); err != nil {
		return err
	}
	log.Printf("escuchando notificaciones en el canal %q", canal)

	for {
		aviso, err := conn.Conn().WaitForNotification(ctx)
		if err != nil {
			return err
		}
		hub.Difundir(aviso.Payload)
	}
}
