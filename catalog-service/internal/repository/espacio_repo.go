// Package repository implementa el acceso a datos con pgx. Sin lógica de negocio.
package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/models"
)

const codigoFKViolada = "23503" // foreign_key_violation (recurso inexistente)

// EspacioRepository accede a la tabla espacios y a su relación con recursos.
type EspacioRepository struct {
	pool *pgxpool.Pool
}

func NewEspacioRepository(pool *pgxpool.Pool) *EspacioRepository {
	return &EspacioRepository{pool: pool}
}

const columnas = "id, nombre, tipo, capacidad, piso, creado_en"

func escanearEspacio(fila pgx.Row, e *models.Espacio) error {
	return fila.Scan(&e.ID, &e.Nombre, &e.Tipo, &e.Capacidad, &e.Piso, &e.CreadoEn)
}

// Listar devuelve los espacios (con sus recursos) aplicando los filtros opcionales.
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
	ids := []int{}
	for filas.Next() {
		var e models.Espacio
		if err := escanearEspacio(filas, &e); err != nil {
			return nil, err
		}
		e.Recursos = []models.Recurso{}
		espacios = append(espacios, e)
		ids = append(ids, e.ID)
	}
	if err := filas.Err(); err != nil {
		return nil, err
	}

	// Carga los recursos de todos los espacios en una sola consulta.
	porEspacio, err := r.recursosPorEspacio(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range espacios {
		if rec, ok := porEspacio[espacios[i].ID]; ok {
			espacios[i].Recursos = rec
		}
	}
	return espacios, nil
}

// ObtenerPorID devuelve un espacio (con sus recursos) o ErrEspacioNoEncontrado.
func (r *EspacioRepository) ObtenerPorID(ctx context.Context, id int) (*models.Espacio, error) {
	var e models.Espacio
	if err := escanearEspacio(r.pool.QueryRow(ctx, "SELECT "+columnas+" FROM espacios WHERE id = $1", id), &e); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrEspacioNoEncontrado
		}
		return nil, err
	}
	rec, err := r.recursosDeEspacio(ctx, id)
	if err != nil {
		return nil, err
	}
	e.Recursos = rec
	return &e, nil
}

// Crear inserta un espacio y sus recursos asignados en una transacción.
func (r *EspacioRepository) Crear(ctx context.Context, req models.EspacioRequest) (*models.Espacio, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var e models.Espacio
	consulta := "INSERT INTO espacios (nombre, tipo, capacidad, piso) VALUES ($1, $2, $3, $4) RETURNING " + columnas
	if err := escanearEspacio(tx.QueryRow(ctx, consulta, req.Nombre, req.Tipo, req.Capacidad, req.Piso), &e); err != nil {
		return nil, err
	}
	if err := asignarRecursos(ctx, tx, e.ID, req.RecursoIDs); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.ObtenerPorID(ctx, e.ID)
}

// Actualizar modifica un espacio y reemplaza el conjunto de recursos asignados.
func (r *EspacioRepository) Actualizar(ctx context.Context, id int, req models.EspacioRequest) (*models.Espacio, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var e models.Espacio
	consulta := "UPDATE espacios SET nombre = $1, tipo = $2, capacidad = $3, piso = $4 WHERE id = $5 RETURNING " + columnas
	if err := escanearEspacio(tx.QueryRow(ctx, consulta, req.Nombre, req.Tipo, req.Capacidad, req.Piso, id), &e); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrEspacioNoEncontrado
		}
		return nil, err
	}
	if _, err := tx.Exec(ctx, "DELETE FROM espacio_recursos WHERE espacio_id = $1", id); err != nil {
		return nil, err
	}
	if err := asignarRecursos(ctx, tx, id, req.RecursoIDs); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.ObtenerPorID(ctx, id)
}

// Eliminar borra un espacio; ErrEspacioNoEncontrado si no existía. Sus filas en
// espacio_recursos se borran en cascada (FK ON DELETE CASCADE).
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

// asignarRecursos inserta los vínculos espacio↔recurso. Un recurso inexistente
// viola la FK y se mapea a ErrRecursoInvalido (400).
func asignarRecursos(ctx context.Context, tx pgx.Tx, espacioID int, recursoIDs []int) error {
	for _, rid := range recursoIDs {
		if _, err := tx.Exec(ctx, "INSERT INTO espacio_recursos (espacio_id, recurso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", espacioID, rid); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == codigoFKViolada {
				return apperror.ErrRecursoInvalido
			}
			return err
		}
	}
	return nil
}

func (r *EspacioRepository) recursosDeEspacio(ctx context.Context, espacioID int) ([]models.Recurso, error) {
	porEspacio, err := r.recursosPorEspacio(ctx, []int{espacioID})
	if err != nil {
		return nil, err
	}
	if rec, ok := porEspacio[espacioID]; ok {
		return rec, nil
	}
	return []models.Recurso{}, nil
}

// recursosPorEspacio carga, en una sola consulta, los recursos de varios espacios.
func (r *EspacioRepository) recursosPorEspacio(ctx context.Context, ids []int) (map[int][]models.Recurso, error) {
	porEspacio := map[int][]models.Recurso{}
	if len(ids) == 0 {
		return porEspacio, nil
	}
	filas, err := r.pool.Query(ctx, `
		SELECT er.espacio_id, r.id, r.nombre, r.creado_en
		  FROM espacio_recursos er
		  JOIN recursos r ON r.id = er.recurso_id
		 WHERE er.espacio_id = ANY($1)
		 ORDER BY r.nombre`, ids)
	if err != nil {
		return nil, err
	}
	defer filas.Close()

	for filas.Next() {
		var espacioID int
		var rec models.Recurso
		if err := filas.Scan(&espacioID, &rec.ID, &rec.Nombre, &rec.CreadoEn); err != nil {
			return nil, err
		}
		porEspacio[espacioID] = append(porEspacio[espacioID], rec)
	}
	return porEspacio, filas.Err()
}
