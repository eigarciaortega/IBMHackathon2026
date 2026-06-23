// Package services contiene la lógica de negocio del auth-service.
package services

import (
	"context"
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/i0dk1/OfficeSpace/auth-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/auth-service/internal/middleware"
	"github.com/i0dk1/OfficeSpace/auth-service/internal/models"
)

// UsuarioRepositorio es la dependencia de datos del servicio. Se define como
// interfaz para poder inyectar una implementación falsa en las pruebas.
type UsuarioRepositorio interface {
	ObtenerPorEmail(ctx context.Context, email string) (*models.Usuario, error)
}

// AuthService implementa el login y la consulta del usuario autenticado.
type AuthService struct {
	repo      UsuarioRepositorio
	jwtSecret []byte
	jwtExpira time.Duration
}

func NewAuthService(repo UsuarioRepositorio, jwtSecret []byte, jwtExpira time.Duration) *AuthService {
	return &AuthService{repo: repo, jwtSecret: jwtSecret, jwtExpira: jwtExpira}
}

// Login valida las credenciales contra el hash bcrypt y, si son correctas,
// emite un JWT. Cualquier fallo (usuario inexistente o contraseña incorrecta)
// devuelve el mismo error para no revelar qué parte falló.
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.LoginResponse, error) {
	if email == "" || password == "" {
		return nil, apperror.ErrCredencialesInvalidas
	}

	usuario, err := s.repo.ObtenerPorEmail(ctx, email)
	if err != nil {
		if errors.Is(err, apperror.ErrUsuarioNoEncontrado) {
			return nil, apperror.ErrCredencialesInvalidas
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(usuario.PasswordHash), []byte(password)); err != nil {
		return nil, apperror.ErrCredencialesInvalidas
	}

	token, err := middleware.GenerarToken(s.jwtSecret, s.jwtExpira, usuario.Email, usuario.Rol)
	if err != nil {
		return nil, err
	}

	return &models.LoginResponse{Token: token, Rol: usuario.Rol}, nil
}

// ObtenerUsuario regresa los datos públicos del usuario autenticado.
func (s *AuthService) ObtenerUsuario(ctx context.Context, email string) (*models.MeResponse, error) {
	usuario, err := s.repo.ObtenerPorEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	return &models.MeResponse{
		Email:  usuario.Email,
		Rol:    usuario.Rol,
		Nombre: usuario.Nombre,
	}, nil
}
