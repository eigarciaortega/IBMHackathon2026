// Package config carga la configuración del servicio desde variables de entorno.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config agrupa todos los parámetros de ejecución del auth-service.
type Config struct {
	Puerto             string
	DatabaseURL        string
	JWTSecret          string
	JWTExpiraHoras     int
	CORSAllowedOrigins []string
	TZ                 string
}

// Cargar lee la configuración desde el entorno y valida lo indispensable.
func Cargar() (*Config, error) {
	cfg := &Config{
		Puerto:             valorPorDefecto("PORT", "8081"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		JWTExpiraHoras:     enteroPorDefecto("JWT_EXPIRA_HORAS", 8),
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

func enteroPorDefecto(clave string, porDefecto int) int {
	if v := os.Getenv(clave); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
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
