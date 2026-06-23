// Package validators contiene las reglas críticas de validación de reservas como
// funciones puras y fáciles de probar. La verificación de solapamiento contra la
// base de datos vive en el repositorio; aquí está la regla lógica de solapamiento
// (límites exclusivos) usada y verificada con pruebas unitarias.
package validators

import (
	"time"

	"github.com/i0dk1/OfficeSpace/booking-service/internal/apperror"
)

const (
	formatoHora        = "15:04"
	formatoFecha       = "2006-01-02"
	formatoFechaHora   = "2006-01-02 15:04"
)

// ValidarFecha verifica que la fecha tenga el formato YYYY-MM-DD.
func ValidarFecha(fecha string) error {
	if _, err := time.Parse(formatoFecha, fecha); err != nil {
		return apperror.ErrFechaInvalida
	}
	return nil
}

// ValidarConsistenciaTemporal verifica el formato de las horas y que fin > inicio.
func ValidarConsistenciaTemporal(inicio, fin string) error {
	ti, err := time.Parse(formatoHora, inicio)
	if err != nil {
		return apperror.ErrFechaInvalida
	}
	tf, err := time.Parse(formatoHora, fin)
	if err != nil {
		return apperror.ErrFechaInvalida
	}
	if !tf.After(ti) {
		return apperror.ErrHorarioInvalido
	}
	return nil
}

// ValidarNoEnPasado verifica que el inicio de la reserva no sea anterior a
// "ahora", interpretando la fecha/hora en la zona horaria indicada.
func ValidarNoEnPasado(fecha, inicio string, ahora time.Time, loc *time.Location) error {
	inicioDT, err := time.ParseInLocation(formatoFechaHora, fecha+" "+inicio, loc)
	if err != nil {
		return apperror.ErrFechaInvalida
	}
	if inicioDT.Before(ahora) {
		return apperror.ErrFechaPasada
	}
	return nil
}

// ValidarCapacidad verifica que los asistentes sean positivos y no superen la
// capacidad del espacio.
func ValidarCapacidad(asistentes, capacidad int) error {
	if asistentes <= 0 {
		return apperror.ErrAsistentesInvalidos
	}
	if asistentes > capacidad {
		return apperror.ErrCapacidadExcedida
	}
	return nil
}

// Solapan indica si dos intervalos horarios se traslapan usando límites
// exclusivos [inicio, fin): dos reservas consecutivas (10:00-11:00 y 11:00-12:00)
// NO se solapan, pero el caso "abrazo" (una envolviendo a otra) sí. Las horas en
// formato "HH:MM" con ceros a la izquierda se comparan correctamente como texto.
func Solapan(inicioA, finA, inicioB, finB string) bool {
	return inicioA < finB && finA > inicioB
}
