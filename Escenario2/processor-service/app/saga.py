"""Saga orchestration for RECHARGE and TRANSFER transactions.

Each transaction step uses the transaction id (plus a step suffix) as the
accounts-service `reference_id`, which makes every step idempotent. This lets
`resume_transaction` be safely called both right after creation and later by
the reconciliation job without risk of double-applying a credit/debit.
"""

import logging
import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.clients import AccountNotFoundError, AccountsClient, AccountsServiceError, InsufficientFundsError, accounts_client
from app.models import Transaction, TransactionStatus, TransactionType

logger = logging.getLogger(__name__)


async def start_recharge(db: AsyncSession, account_id: uuid.UUID, amount: Decimal, client: AccountsClient = accounts_client) -> Transaction:
    tx = await crud.create_transaction(db, TransactionType.RECHARGE, account_id, amount)
    return await resume_transaction(db, tx, client)


async def start_transfer(
    db: AsyncSession, from_account_id: uuid.UUID, to_account_id: uuid.UUID, amount: Decimal, client: AccountsClient = accounts_client
) -> Transaction:
    if from_account_id == to_account_id:
        tx = await crud.create_transaction(db, TransactionType.TRANSFER, to_account_id, amount, from_account_id)
        return await crud.set_status(db, tx, TransactionStatus.FAILED, "from_account_id and to_account_id must differ")
    tx = await crud.create_transaction(db, TransactionType.TRANSFER, to_account_id, amount, from_account_id)
    return await resume_transaction(db, tx, client)


async def resume_transaction(db: AsyncSession, tx: Transaction, client: AccountsClient = accounts_client) -> Transaction:
    """Advances a transaction's saga from its current status to completion (or failure)."""
    if tx.type == TransactionType.RECHARGE:
        return await _recharge_step(db, tx, client)
    return await _transfer_step(db, tx, client)


async def _recharge_step(db: AsyncSession, tx: Transaction, client: AccountsClient) -> Transaction:
    if tx.status not in (TransactionStatus.PENDING,):
        return tx
    try:
        await client.credit(tx.to_account_id, Decimal(tx.amount), reference_id=str(tx.id), description="recharge")
    except AccountNotFoundError as exc:
        logger.warning("Recharge failed: account not found", extra={"extra_fields": {"transaction_id": str(tx.id)}})
        return await crud.set_status(db, tx, TransactionStatus.FAILED, str(exc))
    except AccountsServiceError as exc:
        logger.error("Recharge step unreachable, will retry", extra={"extra_fields": {"transaction_id": str(tx.id)}})
        return await crud.set_status(db, tx, TransactionStatus.PENDING, str(exc))
    return await crud.set_status(db, tx, TransactionStatus.COMPLETED)


async def _transfer_step(db: AsyncSession, tx: Transaction, client: AccountsClient) -> Transaction:
    if tx.status == TransactionStatus.PENDING:
        tx = await _debit_step(db, tx, client)
        if tx.status != TransactionStatus.DEBIT_COMPLETED:
            return tx

    if tx.status == TransactionStatus.DEBIT_COMPLETED:
        tx = await _credit_step(db, tx, client)
        if tx.status != TransactionStatus.COMPENSATING:
            return tx

    if tx.status == TransactionStatus.COMPENSATING:
        tx = await _compensate_step(db, tx, client)

    return tx


async def _debit_step(db: AsyncSession, tx: Transaction, client: AccountsClient) -> Transaction:
    try:
        await client.debit(tx.from_account_id, Decimal(tx.amount), reference_id=f"{tx.id}:debit", description="transfer-out")
    except InsufficientFundsError as exc:
        logger.warning("Transfer failed: insufficient funds", extra={"extra_fields": {"transaction_id": str(tx.id)}})
        return await crud.set_status(db, tx, TransactionStatus.FAILED, str(exc))
    except AccountNotFoundError as exc:
        logger.warning("Transfer failed: source account not found", extra={"extra_fields": {"transaction_id": str(tx.id)}})
        return await crud.set_status(db, tx, TransactionStatus.FAILED, str(exc))
    except AccountsServiceError as exc:
        logger.error("Debit step unreachable, will retry", extra={"extra_fields": {"transaction_id": str(tx.id)}})
        return await crud.set_status(db, tx, TransactionStatus.PENDING, str(exc))
    return await crud.set_status(db, tx, TransactionStatus.DEBIT_COMPLETED)


async def _credit_step(db: AsyncSession, tx: Transaction, client: AccountsClient) -> Transaction:
    try:
        await client.credit(tx.to_account_id, Decimal(tx.amount), reference_id=f"{tx.id}:credit", description="transfer-in")
    except AccountNotFoundError as exc:
        logger.warning(
            "Transfer credit failed: destination not found, compensating",
            extra={"extra_fields": {"transaction_id": str(tx.id)}},
        )
        return await crud.set_status(db, tx, TransactionStatus.COMPENSATING, str(exc))
    except AccountsServiceError as exc:
        logger.error("Credit step unreachable, will retry", extra={"extra_fields": {"transaction_id": str(tx.id)}})
        return await crud.set_status(db, tx, TransactionStatus.DEBIT_COMPLETED, str(exc))
    return await crud.set_status(db, tx, TransactionStatus.COMPLETED)


async def _compensate_step(db: AsyncSession, tx: Transaction, client: AccountsClient) -> Transaction:
    try:
        await client.credit(
            tx.from_account_id, Decimal(tx.amount), reference_id=f"{tx.id}:compensate", description="transfer-compensation"
        )
    except AccountsServiceError as exc:
        logger.error(
            "Compensation failed, needs manual intervention",
            extra={"extra_fields": {"transaction_id": str(tx.id)}},
        )
        return await crud.set_status(db, tx, TransactionStatus.FAILED_COMPENSATION, str(exc))
    return await crud.set_status(db, tx, TransactionStatus.COMPENSATED, tx.error_message)
