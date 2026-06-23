"""
Pydantic schemas for Room Service request/response validation.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from enum import Enum
import uuid


class TipoRoom(str, Enum):
    """Enum for room types."""
    SALA = "sala"
    ESCRITORIO = "escritorio"


class EstadoRoom(str, Enum):
    """Enum for room status."""
    DISPONIBLE = "disponible"
    OCUPADO = "ocupado"


class RoomBase(BaseModel):
    """Base room schema with common attributes."""
    nombre: str = Field(..., min_length=1, max_length=255, description="Room name")
    tipo: TipoRoom = Field(..., description="Room type (sala or escritorio)")
    recursos: List[str] = Field(default=[], description="List of resources")
    capacidad: int = Field(..., gt=0, description="Maximum capacity (must be positive)")


class RoomCreate(RoomBase):
    """Schema for creating a new room."""
    pass


class RoomUpdate(RoomBase):
    """Schema for updating a room."""
    pass


class RoomResponse(RoomBase):
    """Schema for room response."""
    id: uuid.UUID
    estado: EstadoRoom
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RoomListResponse(BaseModel):
    """Schema for paginated room list response."""
    items: List[RoomResponse]
    total: int
    page: int
    size: int
    pages: int

# Made with Bob
