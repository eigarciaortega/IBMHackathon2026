// Package handlers contiene la capa HTTP del booking-service.
package handlers

import (
	"encoding/json"
	"net/http"
)

func responderJSON(w http.ResponseWriter, status int, datos interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if datos != nil {
		_ = json.NewEncoder(w).Encode(datos)
	}
}
