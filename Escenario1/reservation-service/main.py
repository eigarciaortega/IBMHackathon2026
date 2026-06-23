"""
Reservation Service - FastAPI application for reservation management.
Port: 8003
"""

from fastapi import FastAPI, Depends, HTTPException, status, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import sys
import os
import uuid

# Add parent directory to path to import database connection
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db, check_db_connection
from database.auth_utils import get_current_user_from_token, get_current_user_id
from models import Reservation, Room, User
from schemas import (
    ReservationCreate,
    ReservationResponse,
    ReservationDetailResponse,
    ReservationListResponse,
    ReservationCancelResponse,
    UserInfo,
    RoomInfo
)
from validators import (
    validate_user_exists,
    validate_room_exists,
    validate_room_available,
    validate_capacity,
    validate_no_date_conflicts,
    validate_dates_in_future,
    validate_reservation_can_be_cancelled
)

# Used only to advertise the Bearer scheme in Swagger (adds the "Authorize"
# button and lock icons); actual token parsing happens in
# get_current_user_id() (database/auth_utils.py), which reads the header itself.
bearer_scheme = HTTPBearer()

# Create FastAPI application
app = FastAPI(
    title="Reservation Service",
    description="Microservice for reservation management with validation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "reservations", "description": "Creación, consulta y cancelación de reservas del usuario autenticado"},
        {"name": "health", "description": "Endpoints de estado del servicio"},
    ],
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Check database connection on startup."""
    if check_db_connection():
        print("✅ Reservation Service: Database connection successful")
    else:
        print("❌ Reservation Service: Database connection failed")


@app.get("/", tags=["health"], summary="Service info")
async def root():
    """Root endpoint."""
    return {
        "service": "Reservation Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "create": "POST /api/reservations",
            "list": "GET /api/reservations",
            "get": "GET /api/reservations/{id}",
            "cancel": "DELETE /api/reservations/{id}"
        }
    }


@app.get("/health", tags=["health"], summary="Health check")
async def health_check():
    """Health check endpoint."""
    db_status = check_db_connection()
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected"
    }


@app.post(
    "/api/reservations",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["reservations"],
    summary="Create a reservation",
)
async def create_reservation(
    reservation_data: ReservationCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
    _: str = Depends(bearer_scheme),
):
    """
    Create a new reservation with comprehensive validation.
    Uses the authenticated user from JWT token.
    
    Validations:
    1. User exists (from token)
    2. Room exists
    3. Room is available
    4. Number of people doesn't exceed capacity
    5. No date conflicts with existing reservations
    6. Dates are in the future
    
    Args:
        reservation_data: Reservation creation data (usuario_id will be overridden by token)
        db: Database session
        current_user_id: Current user ID from JWT token
        
    Returns:
        ReservationResponse: Created reservation data
        
    Raises:
        HTTPException: If any validation fails
    """
    # Validate user exists (from token)
    user = validate_user_exists(db, current_user_id)
    
    # Validate room exists
    room = validate_room_exists(db, str(reservation_data.sala_id))
    
    # Validate room is available
    validate_room_available(room)
    
    # Validate capacity
    validate_capacity(room, reservation_data.cantidad_personas)
    
    # Validate dates are in the future
    validate_dates_in_future(reservation_data.fecha_inicio, reservation_data.fecha_fin)
    
    # Validate no date conflicts
    validate_no_date_conflicts(
        db,
        str(reservation_data.sala_id),
        reservation_data.fecha_inicio,
        reservation_data.fecha_fin
    )
    
    # Create reservation with authenticated user ID
    new_reservation = Reservation(
        sala_id=reservation_data.sala_id,
        usuario_id=uuid.UUID(current_user_id),
        fecha_inicio=reservation_data.fecha_inicio,
        fecha_fin=reservation_data.fecha_fin,
        cantidad_personas=reservation_data.cantidad_personas,
        estado="abierto"
    )
    
    # Update room status to occupied
    room.estado = "ocupado"
    
    # Save to database (atomic transaction)
    try:
        db.add(new_reservation)
        db.commit()
        db.refresh(new_reservation)
        return new_reservation
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create reservation: {str(e)}"
        )


@app.get(
    "/api/reservations",
    response_model=ReservationListResponse,
    tags=["reservations"],
    summary="List the authenticated user's reservations",
)
async def list_reservations(
    sala_id: Optional[str] = Query(None, description="Filter by room ID"),
    estado: Optional[str] = Query(None, description="Filter by status (abierto, cancelado)"),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
    _: str = Depends(bearer_scheme),
):
    """
    List reservations for the current authenticated user.
    Only shows reservations belonging to the authenticated user.
    
    Args:
        sala_id: Optional room ID filter
        estado: Optional status filter
        db: Database session
        current_user_id: Current user ID from JWT token
        
    Returns:
        ReservationListResponse: List of user's reservations with room details
    """
    # Build query - always filter by current user
    query = db.query(Reservation).filter(Reservation.usuario_id == current_user_id)
    
    # Apply additional filters
    if sala_id:
        query = query.filter(Reservation.sala_id == sala_id)
    if estado:
        query = query.filter(Reservation.estado == estado)
    
    # Get reservations ordered by start date (most recent first)
    reservations = query.order_by(Reservation.fecha_inicio.desc()).all()
    
    # Build detailed response with user and room info
    items = []
    for reservation in reservations:
        # Get user info
        user = db.query(User).filter(User.id == reservation.usuario_id).first()
        # Get room info
        room = db.query(Room).filter(Room.id == reservation.sala_id).first()
        
        if user and room:
            items.append(
                ReservationDetailResponse(
                    id=reservation.id,
                    sala=RoomInfo(
                        id=room.id,
                        nombre=room.nombre,
                        tipo=room.tipo,
                        capacidad=room.capacidad
                    ),
                    usuario=UserInfo(
                        id=user.id,
                        nombre=user.nombre,
                        correo=user.correo
                    ),
                    fecha_inicio=reservation.fecha_inicio,
                    fecha_fin=reservation.fecha_fin,
                    cantidad_personas=reservation.cantidad_personas,
                    estado=reservation.estado,
                    created_at=reservation.created_at,
                    updated_at=reservation.updated_at
                )
            )
    
    return ReservationListResponse(items=items)


@app.get(
    "/api/reservations/{reservation_id}",
    response_model=ReservationDetailResponse,
    tags=["reservations"],
    summary="Get a reservation by id",
)
async def get_reservation(
    reservation_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
    _: str = Depends(bearer_scheme),
):
    """
    Get a specific reservation by ID with user and room details.
    Only allows access to user's own reservations.
    
    Args:
        reservation_id: Reservation UUID
        db: Database session
        current_user_id: Current user ID from JWT token
        
    Returns:
        ReservationDetailResponse: Reservation with user and room details
        
    Raises:
        HTTPException: If reservation not found or doesn't belong to user
    """
    reservation = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.usuario_id == current_user_id
    ).first()
    
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found or you don't have access to it"
        )
    
    # Get user info
    user = db.query(User).filter(User.id == reservation.usuario_id).first()
    # Get room info
    room = db.query(Room).filter(Room.id == reservation.sala_id).first()
    
    if not user or not room:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve reservation details"
        )
    
    return ReservationDetailResponse(
        id=reservation.id,
        sala=RoomInfo(
            id=room.id,
            nombre=room.nombre,
            tipo=room.tipo,
            capacidad=room.capacidad
        ),
        usuario=UserInfo(
            id=user.id,
            nombre=user.nombre,
            correo=user.correo
        ),
        fecha_inicio=reservation.fecha_inicio,
        fecha_fin=reservation.fecha_fin,
        cantidad_personas=reservation.cantidad_personas,
        estado=reservation.estado,
        created_at=reservation.created_at,
        updated_at=reservation.updated_at
    )


@app.delete(
    "/api/reservations/{reservation_id}",
    response_model=ReservationCancelResponse,
    tags=["reservations"],
    summary="Cancel a reservation",
)
async def cancel_reservation(
    reservation_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
    _: str = Depends(bearer_scheme),
):
    """
    Cancel a reservation and free the room.
    Only allows cancellation of user's own reservations.
    
    Args:
        reservation_id: Reservation UUID
        db: Database session
        current_user_id: Current user ID from JWT token
        
    Returns:
        ReservationCancelResponse: Cancellation confirmation
        
    Raises:
        HTTPException: If reservation not found, doesn't belong to user, or already cancelled
    """
    reservation = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.usuario_id == current_user_id
    ).first()
    
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found or you don't have access to it"
        )
    
    # Validate reservation can be cancelled
    validate_reservation_can_be_cancelled(reservation)
    
    # Get room to update status
    room = db.query(Room).filter(Room.id == reservation.sala_id).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Room not found"
        )
    
    # Update reservation status
    reservation.estado = "cancelado"
    
    # Free the room
    room.estado = "disponible"
    
    # Save changes (atomic transaction)
    try:
        db.commit()
        db.refresh(reservation)
        
        return ReservationCancelResponse(
            id=reservation.id,
            estado=reservation.estado,
            updated_at=reservation.updated_at,
            message="Reservación cancelada exitosamente"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel reservation: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)

# Made with Bob
