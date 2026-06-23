"""Unit tests for reservation-service/validators.py."""

import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from models import Reservation, Room, User
from validators import (
    validate_capacity,
    validate_dates_in_future,
    validate_no_date_conflicts,
    validate_reservation_can_be_cancelled,
    validate_room_available,
    validate_room_exists,
    validate_user_exists,
)


def make_room(**overrides):
    defaults = dict(id=uuid.uuid4(), nombre="Sala A", tipo="sala", capacidad=10, estado="disponible")
    defaults.update(overrides)
    return Room(**defaults)


def make_reservation(**overrides):
    defaults = dict(
        id=uuid.uuid4(),
        sala_id=uuid.uuid4(),
        usuario_id=uuid.uuid4(),
        fecha_inicio=datetime.utcnow() + timedelta(days=1),
        fecha_fin=datetime.utcnow() + timedelta(days=1, hours=2),
        cantidad_personas=2,
        estado="abierto",
    )
    defaults.update(overrides)
    return Reservation(**defaults)


class TestValidateUserExists:
    def test_returns_user_when_found(self):
        db = MagicMock()
        user = User(id=uuid.uuid4(), nombre="Jane", correo="jane@example.com", contrasena="hash")
        db.query.return_value.filter.return_value.first.return_value = user

        assert validate_user_exists(db, str(user.id)) is user

    def test_raises_404_when_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            validate_user_exists(db, str(uuid.uuid4()))
        assert exc_info.value.status_code == 404


class TestValidateRoomExists:
    def test_returns_room_when_found(self):
        db = MagicMock()
        room = make_room()
        db.query.return_value.filter.return_value.first.return_value = room

        assert validate_room_exists(db, str(room.id)) is room

    def test_raises_404_when_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            validate_room_exists(db, str(uuid.uuid4()))
        assert exc_info.value.status_code == 404


class TestValidateRoomAvailable:
    def test_passes_when_room_is_disponible(self):
        room = make_room(estado="disponible")
        validate_room_available(room)  # should not raise

    def test_raises_400_when_room_is_ocupado(self):
        room = make_room(estado="ocupado")
        with pytest.raises(HTTPException) as exc_info:
            validate_room_available(room)
        assert exc_info.value.status_code == 400


class TestValidateCapacity:
    def test_passes_when_within_capacity(self):
        room = make_room(capacidad=10)
        validate_capacity(room, 10)  # should not raise

    def test_raises_400_when_exceeds_capacity(self):
        room = make_room(capacidad=5)
        with pytest.raises(HTTPException) as exc_info:
            validate_capacity(room, 6)
        assert exc_info.value.status_code == 400


class TestValidateNoDateConflicts:
    def test_passes_when_no_conflicting_reservation(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        validate_no_date_conflicts(
            db, str(uuid.uuid4()), datetime.utcnow(), datetime.utcnow() + timedelta(hours=1)
        )  # should not raise

    def test_raises_409_when_conflicting_reservation_exists(self):
        db = MagicMock()
        conflicting = make_reservation()
        db.query.return_value.filter.return_value.first.return_value = conflicting

        with pytest.raises(HTTPException) as exc_info:
            validate_no_date_conflicts(
                db, str(uuid.uuid4()), datetime.utcnow(), datetime.utcnow() + timedelta(hours=1)
            )
        assert exc_info.value.status_code == 409

    def test_excludes_given_reservation_id_from_conflict_check(self):
        db = MagicMock()
        query = db.query.return_value
        query.filter.return_value = query  # chained .filter().filter()
        query.first.return_value = None

        validate_no_date_conflicts(
            db,
            str(uuid.uuid4()),
            datetime.utcnow(),
            datetime.utcnow() + timedelta(hours=1),
            exclude_reservation_id=str(uuid.uuid4()),
        )

        assert query.filter.call_count == 2  # base filter + exclude filter


class TestValidateDatesInFuture:
    def test_passes_when_both_dates_are_in_the_future(self):
        future_start = datetime.utcnow() + timedelta(days=1)
        future_end = datetime.utcnow() + timedelta(days=2)
        validate_dates_in_future(future_start, future_end)  # should not raise

    def test_raises_400_when_start_date_is_in_the_past(self):
        past_start = datetime.utcnow() - timedelta(days=1)
        future_end = datetime.utcnow() + timedelta(days=1)
        with pytest.raises(HTTPException) as exc_info:
            validate_dates_in_future(past_start, future_end)
        assert exc_info.value.status_code == 400

    def test_raises_400_when_end_date_is_in_the_past(self):
        future_start = datetime.utcnow() + timedelta(days=1)
        past_end = datetime.utcnow() - timedelta(days=1)
        with pytest.raises(HTTPException) as exc_info:
            validate_dates_in_future(future_start, past_end)
        assert exc_info.value.status_code == 400


class TestValidateReservationCanBeCancelled:
    def test_passes_when_reservation_is_abierto(self):
        reservation = make_reservation(estado="abierto")
        validate_reservation_can_be_cancelled(reservation)  # should not raise

    def test_raises_400_when_already_cancelled(self):
        reservation = make_reservation(estado="cancelado")
        with pytest.raises(HTTPException) as exc_info:
            validate_reservation_can_be_cancelled(reservation)
        assert exc_info.value.status_code == 400
