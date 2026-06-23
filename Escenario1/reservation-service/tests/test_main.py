"""Unit tests for the reservation-service use cases (main.py).

Validators are exercised separately in test_validators.py, so here they are
monkeypatched to isolate the orchestration logic of each route.
"""

import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

import main
from models import Reservation, Room, User
from schemas import ReservationCreate


def make_room(**overrides):
    defaults = dict(id=uuid.uuid4(), nombre="Sala A", tipo="sala", capacidad=10, estado="disponible")
    defaults.update(overrides)
    return Room(**defaults)


def make_user(**overrides):
    defaults = dict(id=uuid.uuid4(), nombre="Jane", correo="jane@example.com", contrasena="hash")
    defaults.update(overrides)
    return User(**defaults)


def make_reservation(**overrides):
    defaults = dict(
        id=uuid.uuid4(),
        sala_id=uuid.uuid4(),
        usuario_id=uuid.uuid4(),
        fecha_inicio=datetime.utcnow() + timedelta(days=1),
        fecha_fin=datetime.utcnow() + timedelta(days=1, hours=2),
        cantidad_personas=2,
        estado="abierto",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    defaults.update(overrides)
    return Reservation(**defaults)


class TestCreateReservation:
    @pytest.mark.asyncio
    async def test_creates_reservation_when_all_validations_pass(self, monkeypatch):
        user = make_user()
        room = make_room(estado="disponible")
        db = MagicMock()

        monkeypatch.setattr(main, "validate_user_exists", lambda db, uid: user)
        monkeypatch.setattr(main, "validate_room_exists", lambda db, rid: room)
        monkeypatch.setattr(main, "validate_room_available", lambda r: None)
        monkeypatch.setattr(main, "validate_capacity", lambda r, n: None)
        monkeypatch.setattr(main, "validate_dates_in_future", lambda fi, ff: None)
        monkeypatch.setattr(main, "validate_no_date_conflicts", lambda *a, **k: None)

        reservation_data = ReservationCreate(
            sala_id=room.id,
            usuario_id=user.id,
            fecha_inicio=datetime.utcnow() + timedelta(days=1),
            fecha_fin=datetime.utcnow() + timedelta(days=1, hours=2),
            cantidad_personas=2,
        )

        result = await main.create_reservation(reservation_data, db, str(user.id))

        assert result.estado == "abierto"
        assert room.estado == "ocupado"  # room marked occupied as a side effect
        db.add.assert_called_once()
        db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_propagates_validation_failure(self, monkeypatch):
        user = make_user()
        room = make_room(estado="ocupado")
        db = MagicMock()

        monkeypatch.setattr(main, "validate_user_exists", lambda db, uid: user)
        monkeypatch.setattr(main, "validate_room_exists", lambda db, rid: room)

        def raise_unavailable(r):
            raise HTTPException(status_code=400, detail="Room is currently occupied")

        monkeypatch.setattr(main, "validate_room_available", raise_unavailable)

        reservation_data = ReservationCreate(
            sala_id=room.id,
            usuario_id=user.id,
            fecha_inicio=datetime.utcnow() + timedelta(days=1),
            fecha_fin=datetime.utcnow() + timedelta(days=1, hours=2),
            cantidad_personas=2,
        )

        with pytest.raises(HTTPException) as exc_info:
            await main.create_reservation(reservation_data, db, str(user.id))
        assert exc_info.value.status_code == 400
        db.add.assert_not_called()


class TestListReservations:
    @pytest.mark.asyncio
    async def test_returns_only_current_users_reservations_with_details(self):
        user = make_user()
        room = make_room()
        reservation = make_reservation(usuario_id=user.id, sala_id=room.id)

        db = MagicMock()
        reservation_query = db.query.return_value
        reservation_query.filter.return_value = reservation_query
        reservation_query.order_by.return_value.all.return_value = [reservation]

        def query_side_effect(model):
            if model is Reservation:
                return reservation_query
            if model is User:
                m = MagicMock()
                m.filter.return_value.first.return_value = user
                return m
            if model is Room:
                m = MagicMock()
                m.filter.return_value.first.return_value = room
                return m
            return MagicMock()

        db.query.side_effect = query_side_effect

        result = await main.list_reservations(None, None, db, str(user.id))

        assert len(result.items) == 1
        assert result.items[0].usuario.id == user.id
        assert result.items[0].sala.id == room.id


class TestGetReservation:
    @pytest.mark.asyncio
    async def test_returns_404_when_not_found_or_not_owned(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await main.get_reservation(str(uuid.uuid4()), db, str(uuid.uuid4()))
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_returns_detail_when_found(self):
        user = make_user()
        room = make_room()
        reservation = make_reservation(usuario_id=user.id, sala_id=room.id)

        db = MagicMock()

        def query_side_effect(model):
            if model is Reservation:
                m = MagicMock()
                m.filter.return_value.first.return_value = reservation
                return m
            if model is User:
                m = MagicMock()
                m.filter.return_value.first.return_value = user
                return m
            if model is Room:
                m = MagicMock()
                m.filter.return_value.first.return_value = room
                return m
            return MagicMock()

        db.query.side_effect = query_side_effect

        result = await main.get_reservation(str(reservation.id), db, str(user.id))
        assert result.id == reservation.id
        assert result.usuario.id == user.id
        assert result.sala.id == room.id


class TestCancelReservation:
    @pytest.mark.asyncio
    async def test_returns_404_when_not_found_or_not_owned(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await main.cancel_reservation(str(uuid.uuid4()), db, str(uuid.uuid4()))
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_raises_400_when_already_cancelled(self):
        reservation = make_reservation(estado="cancelado")
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = reservation

        with pytest.raises(HTTPException) as exc_info:
            await main.cancel_reservation(str(reservation.id), db, str(reservation.usuario_id))
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_cancels_reservation_and_frees_room(self):
        room = make_room(estado="ocupado")
        reservation = make_reservation(estado="abierto", sala_id=room.id)

        db = MagicMock()

        def query_side_effect(model):
            if model is Reservation:
                m = MagicMock()
                m.filter.return_value.first.return_value = reservation
                return m
            if model is Room:
                m = MagicMock()
                m.filter.return_value.first.return_value = room
                return m
            return MagicMock()

        db.query.side_effect = query_side_effect

        result = await main.cancel_reservation(str(reservation.id), db, str(reservation.usuario_id))

        assert reservation.estado == "cancelado"
        assert room.estado == "disponible"
        assert result.estado == "cancelado"
        db.commit.assert_called_once()
