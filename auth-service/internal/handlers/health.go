package handlers

import "net/http"

// SaludResponse es la respuesta del endpoint de salud.
type SaludResponse struct {
	Status   string `json:"status" example:"ok"`
	Servicio string `json:"servicio" example:"auth-service"`
}

// Salud responde la sonda de salud del servicio.
//
//	@Summary		Sonda de salud
//	@Description	Indica si el servicio está operativo (usado por docker-compose y Dokploy).
//	@Tags			salud
//	@Produce		json
//	@Success		200	{object}	SaludResponse
//	@Router			/health [get]
func Salud(servicio string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		responderJSON(w, http.StatusOK, SaludResponse{Status: "ok", Servicio: servicio})
	}
}
