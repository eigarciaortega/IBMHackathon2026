"""
Room Service - FastAPI application for room management.
Port: 8002
"""

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import sys
import os
import math

# Add parent directory to path to import database connection
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db, check_db_connection
from database.auth_utils import require_admin
from models import Room
from schemas import RoomCreate, RoomUpdate, RoomResponse, RoomListResponse

# Used only to advertise the Bearer scheme in Swagger (adds the "Authorize"
# button and lock icons); actual token parsing/role-check happens in
# require_admin() (database/auth_utils.py), which reads the header itself.
bearer_scheme = HTTPBearer()

# Create FastAPI application
app = FastAPI(
    title="Room Service",
    description="Microservice for meeting room management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "rooms", "description": "Gestión de salas y escritorios (creación/edición/borrado solo Admin)"},
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
        print("✅ Room Service: Database connection successful")
    else:
        print("❌ Room Service: Database connection failed")


@app.get("/", tags=["health"], summary="Service info")
async def root():
    """Root endpoint."""
    return {
        "service": "Room Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "create": "POST /api/rooms",
            "list": "GET /api/rooms",
            "get": "GET /api/rooms/{id}",
            "update": "PUT /api/rooms/{id}",
            "delete": "DELETE /api/rooms/{id}"
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
    "/api/rooms",
    response_model=RoomResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["rooms"],
    summary="Create a room (Admin only)",
)
async def create_room(
    room_data: RoomCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
    _: str = Depends(bearer_scheme),
):
    """
    Create a new room. (Admin only)
    
    Args:
        room_data: Room creation data
        db: Database session
        current_user: Current authenticated admin user
        
    Returns:
        RoomResponse: Created room data
    """
    # Create new room
    # Ensure recursos is always a list (not None)
    recursos_list = room_data.recursos if room_data.recursos is not None else []
    
    new_room = Room(
        nombre=room_data.nombre,
        tipo=room_data.tipo.value,
        recursos=recursos_list,
        capacidad=room_data.capacidad,
        estado="disponible"  # Default status
    )
    
    try:
        db.add(new_room)
        db.commit()
        db.refresh(new_room)
        return new_room
    except Exception as e:
        db.rollback()
        print(f"Error creating room: {str(e)}")  # Log for debugging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar la sala: {str(e)}"
        )


@app.get(
    "/api/rooms",
    response_model=RoomListResponse,
    tags=["rooms"],
    summary="List rooms (paginated, optional search)",
)
async def list_rooms(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by room name"),
    db: Session = Depends(get_db)
):
    """
    List rooms with pagination and optional search.
    
    Args:
        page: Page number (starts at 1)
        size: Number of items per page
        search: Optional search term for room name
        db: Database session
        
    Returns:
        RoomListResponse: Paginated list of rooms
    """
    # Build query
    query = db.query(Room)
    
    # Apply search filter if provided
    if search:
        query = query.filter(Room.nombre.ilike(f"%{search}%"))
    
    # Get total count
    total = query.count()
    
    # Calculate pagination
    pages = math.ceil(total / size) if total > 0 else 0
    offset = (page - 1) * size
    
    # Get paginated results
    rooms = query.order_by(Room.created_at.desc()).offset(offset).limit(size).all()
    
    return RoomListResponse(
        items=rooms,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@app.get(
    "/api/rooms/{room_id}",
    response_model=RoomResponse,
    tags=["rooms"],
    summary="Get a room by id",
)
async def get_room(room_id: str, db: Session = Depends(get_db)):
    """
    Get a specific room by ID.
    
    Args:
        room_id: Room UUID
        db: Database session
        
    Returns:
        RoomResponse: Room data
        
    Raises:
        HTTPException: If room not found
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    return room


@app.put(
    "/api/rooms/{room_id}",
    response_model=RoomResponse,
    tags=["rooms"],
    summary="Update a room (Admin only)",
)
async def update_room(
    room_id: str,
    room_data: RoomUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
    _: str = Depends(bearer_scheme),
):
    """
    Update a room. (Admin only)
    
    Args:
        room_id: Room UUID
        room_data: Updated room data
        db: Database session
        current_user: Current authenticated admin user
        
    Returns:
        RoomResponse: Updated room data
        
    Raises:
        HTTPException: If room not found
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Update room fields
    # Ensure recursos is always a list (not None)
    recursos_list = room_data.recursos if room_data.recursos is not None else []
    
    room.nombre = room_data.nombre
    room.tipo = room_data.tipo.value
    room.recursos = recursos_list
    room.capacidad = room_data.capacidad
    
    try:
        db.commit()
        db.refresh(room)
        return room
    except Exception as e:
        db.rollback()
        print(f"Error updating room: {str(e)}")  # Log for debugging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar la sala: {str(e)}"
        )


@app.delete(
    "/api/rooms/{room_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["rooms"],
    summary="Delete a room (Admin only)",
)
async def delete_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
    _: str = Depends(bearer_scheme),
):
    """
    Delete a room. (Admin only)
    
    Args:
        room_id: Room UUID
        db: Database session
        current_user: Current authenticated admin user
        
    Raises:
        HTTPException: If room not found
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    db.delete(room)
    db.commit()
    
    return None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

# Made with Bob
