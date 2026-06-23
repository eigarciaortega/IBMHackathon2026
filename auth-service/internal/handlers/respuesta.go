// Package handlers contiene la capa HTTP: decodifica peticiones, delega en los
// servicios y serializa las respuestas. No contiene lógica de negocio.
package handlers

import (
	"encoding/json"
	"net/http"
)

// responderJSON escribe una respuesta JSON con el status indicado.
func responderJSON(w http.ResponseWriter, status int, datos interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if datos != nil {
		_ = json.NewEncoder(w).Encode(datos)
	}
}
