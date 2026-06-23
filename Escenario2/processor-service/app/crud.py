import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Transaction, TransactionStatus, TransactionType


class TransactionNotFound(Exception):
    pass


async def create_transaction(
    db: AsyncSession,
    type_: TransactionType,
    to_account_id: uuid.UUID,
    amount: Decimal,
    from_account_id: uuid.UUID | None = None,
) -> Transaction:
    tx = Transaction(type=type_, to_account_id=to_account_id, amount=amount, from_account_id=from_account_id)
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


async def get_transaction(db: AsyncSession, transaction_id: uuid.UUID) -> Transaction:
    tx = await db.get(Transaction, transaction_id)
    if tx is None:
        raise TransactionNotFound(str(transaction_id))
    return tx


async def set_status(db: AsyncSession, tx: Transaction, status: TransactionStatus, error_message: str | None = None) -> Transaction:
    tx.status = status
    if error_message is not None:
        tx.error_message = error_message
    await db.commit()
    await db.refresh(tx)
    return tx


async def list_for_account(db: AsyncSession, account_id: uuid.UUID) -> list[Transaction]:
    result = await db.execute(
        select(Transaction)
        .where((Transaction.from_account_id == account_id) | (Transaction.to_account_id == account_id))
        .order_by(Transaction.created_at.desc())
    )
    return list(result.scalars().all())


async def list_stuck(db: AsyncSession, statuses: list[TransactionStatus], older_than) -> list[Transaction]:
    result = await db.execute(
        select(Transaction).where(Transaction.status.in_(statuses), Transaction.updated_at < older_than)
    )
    return list(result.scalars().all())
