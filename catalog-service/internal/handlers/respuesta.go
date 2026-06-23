// Package handlers contiene la capa HTTP del catalog-service.
package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/apperror"
)

func responderJSON(w http.ResponseWriter, status int, datos interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if datos != nil {
		_ = json.NewEncoder(w).Encode(datos)
	}
}

// decodificarJSON lee el cuerpo en destino o devuelve ErrSolicitudInvalida.
func decodificarJSON(w http.ResponseWriter, r *http.Request, destino interface{}) error {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(destino); err != nil {
		return apperror.ErrSolicitudInvalida
	}
	return nil
}
