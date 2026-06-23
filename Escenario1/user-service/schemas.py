"""
Pydantic schemas for User Service request/response validation.
"""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from enum import Enum
import uuid


class UserRole(str, Enum):
    """User role enumeration for API schemas."""
    ADMINISTRADOR = "Administrador"
    COLABORADOR = "Colaborador"


class UserBase(BaseModel):
    """Base user schema with common attributes."""
    nombre: str = Field(..., min_length=1, max_length=255, description="User's full name")
    correo: EmailStr = Field(..., description="User's email address")


class UserCreate(UserBase):
    """Schema for user registration."""
    contrasena: str = Field(..., min_length=6, max_length=100, description="User's password")
    role: Optional[UserRole] = Field(default=UserRole.COLABORADOR, description="User role (default: Colaborador)")


class UserLogin(BaseModel):
    """Schema for user login."""
    correo: EmailStr = Field(..., description="User's email address")
    contrasena: str = Field(..., description="User's password")


class UserResponse(UserBase):
    """Schema for user response (without password)."""
    id: uuid.UUID
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True  # Allows ORM model to dict conversion


class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Schema for JWT token payload data."""
    user_id: Optional[str] = None
    correo: Optional[str] = None
    role: Optional[str] = None

# Made with Bob
