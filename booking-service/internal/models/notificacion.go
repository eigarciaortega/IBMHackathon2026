package models

import "time"

// Roles del sistema (replicados por contrato, no se comparte código entre servicios).
const (
	RolAdministrador = "ADMINISTRADOR"
	RolColaborador   = "COLABORADOR"
)

// Tipos de notificación que emite el booking-service.
const (
	TipoReservaCreada    = "RESERVA_CREADA"
	TipoReservaCancelada = "RESERVA_CANCELADA"
)

// Notificacion es un evento de negocio mostrado al administrador. Su forma JSON
// coincide con la del payload de pg_notify, de modo que el frontend trata igual
// las que llegan por SSE y las del historial.
type Notificacion struct {
	ID         int64     `json:"id" example:"1"`
	Tipo       string    `json:"tipo" example:"RESERVA_CREADA"`
	Mensaje    string    `json:"mensaje" example:"carlos.mendez@corporativoalpha.com reservó Sala Monterrey de 09:00 a 10:00"`
	ActorEmail string    `json:"actor_email" example:"carlos.mendez@corporativoalpha.com"`
	Recurso    string    `json:"recurso" example:"Sala Monterrey"`
	Leida      bool      `json:"leida" example:"false"`
	CreadoEn   time.Time `json:"creado_en"`
}

// NuevaNotificacion es el dato mínimo para registrar una notificación.
type NuevaNotificacion struct {
	Tipo       string
	Mensaje    string
	ActorEmail string
	Recurso    string
}

// ListaNotificaciones es la respuesta de GET /notifications.
type ListaNotificaciones struct {
	Notificaciones []Notificacion `json:"notificaciones"`
	NoLeidas       int            `json:"no_leidas" example:"3"`
}
