"""Unit tests for the room-service use cases (main.py)."""

import uuid
from datetime import datetime
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

import main
from models import Room
from schemas import RoomCreate, RoomUpdate, TipoRoom


def make_room(**overrides):
    defaults = dict(
        id=uuid.uuid4(),
        nombre="Sala A",
        tipo="sala",
        recursos=["proyector"],
        capacidad=10,
        estado="disponible",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    defaults.update(overrides)
    return Room(**defaults)


ADMIN_USER = {"user_id": "admin-id", "correo": "admin@example.com", "role": "Administrador"}


class TestCreateRoom:
    @pytest.mark.asyncio
    async def test_creates_room_with_defaults(self):
        db = MagicMock()
        room_data = RoomCreate(nombre="Sala A", tipo=TipoRoom.SALA, recursos=["proyector"], capacidad=10)

        result = await main.create_room(room_data, db, ADMIN_USER)

        assert result.nombre == "Sala A"
        assert result.estado == "disponible"
        db.add.assert_called_once()
        db.commit.assert_called_once()
        db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_defaults_recursos_to_empty_list_when_none(self):
        db = MagicMock()
        room_data = RoomCreate(nombre="Sala B", tipo=TipoRoom.ESCRITORIO, capacidad=1)

        result = await main.create_room(room_data, db, ADMIN_USER)
        assert result.recursos == []

    @pytest.mark.asyncio
    async def test_raises_500_and_rolls_back_on_db_error(self):
        db = MagicMock()
        db.commit.side_effect = Exception("db is down")
        room_data = RoomCreate(nombre="Sala A", tipo=TipoRoom.SALA, capacidad=10)

        with pytest.raises(HTTPException) as exc_info:
            await main.create_room(room_data, db, ADMIN_USER)
        assert exc_info.value.status_code == 500
        db.rollback.assert_called_once()


class TestListRooms:
    @pytest.mark.asyncio
    async def test_returns_paginated_results(self):
        rooms = [make_room() for _ in range(3)]
        db = MagicMock()
        query = db.query.return_value
        query.count.return_value = 25
        query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = rooms

        result = await main.list_rooms(page=2, size=10, search=None, db=db)

        assert result.total == 25
        assert result.page == 2
        assert result.size == 10
        assert result.pages == 3  # ceil(25/10)
        assert len(result.items) == 3
        query.filter.assert_not_called()

    @pytest.mark.asyncio
    async def test_applies_search_filter_when_provided(self):
        db = MagicMock()
        query = db.query.return_value
        query.filter.return_value = query
        query.count.return_value = 0
        query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []

        result = await main.list_rooms(page=1, size=10, search="Sala", db=db)

        query.filter.assert_called_once()
        assert result.total == 0
        assert result.pages == 0


class TestGetRoom:
    @pytest.mark.asyncio
    async def test_returns_room_when_found(self):
        room = make_room()
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = room

        result = await main.get_room(str(room.id), db)
        assert result is room

    @pytest.mark.asyncio
    async def test_raises_404_when_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await main.get_room(str(uuid.uuid4()), db)
        assert exc_info.value.status_code == 404


class TestUpdateRoom:
    @pytest.mark.asyncio
    async def test_updates_existing_room_fields(self):
        room = make_room(nombre="Old Name", capacidad=5)
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = room

        room_data = RoomUpdate(nombre="New Name", tipo=TipoRoom.SALA, recursos=["pizarra"], capacidad=8)
        result = await main.update_room(str(room.id), room_data, db, ADMIN_USER)

        assert result.nombre == "New Name"
        assert result.capacidad == 8
        assert result.recursos == ["pizarra"]
        db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_404_when_room_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        room_data = RoomUpdate(nombre="New Name", tipo=TipoRoom.SALA, capacidad=8)

        with pytest.raises(HTTPException) as exc_info:
            await main.update_room(str(uuid.uuid4()), room_data, db, ADMIN_USER)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_raises_500_and_rolls_back_on_db_error(self):
        room = make_room()
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = room
        db.commit.side_effect = Exception("db is down")
        room_data = RoomUpdate(nombre="New Name", tipo=TipoRoom.SALA, capacidad=8)

        with pytest.raises(HTTPException) as exc_info:
            await main.update_room(str(room.id), room_data, db, ADMIN_USER)
        assert exc_info.value.status_code == 500
        db.rollback.assert_called_once()


class TestDeleteRoom:
    @pytest.mark.asyncio
    async def test_deletes_existing_room(self):
        room = make_room()
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = room

        result = await main.delete_room(str(room.id), db, ADMIN_USER)

        assert result is None
        db.delete.assert_called_once_with(room)
        db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_404_when_room_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await main.delete_room(str(uuid.uuid4()), db, ADMIN_USER)
        assert exc_info.value.status_code == 404
        db.delete.assert_not_called()
