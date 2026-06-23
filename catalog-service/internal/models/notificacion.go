package models

// Tipos de notificación que emite el catalog-service ante el CRUD de espacios.
const (
	TipoEspacioCreado      = "ESPACIO_CREADO"
	TipoEspacioActualizado = "ESPACIO_ACTUALIZADO"
	TipoEspacioEliminado   = "ESPACIO_ELIMINADO"
)

// NuevaNotificacion es el dato mínimo para registrar una notificación. El
// catalog-service solo AGREGA notificaciones a la bitácora compartida; el flujo
// en tiempo real (SSE) lo sirve booking-service vía LISTEN/NOTIFY de PostgreSQL.
type NuevaNotificacion struct {
	Tipo       string
	Mensaje    string
	ActorEmail string
	Recurso    string
}
