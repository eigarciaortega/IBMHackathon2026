// Package repository implementa el acceso a datos con pgx. No contiene lógica de
// negocio: solo traduce entre la base de datos y los structs de dominio.
package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/i0dk1/OfficeSpace/auth-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/auth-service/internal/models"
)

// UsuarioRepository accede a la tabla usuarios.
type UsuarioRepository struct {
	pool *pgxpool.Pool
}

func NewUsuarioRepository(pool *pgxpool.Pool) *UsuarioRepository {
	return &UsuarioRepository{pool: pool}
}

// ObtenerPorEmail devuelve el usuario con ese email o ErrUsuarioNoEncontrado.
func (r *UsuarioRepository) ObtenerPorEmail(ctx context.Context, email string) (*models.Usuario, error) {
	const consulta = `
		SELECT id, email, password_hash, rol, nombre, creado_en
		FROM usuarios
		WHERE email = $1`

	var u models.Usuario
	err := r.pool.QueryRow(ctx, consulta, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Rol, &u.Nombre, &u.CreadoEn,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrUsuarioNoEncontrado
		}
		return nil, err
	}
	return &u, nil
}
