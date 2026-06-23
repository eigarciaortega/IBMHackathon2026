"""
Business logic validators for Reservation Service.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
from models import Reservation, Room, User
from fastapi import HTTPException, status


def validate_user_exists(db: Session, usuario_id: str) -> User:
    """
    Validate that a user exists.
    
    Args:
        db: Database session
        usuario_id: User UUID
        
    Returns:
        User: User object if found
        
    Raises:
        HTTPException: If user not found
    """
    user = db.query(User).filter(User.id == usuario_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {usuario_id} not found"
        )
    return user


def validate_room_exists(db: Session, sala_id: str) -> Room:
    """
    Validate that a room exists.
    
    Args:
        db: Database session
        sala_id: Room UUID
        
    Returns:
        Room: Room object if found
        
    Raises:
        HTTPException: If room not found
    """
    room = db.query(Room).filter(Room.id == sala_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {sala_id} not found"
        )
    return room


def validate_room_available(room: Room):
    """
    Validate that a room is available.
    
    Args:
        room: Room object
        
    Raises:
        HTTPException: If room is not available
    """
    if room.estado != "disponible":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room '{room.nombre}' is currently occupied"
        )


def validate_capacity(room: Room, cantidad_personas: int):
    """
    Validate that the number of people doesn't exceed room capacity.
    
    Args:
        room: Room object
        cantidad_personas: Number of people
        
    Raises:
        HTTPException: If capacity is exceeded
    """
    if cantidad_personas > room.capacidad:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Number of people ({cantidad_personas}) exceeds room capacity ({room.capacidad})"
        )


def validate_no_date_conflicts(
    db: Session,
    sala_id: str,
    fecha_inicio: datetime,
    fecha_fin: datetime,
    exclude_reservation_id: str = None
):
    """
    Validate that there are no date conflicts with existing reservations.
    
    Args:
        db: Database session
        sala_id: Room UUID
        fecha_inicio: Start date and time
        fecha_fin: End date and time
        exclude_reservation_id: Optional reservation ID to exclude from check (for updates)
        
    Raises:
        HTTPException: If there are date conflicts
    """
    # Query for overlapping reservations
    query = db.query(Reservation).filter(
        Reservation.sala_id == sala_id,
        Reservation.estado == "abierto",  # Only check active reservations
        or_(
            # New reservation starts during existing reservation
            and_(
                Reservation.fecha_inicio <= fecha_inicio,
                Reservation.fecha_fin > fecha_inicio
            ),
            # New reservation ends during existing reservation
            and_(
                Reservation.fecha_inicio < fecha_fin,
                Reservation.fecha_fin >= fecha_fin
            ),
            # New reservation completely contains existing reservation
            and_(
                Reservation.fecha_inicio >= fecha_inicio,
                Reservation.fecha_fin <= fecha_fin
            )
        )
    )
    
    # Exclude specific reservation if provided (for updates)
    if exclude_reservation_id:
        query = query.filter(Reservation.id != exclude_reservation_id)
    
    conflicting_reservation = query.first()
    
    if conflicting_reservation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room is already reserved from {conflicting_reservation.fecha_inicio} to {conflicting_reservation.fecha_fin}"
        )


def validate_dates_in_future(fecha_inicio: datetime, fecha_fin: datetime):
    """
    Validate that reservation dates are in the future.
    
    Args:
        fecha_inicio: Start date and time
        fecha_fin: End date and time
        
    Raises:
        HTTPException: If dates are in the past
    """
    now = datetime.utcnow()
    if fecha_inicio < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be in the future"
        )
    if fecha_fin < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be in the future"
        )


def validate_reservation_can_be_cancelled(reservation: Reservation):
    """
    Validate that a reservation can be cancelled.
    
    Args:
        reservation: Reservation object
        
    Raises:
        HTTPException: If reservation cannot be cancelled
    """
    if reservation.estado == "cancelado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation is already cancelled"
        )

# Made with Bob
