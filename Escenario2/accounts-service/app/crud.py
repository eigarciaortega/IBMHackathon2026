import logging
import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Account, LedgerEntry

logger = logging.getLogger(__name__)


class AccountNotFound(Exception):
    pass


class InsufficientFunds(Exception):
    pass


async def get_account(db: AsyncSession, account_id: uuid.UUID) -> Account:
    account = await db.get(Account, account_id)
    if account is None:
        raise AccountNotFound(str(account_id))
    return account


async def create_account(db: AsyncSession, owner_name: str, email: str, currency: str, initial_balance: Decimal) -> Account:
    account = Account(owner_name=owner_name, email=email, currency=currency, balance=initial_balance)
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


async def list_accounts(db: AsyncSession) -> list[Account]:
    result = await db.execute(select(Account))
    return list(result.scalars().all())


async def _existing_entry(db: AsyncSession, account_id: uuid.UUID, reference_id: str, entry_type: str) -> LedgerEntry | None:
    result = await db.execute(
        select(LedgerEntry).where(
            LedgerEntry.account_id == account_id,
            LedgerEntry.reference_id == reference_id,
            LedgerEntry.entry_type == entry_type,
        )
    )
    return result.scalar_one_or_none()


async def credit_account(
    db: AsyncSession, account_id: uuid.UUID, amount: Decimal, reference_id: str, description: str | None = None
) -> LedgerEntry:
    """Idempotent credit. If reference_id was already applied, returns the existing entry."""
    existing = await _existing_entry(db, account_id, reference_id, "CREDIT")
    if existing is not None:
        logger.info("Duplicate credit ignored (idempotent)", extra={"extra_fields": {"reference_id": reference_id}})
        return existing

    account = await get_account(db, account_id)
    account.balance = Decimal(account.balance) + amount
    entry = LedgerEntry(
        account_id=account_id,
        reference_id=reference_id,
        entry_type="CREDIT",
        amount=amount,
        balance_after=account.balance,
        description=description,
    )
    db.add(entry)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await _existing_entry(db, account_id, reference_id, "CREDIT")
        if existing is not None:
            return existing
        raise
    await db.refresh(entry)
    return entry


async def debit_account(
    db: AsyncSession, account_id: uuid.UUID, amount: Decimal, reference_id: str, description: str | None = None
) -> LedgerEntry:
    """Idempotent debit with funds validation."""
    existing = await _existing_entry(db, account_id, reference_id, "DEBIT")
    if existing is not None:
        logger.info("Duplicate debit ignored (idempotent)", extra={"extra_fields": {"reference_id": reference_id}})
        return existing

    account = await get_account(db, account_id)
    if Decimal(account.balance) < amount:
        raise InsufficientFunds(f"Account {account_id} has insufficient funds for {amount}")

    account.balance = Decimal(account.balance) - amount
    entry = LedgerEntry(
        account_id=account_id,
        reference_id=reference_id,
        entry_type="DEBIT",
        amount=amount,
        balance_after=account.balance,
        description=description,
    )
    db.add(entry)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await _existing_entry(db, account_id, reference_id, "DEBIT")
        if existing is not None:
            return existing
        raise
    await db.refresh(entry)
    return entry


async def get_ledger(db: AsyncSession, account_id: uuid.UUID) -> list[LedgerEntry]:
    result = await db.execute(
        select(LedgerEntry).where(LedgerEntry.account_id == account_id).order_by(LedgerEntry.created_at.desc())
    )
    return list(result.scalars().all())
