// Package config carga la configuración del booking-service desde el entorno.
package config

import (
	"fmt"
	"os"
	"strings"
)

// Config agrupa los parámetros de ejecución del servicio.
type Config struct {
	Puerto             string
	DatabaseURL        string
	JWTSecret          string
	CatalogBaseURL     string
	CORSAllowedOrigins []string
	TZ                 string
}

// Cargar lee la configuración desde el entorno y valida lo indispensable.
func Cargar() (*Config, error) {
	cfg := &Config{
		Puerto:             valorPorDefecto("PORT", "8083"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		CatalogBaseURL:     valorPorDefecto("CATALOG_BASE_URL", "http://localhost:8082"),
		CORSAllowedOrigins: listaPorDefecto("CORS_ALLOWED_ORIGINS", "http://localhost:5173"),
		TZ:                 valorPorDefecto("TZ", "America/Mexico_City"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("la variable DATABASE_URL es obligatoria")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("la variable JWT_SECRET es obligatoria")
	}
	return cfg, nil
}

func valorPorDefecto(clave, porDefecto string) string {
	if v := os.Getenv(clave); v != "" {
		return v
	}
	return porDefecto
}

func listaPorDefecto(clave, porDefecto string) []string {
	valor := valorPorDefecto(clave, porDefecto)
	partes := strings.Split(valor, ",")
	limpias := make([]string, 0, len(partes))
	for _, p := range partes {
		if t := strings.TrimSpace(p); t != "" {
			limpias = append(limpias, t)
		}
	}
	return limpias
}
