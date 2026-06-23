package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/i0dk1/OfficeSpace/auth-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/auth-service/internal/middleware"
	"github.com/i0dk1/OfficeSpace/auth-service/internal/models"
)

// repoFake implementa UsuarioRepositorio para las pruebas, sin tocar la BD.
type repoFake struct {
	usuario *models.Usuario
	err     error
}

func (f repoFake) ObtenerPorEmail(_ context.Context, email string) (*models.Usuario, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.usuario != nil && f.usuario.Email == email {
		return f.usuario, nil
	}
	return nil, apperror.ErrUsuarioNoEncontrado
}

func usuarioConClave(t *testing.T, email, clave, rol string) *models.Usuario {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(clave), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("no se pudo generar hash: %v", err)
	}
	return &models.Usuario{Email: email, PasswordHash: string(hash), Rol: rol, Nombre: "Usuario Prueba"}
}

const secreto = "secreto-de-prueba"

func TestLoginExitoso(t *testing.T) {
	u := usuarioConClave(t, "ana@x.com", "Clave123", models.RolColaborador)
	svc := NewAuthService(repoFake{usuario: u}, []byte(secreto), time.Hour)

	resp, err := svc.Login(context.Background(), "ana@x.com", "Clave123")
	if err != nil {
		t.Fatalf("no se esperaba error: %v", err)
	}
	if resp.Rol != models.RolColaborador {
		t.Errorf("rol = %q; se esperaba %q", resp.Rol, models.RolColaborador)
	}
	// El token emitido debe ser válido y contener el email como subject.
	claims, err := middleware.ValidarToken([]byte(secreto), resp.Token)
	if err != nil {
		t.Fatalf("el token emitido no validó: %v", err)
	}
	if claims.Subject != "ana@x.com" {
		t.Errorf("subject = %q; se esperaba ana@x.com", claims.Subject)
	}
}

func TestLoginContrasenaIncorrecta(t *testing.T) {
	u := usuarioConClave(t, "ana@x.com", "Clave123", models.RolColaborador)
	svc := NewAuthService(repoFake{usuario: u}, []byte(secreto), time.Hour)

	_, err := svc.Login(context.Background(), "ana@x.com", "incorrecta")
	if !errors.Is(err, apperror.ErrCredencialesInvalidas) {
		t.Errorf("error = %v; se esperaba ErrCredencialesInvalidas", err)
	}
}

func TestLoginUsuarioInexistenteNoFiltra(t *testing.T) {
	svc := NewAuthService(repoFake{}, []byte(secreto), time.Hour)

	// Un usuario inexistente debe devolver CREDENCIALES_INVALIDAS (no NO_ENCONTRADO)
	// para no revelar si el correo existe.
	_, err := svc.Login(context.Background(), "nadie@x.com", "loquesea")
	if !errors.Is(err, apperror.ErrCredencialesInvalidas) {
		t.Errorf("error = %v; se esperaba ErrCredencialesInvalidas", err)
	}
}

func TestLoginCamposVacios(t *testing.T) {
	svc := NewAuthService(repoFake{}, []byte(secreto), time.Hour)
	if _, err := svc.Login(context.Background(), "", ""); !errors.Is(err, apperror.ErrCredencialesInvalidas) {
		t.Errorf("error = %v; se esperaba ErrCredencialesInvalidas", err)
	}
}

func TestObtenerUsuario(t *testing.T) {
	u := usuarioConClave(t, "ana@x.com", "Clave123", models.RolAdministrador)
	svc := NewAuthService(repoFake{usuario: u}, []byte(secreto), time.Hour)

	me, err := svc.ObtenerUsuario(context.Background(), "ana@x.com")
	if err != nil {
		t.Fatalf("no se esperaba error: %v", err)
	}
	if me.Email != "ana@x.com" || me.Rol != models.RolAdministrador {
		t.Errorf("respuesta inesperada: %+v", me)
	}
}
