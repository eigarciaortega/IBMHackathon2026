"""Background job that resumes transactions stuck mid-saga (e.g. due to a
crash or a transient accounts-service outage) so the system self-heals
without manual intervention.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app import crud, saga
from app.config import settings
from app.database import SessionLocal
from app.models import TransactionStatus

logger = logging.getLogger(__name__)

STUCK_STATUSES = [TransactionStatus.PENDING, TransactionStatus.DEBIT_COMPLETED, TransactionStatus.COMPENSATING]


async def reconcile_once() -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.pending_timeout_seconds)
    resumed = 0
    async with SessionLocal() as db:
        stuck = await crud.list_stuck(db, STUCK_STATUSES, cutoff)
        for tx in stuck:
            logger.info(
                "Reconciling stuck transaction",
                extra={"extra_fields": {"transaction_id": str(tx.id), "status": tx.status.value}},
            )
            try:
                await saga.resume_transaction(db, tx)
                resumed += 1
            except Exception:
                logger.exception("Reconciliation step failed", extra={"extra_fields": {"transaction_id": str(tx.id)}})
    return resumed


async def reconciliation_loop(stop_event: asyncio.Event) -> None:
    logger.info(
        "Reconciliation job started",
        extra={"extra_fields": {"interval_seconds": settings.reconciliation_interval_seconds}},
    )
    while not stop_event.is_set():
        try:
            count = await reconcile_once()
            if count:
                logger.info("Reconciliation pass complete", extra={"extra_fields": {"resumed": count}})
        except Exception:
            logger.exception("Reconciliation loop error")
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=settings.reconciliation_interval_seconds)
        except asyncio.TimeoutError:
            pass
    logger.info("Reconciliation job stopped")
