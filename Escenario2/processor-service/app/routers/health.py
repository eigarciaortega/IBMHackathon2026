import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients import AccountsServiceError, accounts_client
from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        db_status = "up"
    except Exception:
        db_status = "down"

    try:
        await accounts_client.health()
        accounts_status = "up"
    except AccountsServiceError:
        accounts_status = "down"

    overall = "ok" if db_status == "up" and accounts_status == "up" else "degraded"
    return {"status": overall, "database": db_status, "accounts_service": accounts_status}


@router.get("/health/live")
async def liveness():
    return {"status": "alive"}
