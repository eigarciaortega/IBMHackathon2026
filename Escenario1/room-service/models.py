"""
SQLAlchemy models for Room Service.
"""

from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
import sys
import os

# Add parent directory to path to import database connection
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.connection import Base


class Room(Base):
    """
    Room model for meeting rooms and workspaces.
    
    Attributes:
        id: Unique identifier (UUID)
        nombre: Room name
        tipo: Room type (sala, escritorio)
        recursos: List of resources (computadora, aire_condicionado, proyector)
        capacidad: Maximum capacity (number of people)
        estado: Current status (disponible, ocupado)
        created_at: Timestamp of room creation
        updated_at: Timestamp of last update
    """
    __tablename__ = "rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(255), nullable=False)
    tipo = Column(String(50), nullable=False)  # sala, escritorio
    recursos = Column(JSONB, nullable=False, server_default='[]')  # ["computadora", "proyector", etc.]
    capacidad = Column(Integer, nullable=False)
    estado = Column(String(50), nullable=False, default="disponible")  # disponible, ocupado
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Room(id={self.id}, nombre={self.nombre}, tipo={self.tipo}, estado={self.estado})>"

# Made with Bob
