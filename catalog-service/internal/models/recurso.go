package models

import "time"

// Recurso es un elemento del catálogo de recursos (proyector, aire, pizarrón...)
// que el administrador gestiona y asigna a los espacios.
type Recurso struct {
	ID       int       `json:"id" example:"1"`
	Nombre   string    `json:"nombre" example:"Proyector"`
	CreadoEn time.Time `json:"creado_en"`
}

// RecursoRequest es el cuerpo para crear o actualizar un recurso.
type RecursoRequest struct {
	Nombre string `json:"nombre" example:"Proyector"`
}
