// Package repository implementa el acceso a datos con pgx. Sin lógica de negocio.
package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/models"
)

// EspacioRepository accede a la tabla espacios.
type EspacioRepository struct {
	pool *pgxpool.Pool
}

func NewEspacioRepository(pool *pgxpool.Pool) *EspacioRepository {
	return &EspacioRepository{pool: pool}
}

const columnas = "id, nombre, tipo, capacidad, tiene_proyector, tiene_aire, piso, creado_en"

// Listar devuelve los espacios aplicando los filtros opcionales (tipo y
// capacidad mínima). Los filtros se aplican de verdad en la consulta SQL.
func (r *EspacioRepository) Listar(ctx context.Context, filtro models.FiltroEspacios) ([]models.Espacio, error) {
	consulta := "SELECT " + columnas + " FROM espacios"
	condiciones := []string{}
	args := []interface{}{}

	if filtro.Tipo != "" {
		args = append(args, filtro.Tipo)
		condiciones = append(condiciones, fmt.Sprintf("tipo = $%d", len(args)))
	}
	if filtro.CapacidadMin > 0 {
		args = append(args, filtro.CapacidadMin)
		condiciones = append(condiciones, fmt.Sprintf("capacidad >= $%d", len(args)))
	}
	for i, c := range condiciones {
		if i == 0 {
			consulta += " WHERE "
		} else {
			consulta += " AND "
		}
		consulta += c
	}
	consulta += " ORDER BY id"

	filas, err := r.pool.Query(ctx, consulta, args...)
	if err != nil {
		return nil, err
	}
	defer filas.Close()

	espacios := []models.Espacio{}
	for filas.Next() {
		var e models.Espacio
		if err := filas.Scan(&e.ID, &e.Nombre, &e.Tipo, &e.Capacidad, &e.TieneProyector, &e.TieneAire, &e.Piso, &e.CreadoEn); err != nil {
			return nil, err
		}
		espacios = append(espacios, e)
	}
	return espacios, filas.Err()
}

// ObtenerPorID devuelve un espacio o ErrEspacioNoEncontrado.
func (r *EspacioRepository) ObtenerPorID(ctx context.Context, id int) (*models.Espacio, error) {
	consulta := "SELECT " + columnas + " FROM espacios WHERE id = $1"
	var e models.Espacio
	err := r.pool.QueryRow(ctx, consulta, id).Scan(
		&e.ID, &e.Nombre, &e.Tipo, &e.Capacidad, &e.TieneProyector, &e.TieneAire, &e.Piso, &e.CreadoEn,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrEspacioNoEncontrado
		}
		return nil, err
	}
	return &e, nil
}

// Crear inserta un espacio y devuelve el registro resultante.
func (r *EspacioRepository) Crear(ctx context.Context, req models.EspacioRequest) (*models.Espacio, error) {
	consulta := `
		INSERT INTO espacios (nombre, tipo, capacidad, tiene_proyector, tiene_aire, piso)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + columnas
	var e models.Espacio
	err := r.pool.QueryRow(ctx, consulta,
		req.Nombre, req.Tipo, req.Capacidad, req.TieneProyector, req.TieneAire, req.Piso,
	).Scan(&e.ID, &e.Nombre, &e.Tipo, &e.Capacidad, &e.TieneProyector, &e.TieneAire, &e.Piso, &e.CreadoEn)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

// Actualizar modifica un espacio existente; ErrEspacioNoEncontrado si no existe.
func (r *EspacioRepository) Actualizar(ctx context.Context, id int, req models.EspacioRequest) (*models.Espacio, error) {
	consulta := `
		UPDATE espacios
		SET nombre = $1, tipo = $2, capacidad = $3, tiene_proyector = $4, tiene_aire = $5, piso = $6
		WHERE id = $7
		RETURNING ` + columnas
	var e models.Espacio
	err := r.pool.QueryRow(ctx, consulta,
		req.Nombre, req.Tipo, req.Capacidad, req.TieneProyector, req.TieneAire, req.Piso, id,
	).Scan(&e.ID, &e.Nombre, &e.Tipo, &e.Capacidad, &e.TieneProyector, &e.TieneAire, &e.Piso, &e.CreadoEn)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrEspacioNoEncontrado
		}
		return nil, err
	}
	return &e, nil
}

// Eliminar borra un espacio; ErrEspacioNoEncontrado si no existía.
func (r *EspacioRepository) Eliminar(ctx context.Context, id int) error {
	etiqueta, err := r.pool.Exec(ctx, "DELETE FROM espacios WHERE id = $1", id)
	if err != nil {
		return err
	}
	if etiqueta.RowsAffected() == 0 {
		return apperror.ErrEspacioNoEncontrado
	}
	return nil
}
