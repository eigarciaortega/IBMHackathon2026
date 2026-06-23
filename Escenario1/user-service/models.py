"""
SQLAlchemy models for User Service.
"""

from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import sys
import os

# Add parent directory to path to import database connection
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.connection import Base


class User(Base):
    """
    User model for authentication and user management.
    
    Attributes:
        id: Unique identifier (UUID)
        nombre: User's full name
        correo: User's email (unique)
        contrasena: Hashed password
        role: User role (Administrador or Colaborador)
        created_at: Timestamp of user creation
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(255), nullable=False)
    correo = Column(String(255), unique=True, nullable=False, index=True)
    contrasena = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Colaborador")
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, nombre={self.nombre}, correo={self.correo})>"

# Made with Bob
