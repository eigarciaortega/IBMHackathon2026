package validators

import (
	"errors"
	"testing"
	"time"

	"github.com/i0dk1/OfficeSpace/booking-service/internal/apperror"
)

func codigo(t *testing.T, err error) string {
	t.Helper()
	var ae *apperror.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("se esperaba *AppError, se obtuvo %v", err)
	}
	return ae.Codigo
}

func TestSolapan(t *testing.T) {
	casos := []struct {
		nombre                 string
		ia, fa, ib, fb         string
		esperado               bool
	}{
		{"solapamiento parcial", "09:00", "10:00", "09:30", "10:30", true},
		{"abrazo (envuelve)", "08:00", "12:00", "09:00", "10:00", true},
		{"idénticos", "09:00", "10:00", "09:00", "10:00", true},
		{"consecutivas (límites exclusivos)", "10:00", "11:00", "11:00", "12:00", false},
		{"disjuntos", "09:00", "10:00", "14:00", "15:00", false},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			if got := Solapan(c.ia, c.fa, c.ib, c.fb); got != c.esperado {
				t.Errorf("Solapan(%s-%s, %s-%s) = %v; se esperaba %v", c.ia, c.fa, c.ib, c.fb, got, c.esperado)
			}
		})
	}
}

func TestValidarConsistenciaTemporal(t *testing.T) {
	if err := ValidarConsistenciaTemporal("09:00", "10:00"); err != nil {
		t.Errorf("09:00-10:00 debió ser válido: %v", err)
	}
	if c := codigo(t, ValidarConsistenciaTemporal("10:00", "10:00")); c != "HORARIO_INVALIDO" {
		t.Errorf("fin==inicio: código %q; se esperaba HORARIO_INVALIDO", c)
	}
	if c := codigo(t, ValidarConsistenciaTemporal("11:00", "10:00")); c != "HORARIO_INVALIDO" {
		t.Errorf("fin<inicio: código %q; se esperaba HORARIO_INVALIDO", c)
	}
	if c := codigo(t, ValidarConsistenciaTemporal("25:99", "10:00")); c != "FECHA_INVALIDA" {
		t.Errorf("formato malo: código %q; se esperaba FECHA_INVALIDA", c)
	}
}

func TestValidarNoEnPasado(t *testing.T) {
	loc := cargarLoc()
	ahora := time.Date(2026, 6, 23, 12, 0, 0, 0, loc)

	if err := ValidarNoEnPasado("2026-06-24", "09:00", ahora, loc); err != nil {
		t.Errorf("una fecha futura debió ser válida: %v", err)
	}
	if c := codigo(t, ValidarNoEnPasado("2020-01-01", "09:00", ahora, loc)); c != "FECHA_PASADA" {
		t.Errorf("fecha pasada: código %q; se esperaba FECHA_PASADA", c)
	}
	if c := codigo(t, ValidarNoEnPasado("no-fecha", "09:00", ahora, loc)); c != "FECHA_INVALIDA" {
		t.Errorf("formato malo: código %q; se esperaba FECHA_INVALIDA", c)
	}
}

func TestValidarCapacidad(t *testing.T) {
	if err := ValidarCapacidad(4, 8); err != nil {
		t.Errorf("4 de 8 debió ser válido: %v", err)
	}
	if c := codigo(t, ValidarCapacidad(0, 8)); c != "ASISTENTES_INVALIDOS" {
		t.Errorf("0 asistentes: código %q; se esperaba ASISTENTES_INVALIDOS", c)
	}
	if c := codigo(t, ValidarCapacidad(9, 8)); c != "CAPACIDAD_EXCEDIDA" {
		t.Errorf("9 de 8: código %q; se esperaba CAPACIDAD_EXCEDIDA", c)
	}
}

func cargarLoc() *time.Location {
	loc, err := time.LoadLocation("America/Mexico_City")
	if err != nil {
		return time.UTC
	}
	return loc
}
