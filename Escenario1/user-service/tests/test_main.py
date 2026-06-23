"""Unit tests for the user-service use cases (main.py).

The service has no repository layer, so the SQLAlchemy Session is mocked
directly and the FastAPI route/dependency functions are awaited as plain
coroutines (bypassing the HTTP layer).
"""

import uuid
from datetime import datetime
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from auth import create_access_token, get_password_hash
from main import get_current_user, get_current_user_info, login_user, register_user
from models import User
from schemas import UserCreate, UserLogin


def make_user(**overrides):
    defaults = dict(
        id=uuid.uuid4(),
        nombre="Jane Doe",
        correo="jane@example.com",
        contrasena=get_password_hash("Password123"),
        role="Colaborador",
        created_at=datetime.utcnow(),
    )
    defaults.update(overrides)
    return User(**defaults)


class TestRegisterUser:
    @pytest.mark.asyncio
    async def test_register_user_creates_new_user(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        user_data = UserCreate(nombre="Jane Doe", correo="jane@example.com", contrasena="Password123")
        result = await register_user(user_data, db)

        assert result.nombre == "Jane Doe"
        assert result.correo == "jane@example.com"
        assert result.contrasena != "Password123"  # stored hashed, not plain
        db.add.assert_called_once()
        db.commit.assert_called_once()
        db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_register_user_rejects_duplicate_email(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = make_user()

        user_data = UserCreate(nombre="Jane Doe", correo="jane@example.com", contrasena="Password123")

        with pytest.raises(HTTPException) as exc_info:
            await register_user(user_data, db)

        assert exc_info.value.status_code == 409
        db.add.assert_not_called()


class TestLoginUser:
    @pytest.mark.asyncio
    async def test_login_user_succeeds_with_valid_credentials(self):
        user = make_user()
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = user

        credentials = UserLogin(correo="jane@example.com", contrasena="Password123")
        result = await login_user(credentials, db)

        assert result.token_type == "bearer"
        assert result.user.correo == "jane@example.com"
        assert isinstance(result.access_token, str) and result.access_token

    @pytest.mark.asyncio
    async def test_login_user_rejects_unknown_email(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        credentials = UserLogin(correo="missing@example.com", contrasena="Password123")

        with pytest.raises(HTTPException) as exc_info:
            await login_user(credentials, db)

        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_login_user_rejects_wrong_password(self):
        user = make_user()
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = user

        credentials = UserLogin(correo="jane@example.com", contrasena="WrongPassword")

        with pytest.raises(HTTPException) as exc_info:
            await login_user(credentials, db)

        assert exc_info.value.status_code == 401


class TestGetCurrentUser:
    def test_missing_authorization_header_raises_401(self):
        db = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization=None, db=db)
        assert exc_info.value.status_code == 401

    def test_invalid_scheme_raises_401(self):
        db = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization="Basic sometoken", db=db)
        assert exc_info.value.status_code == 401

    def test_malformed_header_raises_401(self):
        db = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization="not-a-valid-header-format-xyz", db=db)
        assert exc_info.value.status_code == 401

    def test_invalid_token_raises_401(self):
        db = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization="Bearer not-a-real-token", db=db)
        assert exc_info.value.status_code == 401

    def test_token_for_missing_user_raises_401(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        token = create_access_token({"user_id": str(uuid.uuid4()), "correo": "x@x.com", "role": "Colaborador"})

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization=f"Bearer {token}", db=db)
        assert exc_info.value.status_code == 401

    def test_valid_token_returns_user(self):
        user = make_user()
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = user
        token = create_access_token({"user_id": str(user.id), "correo": user.correo, "role": user.role})

        result = get_current_user(authorization=f"Bearer {token}", db=db)
        assert result is user


class TestGetCurrentUserInfo:
    @pytest.mark.asyncio
    async def test_returns_the_injected_current_user(self):
        user = make_user()
        result = await get_current_user_info(current_user=user)
        assert result is user
