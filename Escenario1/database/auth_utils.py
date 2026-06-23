"""
Shared authentication and authorization utilities for all microservices.
This module provides role-based access control and token validation.
"""

import os
from typing import Optional
from fastapi import HTTPException, status, Header, Depends
from jose import JWTError, jwt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


class UserRole:
    """User role constants."""
    ADMINISTRADOR = "Administrador"
    COLABORADOR = "Colaborador"


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT access token.
    
    Args:
        token: JWT token string
        
    Returns:
        dict: Decoded token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user_from_token(authorization: Optional[str] = Header(None)) -> dict:
    """
    Extract and validate user information from JWT token.
    
    Args:
        authorization: Authorization header with Bearer token
        
    Returns:
        dict: User information from token (user_id, correo, role)
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("user_id")
    correo = payload.get("correo")
    role = payload.get("role")
    
    if not user_id or not correo or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {
        "user_id": user_id,
        "correo": correo,
        "role": role
    }


def require_admin(current_user: dict = Depends(get_current_user_from_token)) -> dict:
    """
    Dependency to require admin role.
    
    Args:
        current_user: Current user from token
        
    Returns:
        dict: Current user information
        
    Raises:
        HTTPException: If user is not an admin
    """
    if current_user["role"] != UserRole.ADMINISTRADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


def get_current_user_id(current_user: dict = Depends(get_current_user_from_token)) -> str:
    """
    Get current user ID from token.
    
    Args:
        current_user: Current user from token
        
    Returns:
        str: User ID
    """
    return current_user["user_id"]

# Made with Bob