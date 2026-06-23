// Package models contiene los structs de dominio y DTOs del booking-service.
package models

import "time"

// Estados de una reserva.
const (
	EstadoConfirmada = "CONFIRMADA"
	EstadoCancelada  = "CANCELADA"
)

// Reserva es la representación de dominio de una reserva. Las fechas y horas se
// manejan como strings ("YYYY-MM-DD" y "HH:MM") para una API y un QA simples.
type Reserva struct {
	ID           int       `json:"id" example:"1"`
	EspacioID    int       `json:"espacio_id" example:"1"`
	UsuarioEmail string    `json:"usuario_email" example:"carlos.mendez@corporativoalpha.com"`
	Fecha        string    `json:"fecha" example:"2026-06-24"`
	HoraInicio   string    `json:"hora_inicio" example:"09:00"`
	HoraFin      string    `json:"hora_fin" example:"10:00"`
	Asistentes   int       `json:"asistentes" example:"4"`
	Estado       string    `json:"estado" example:"CONFIRMADA"`
	CreadoEn     time.Time `json:"creado_en"`
}

// CrearReservaRequest es el cuerpo de POST /bookings. El usuario se toma del JWT.
type CrearReservaRequest struct {
	EspacioID  int    `json:"espacio_id" example:"1"`
	Fecha      string `json:"fecha" example:"2026-06-24"`
	HoraInicio string `json:"hora_inicio" example:"11:00"`
	HoraFin    string `json:"hora_fin" example:"12:00"`
	Asistentes int    `json:"asistentes" example:"4"`
}

// DisponibilidadResponse es la respuesta de GET /bookings/availability.
type DisponibilidadResponse struct {
	EspacioID  int    `json:"espacio_id" example:"1"`
	Fecha      string `json:"fecha" example:"2026-06-24"`
	HoraInicio string `json:"hora_inicio" example:"11:00"`
	HoraFin    string `json:"hora_fin" example:"12:00"`
	Disponible bool   `json:"disponible" example:"true"`
}
