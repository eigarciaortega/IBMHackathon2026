// Package models contiene los structs de dominio y los DTOs del auth-service.
package models

import "time"

// Roles válidos del sistema.
const (
	RolAdministrador = "ADMINISTRADOR"
	RolColaborador   = "COLABORADOR"
)

// Usuario es la representación de dominio de un usuario almacenado en la BD.
type Usuario struct {
	ID           int
	Email        string
	PasswordHash string
	Rol          string
	Nombre       string
	CreadoEn     time.Time
}

// LoginRequest es el cuerpo esperado en POST /auth/login.
type LoginRequest struct {
	Email    string `json:"email" example:"admin@corporativoalpha.com"`
	Password string `json:"password" example:"Admin123"`
}

// LoginResponse es la respuesta de un login exitoso.
type LoginResponse struct {
	Token string `json:"token"`
	Rol   string `json:"rol" example:"ADMINISTRADOR"`
}

// MeResponse describe al usuario autenticado en GET /auth/me.
type MeResponse struct {
	Email  string `json:"email" example:"admin@corporativoalpha.com"`
	Rol    string `json:"rol" example:"ADMINISTRADOR"`
	Nombre string `json:"nombre" example:"Administrador Alpha"`
}
