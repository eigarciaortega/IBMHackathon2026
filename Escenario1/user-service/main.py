"""
User Service - FastAPI application for user registration and authentication.
Port: 8001
"""

from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional
import sys
import os

# Add parent directory to path to import database connection
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db, check_db_connection
from models import User
from schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from auth import get_password_hash, verify_password, create_access_token, decode_access_token

# Used only to advertise the Bearer scheme in Swagger (adds the "Authorize"
# button and lock icons); the actual token parsing still happens in
# get_current_user() below, which reads the Authorization header itself.
bearer_scheme = HTTPBearer()

# Create FastAPI application
app = FastAPI(
    title="User Service",
    description="Microservice for user registration and authentication",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "auth", "description": "Registro, login y datos del usuario autenticado"},
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
        print("✅ User Service: Database connection successful")
    else:
        print("❌ User Service: Database connection failed")


@app.get("/", tags=["health"], summary="Service info")
async def root():
    """Root endpoint."""
    return {
        "service": "User Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "register": "POST /api/users/register",
            "login": "POST /api/users/login",
            "me": "GET /api/users/me"
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


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from JWT token.
    
    Args:
        authorization: Authorization header with Bearer token
        db: Database session
        
    Returns:
        User: Current authenticated user
        
    Raises:
        HTTPException: If token is invalid or user not found
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
    
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


@app.post(
    "/api/users/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["auth"],
    summary="Register a new user",
)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    Args:
        user_data: User registration data (nombre, correo, contrasena)
        db: Database session
        
    Returns:
        UserResponse: Created user data (without password)
        
    Raises:
        HTTPException: If email already exists
    """
    # Check if user with email already exists
    existing_user = db.query(User).filter(User.correo == user_data.correo).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Create new user with hashed password
    hashed_password = get_password_hash(user_data.contrasena)
    new_user = User(
        nombre=user_data.nombre,
        correo=user_data.correo,
        contrasena=hashed_password,
        role=user_data.role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@app.post(
    "/api/users/login",
    response_model=TokenResponse,
    tags=["auth"],
    summary="Login and obtain a JWT access token",
)
async def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token.
    
    Args:
        credentials: User login credentials (correo, contrasena)
        db: Database session
        
    Returns:
        TokenResponse: JWT access token and user data
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by email
    user = db.query(User).filter(User.correo == credentials.correo).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    # Note: verify_password expects (plain_password, hashed_password)
    try:
        if not verify_password(credentials.contrasena, user.contrasena):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
    except ValueError as e:
        # Log the error for debugging
        print(f"Password verification error: {e}")
        print(f"Plain password length: {len(credentials.contrasena)}")
        print(f"Hashed password length: {len(user.contrasena)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create JWT token with role
    access_token = create_access_token(
        data={
            "user_id": str(user.id),
            "correo": user.correo,
            "role": user.role
        }
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            nombre=user.nombre,
            correo=user.correo,
            role=user.role,
            created_at=user.created_at
        )
    )


@app.get(
    "/api/users/me",
    response_model=UserResponse,
    tags=["auth"],
    summary="Get the currently authenticated user",
)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    _: str = Depends(bearer_scheme),
):
    """
    Get current authenticated user information.
    
    Args:
        current_user: Current authenticated user from JWT token
        
    Returns:
        UserResponse: Current user data (without password)
    """
    return current_user


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

# Made with Bob
