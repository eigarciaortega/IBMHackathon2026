"""
SQLAlchemy models for Reservation Service.
"""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import sys
import os

# Add parent directory to path to import database connection
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.connection import Base


class User(Base):
    """User model (read-only for reservation service)."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(255), nullable=False)
    correo = Column(String(255), unique=True, nullable=False)
    contrasena = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Colaborador")
    created_at = Column(DateTime, default=datetime.utcnow)


class Room(Base):
    """Room model (read-only for reservation service)."""
    __tablename__ = "rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(255), nullable=False)
    tipo = Column(String(50), nullable=False)
    recursos = Column(JSONB, default=list)
    capacidad = Column(Integer, nullable=False)
    estado = Column(String(50), nullable=False, default="disponible")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Reservation(Base):
    """
    Reservation model for room bookings.
    
    Attributes:
        id: Unique identifier (UUID)
        sala_id: Foreign key to rooms table
        usuario_id: Foreign key to users table
        fecha_inicio: Start date and time
        fecha_fin: End date and time
        cantidad_personas: Number of people
        estado: Reservation status (abierto, cancelado)
        created_at: Timestamp of reservation creation
        updated_at: Timestamp of last update
    """
    __tablename__ = "reservations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sala_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)
    cantidad_personas = Column(Integer, nullable=False)
    estado = Column(String(50), nullable=False, default="abierto")  # abierto, cancelado
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Reservation(id={self.id}, sala_id={self.sala_id}, estado={self.estado})>"

# Made with Bob
