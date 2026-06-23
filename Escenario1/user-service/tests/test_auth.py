"""Unit tests for user-service/auth.py (password hashing and JWT helpers)."""

from datetime import timedelta

import pytest

from auth import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


class TestPasswordHashing:
    def test_get_password_hash_returns_different_value_than_plain(self):
        hashed = get_password_hash("MySecret123")
        assert hashed != "MySecret123"
        assert isinstance(hashed, str)

    def test_get_password_hash_is_salted_and_not_deterministic(self):
        hash_one = get_password_hash("MySecret123")
        hash_two = get_password_hash("MySecret123")
        assert hash_one != hash_two

    def test_verify_password_succeeds_with_correct_password(self):
        hashed = get_password_hash("CorrectPassword")
        assert verify_password("CorrectPassword", hashed) is True

    def test_verify_password_fails_with_incorrect_password(self):
        hashed = get_password_hash("CorrectPassword")
        assert verify_password("WrongPassword", hashed) is False


class TestAccessToken:
    def test_create_and_decode_access_token_roundtrip(self):
        token = create_access_token({"user_id": "abc-123", "role": "Colaborador"})
        payload = decode_access_token(token)

        assert payload is not None
        assert payload["user_id"] == "abc-123"
        assert payload["role"] == "Colaborador"
        assert "exp" in payload

    def test_create_access_token_respects_custom_expiration(self):
        token = create_access_token({"user_id": "abc-123"}, expires_delta=timedelta(minutes=5))
        payload = decode_access_token(token)
        assert payload is not None

    def test_decode_access_token_returns_none_for_invalid_token(self):
        assert decode_access_token("not-a-valid-jwt-token") is None

    def test_decode_access_token_returns_none_for_tampered_token(self):
        token = create_access_token({"user_id": "abc-123"})
        tampered = token[:-2] + ("aa" if token[-2:] != "aa" else "bb")
        assert decode_access_token(tampered) is None
