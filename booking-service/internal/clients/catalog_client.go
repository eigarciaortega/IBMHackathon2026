// Package clients implementa la comunicación HTTP con otros microservicios. La
// validación de capacidad/existencia del espacio se hace llamando a
// catalog-service, NO leyendo su tabla (criterio de arquitectura del proyecto).
package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/i0dk1/OfficeSpace/booking-service/internal/apperror"
)

// EspacioDTO es la vista parcial del espacio que necesita booking-service.
type EspacioDTO struct {
	ID        int    `json:"id"`
	Nombre    string `json:"nombre"`
	Tipo      string `json:"tipo"`
	Capacidad int    `json:"capacidad"`
}

// CatalogClient consulta el catálogo de espacios por HTTP.
type CatalogClient struct {
	baseURL string
	http    *http.Client
}

func NewCatalogClient(baseURL string) *CatalogClient {
	return &CatalogClient{
		baseURL: baseURL,
		http:    &http.Client{Timeout: 5 * time.Second},
	}
}

// ObtenerEspacio pide GET /spaces/{id} reenviando el token del usuario. Mapea el
// 404 del catálogo a ErrEspacioNoEncontrado y cualquier otra falla a
// ErrCatalogoNoDisponible.
func (c *CatalogClient) ObtenerEspacio(ctx context.Context, id int, token string) (*EspacioDTO, error) {
	url := fmt.Sprintf("%s/spaces/%d", c.baseURL, id)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, apperror.ErrCatalogoNoDisponible
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, apperror.ErrCatalogoNoDisponible
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		var espacio EspacioDTO
		if err := json.NewDecoder(resp.Body).Decode(&espacio); err != nil {
			return nil, apperror.ErrCatalogoNoDisponible
		}
		return &espacio, nil
	case http.StatusNotFound:
		return nil, apperror.ErrEspacioNoEncontrado
	case http.StatusUnauthorized, http.StatusForbidden:
		return nil, apperror.ErrTokenInvalido
	default:
		return nil, apperror.ErrCatalogoNoDisponible
	}
}
