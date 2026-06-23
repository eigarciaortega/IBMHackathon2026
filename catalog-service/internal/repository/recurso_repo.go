package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/models"
)

const codigoUnicoViolado = "23505" // unique_violation (nombre de recurso repetido)

// RecursoRepository accede a la tabla recursos (catálogo gestionable).
type RecursoRepository struct {
	pool *pgxpool.Pool
}

func NewRecursoRepository(pool *pgxpool.Pool) *RecursoRepository {
	return &RecursoRepository{pool: pool}
}

func (r *RecursoRepository) Listar(ctx context.Context) ([]models.Recurso, error) {
	filas, err := r.pool.Query(ctx, "SELECT id, nombre, creado_en FROM recursos ORDER BY nombre")
	if err != nil {
		return nil, err
	}
	defer filas.Close()

	recursos := []models.Recurso{}
	for filas.Next() {
		var rec models.Recurso
		if err := filas.Scan(&rec.ID, &rec.Nombre, &rec.CreadoEn); err != nil {
			return nil, err
		}
		recursos = append(recursos, rec)
	}
	return recursos, filas.Err()
}

func (r *RecursoRepository) Crear(ctx context.Context, nombre string) (*models.Recurso, error) {
	var rec models.Recurso
	err := r.pool.QueryRow(ctx,
		"INSERT INTO recursos (nombre) VALUES ($1) RETURNING id, nombre, creado_en", nombre,
	).Scan(&rec.ID, &rec.Nombre, &rec.CreadoEn)
	if err != nil {
		if esViolacionUnica(err) {
			return nil, apperror.ErrRecursoDuplicado
		}
		return nil, err
	}
	return &rec, nil
}

func (r *RecursoRepository) Actualizar(ctx context.Context, id int, nombre string) (*models.Recurso, error) {
	var rec models.Recurso
	err := r.pool.QueryRow(ctx,
		"UPDATE recursos SET nombre = $1 WHERE id = $2 RETURNING id, nombre, creado_en", nombre, id,
	).Scan(&rec.ID, &rec.Nombre, &rec.CreadoEn)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrRecursoNoEncontrado
		}
		if esViolacionUnica(err) {
			return nil, apperror.ErrRecursoDuplicado
		}
		return nil, err
	}
	return &rec, nil
}

func (r *RecursoRepository) Eliminar(ctx context.Context, id int) error {
	etiqueta, err := r.pool.Exec(ctx, "DELETE FROM recursos WHERE id = $1", id)
	if err != nil {
		return err
	}
	if etiqueta.RowsAffected() == 0 {
		return apperror.ErrRecursoNoEncontrado
	}
	return nil
}

func esViolacionUnica(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == codigoUnicoViolado
}
