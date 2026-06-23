// Package models contiene los structs de dominio y DTOs del catalog-service.
package models

import "time"

// Tipos válidos de espacio.
const (
	TipoSala = "SALA"
	TipoDesk = "DESK"
)

// Roles del sistema (replicados por contrato, no se comparte código entre servicios).
const (
	RolAdministrador = "ADMINISTRADOR"
	RolColaborador   = "COLABORADOR"
)

// Espacio es la representación de dominio de un espacio reservable. Los recursos
// (proyector, aire, etc.) son un catálogo gestionable asociado por relación N:M.
type Espacio struct {
	ID        int       `json:"id" example:"1"`
	Nombre    string    `json:"nombre" example:"Sala Monterrey"`
	Tipo      string    `json:"tipo" example:"SALA"`
	Capacidad int       `json:"capacidad" example:"8"`
	Piso      string    `json:"piso" example:"Piso 1"`
	Recursos  []Recurso `json:"recursos"`
	CreadoEn  time.Time `json:"creado_en"`
}

// EspacioRequest es el cuerpo para crear o actualizar un espacio. recurso_ids son
// los identificadores de los recursos que se le asignan.
type EspacioRequest struct {
	Nombre     string `json:"nombre" example:"Sala Monterrey"`
	Tipo       string `json:"tipo" example:"SALA"`
	Capacidad  int    `json:"capacidad" example:"8"`
	Piso       string `json:"piso" example:"Piso 1"`
	RecursoIDs []int  `json:"recurso_ids" example:"1,2"`
}

// FiltroEspacios agrupa los filtros opcionales de GET /spaces.
type FiltroEspacios struct {
	Tipo         string // "" = sin filtro
	CapacidadMin int    // 0 = sin filtro
}
