"""
Pydantic schemas for Reservation Service request/response validation.
"""

from pydantic import BaseModel, Field, validator
from datetime import datetime, timezone
from typing import Optional
from enum import Enum
import uuid


class EstadoReservation(str, Enum):
    """Enum for reservation status."""
    ABIERTO = "abierto"
    CANCELADO = "cancelado"


class ReservationBase(BaseModel):
    """Base reservation schema."""
    sala_id: uuid.UUID = Field(..., description="Room ID")
    usuario_id: uuid.UUID = Field(..., description="User ID")
    fecha_inicio: datetime = Field(..., description="Start date and time")
    fecha_fin: datetime = Field(..., description="End date and time")
    cantidad_personas: int = Field(..., gt=0, description="Number of people (must be positive)")

    @validator('fecha_inicio', 'fecha_fin')
    def normalize_to_naive_utc(cls, value):
        """Strip timezone info so dates are stored/compared consistently (DB columns are naive)."""
        if value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    @validator('fecha_fin')
    def validate_dates(cls, fecha_fin, values):
        """Validate that end date is after start date."""
        if 'fecha_inicio' in values and fecha_fin <= values['fecha_inicio']:
            raise ValueError('fecha_fin must be after fecha_inicio')
        return fecha_fin


class ReservationCreate(ReservationBase):
    """Schema for creating a new reservation."""
    pass


class ReservationResponse(ReservationBase):
    """Schema for reservation response."""
    id: uuid.UUID
    estado: EstadoReservation
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserInfo(BaseModel):
    """Schema for user information in reservation response."""
    id: uuid.UUID
    nombre: str
    correo: str

    class Config:
        from_attributes = True


class RoomInfo(BaseModel):
    """Schema for room information in reservation response."""
    id: uuid.UUID
    nombre: str
    tipo: str
    capacidad: int

    class Config:
        from_attributes = True


class ReservationDetailResponse(BaseModel):
    """Schema for detailed reservation response with user and room info."""
    id: uuid.UUID
    sala: RoomInfo
    usuario: UserInfo
    fecha_inicio: datetime
    fecha_fin: datetime
    cantidad_personas: int
    estado: EstadoReservation
    created_at: datetime
    updated_at: datetime


class ReservationListResponse(BaseModel):
    """Schema for reservation list response."""
    items: list[ReservationDetailResponse]


class ReservationCancelResponse(BaseModel):
    """Schema for reservation cancellation response."""
    id: uuid.UUID
    estado: EstadoReservation
    updated_at: datetime
    message: str

# Made with Bob
