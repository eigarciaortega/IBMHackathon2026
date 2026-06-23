import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.schemas import AccountCreate, AccountOut, BalanceOut, LedgerEntryOut, LedgerOperation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED, summary="Crear cuenta")
async def create_account(payload: AccountCreate, db: AsyncSession = Depends(get_db)):
    account = await crud.create_account(
        db, payload.owner_name, payload.email, payload.currency, payload.initial_balance
    )
    logger.info("Account created", extra={"extra_fields": {"account_id": str(account.id)}})
    return account


@router.get("", response_model=list[AccountOut], summary="Listar cuentas")
async def list_accounts(db: AsyncSession = Depends(get_db)):
    return await crud.list_accounts(db)


@router.get("/{account_id}", response_model=AccountOut, summary="Obtener cuenta por id")
async def get_account(account_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    try:
        return await crud.get_account(db, account_id)
    except crud.AccountNotFound:
        raise HTTPException(status_code=404, detail=f"Account {account_id} not found")


@router.get("/{account_id}/balance", response_model=BalanceOut, summary="Consultar saldo")
async def get_balance(account_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    try:
        account = await crud.get_account(db, account_id)
    except crud.AccountNotFound:
        raise HTTPException(status_code=404, detail=f"Account {account_id} not found")
    return BalanceOut(account_id=account.id, balance=account.balance, currency=account.currency)


@router.post(
    "/{account_id}/credit",
    response_model=LedgerEntryOut,
    summary="Acreditar saldo (idempotente)",
    description="Aplica un crédito a la cuenta. Reintentos con el mismo `reference_id` no duplican el movimiento.",
)
async def credit(account_id: uuid.UUID, payload: LedgerOperation, db: AsyncSession = Depends(get_db)):
    try:
        entry = await crud.credit_account(db, account_id, payload.amount, payload.reference_id, payload.description)
    except crud.AccountNotFound:
        raise HTTPException(status_code=404, detail=f"Account {account_id} not found")
    logger.info(
        "Account credited",
        extra={"extra_fields": {"account_id": str(account_id), "amount": str(payload.amount), "reference_id": payload.reference_id}},
    )
    return entry


@router.post(
    "/{account_id}/debit",
    response_model=LedgerEntryOut,
    summary="Debitar saldo (idempotente)",
    description="Aplica un débito a la cuenta validando fondos suficientes. Reintentos con el mismo "
    "`reference_id` no duplican el movimiento.",
)
async def debit(account_id: uuid.UUID, payload: LedgerOperation, db: AsyncSession = Depends(get_db)):
    try:
        entry = await crud.debit_account(db, account_id, payload.amount, payload.reference_id, payload.description)
    except crud.AccountNotFound:
        raise HTTPException(status_code=404, detail=f"Account {account_id} not found")
    except crud.InsufficientFunds as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    logger.info(
        "Account debited",
        extra={"extra_fields": {"account_id": str(account_id), "amount": str(payload.amount), "reference_id": payload.reference_id}},
    )
    return entry


@router.get("/{account_id}/ledger", response_model=list[LedgerEntryOut], summary="Consultar libro mayor (ledger)")
async def ledger(account_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    try:
        await crud.get_account(db, account_id)
    except crud.AccountNotFound:
        raise HTTPException(status_code=404, detail=f"Account {account_id} not found")
    return await crud.get_ledger(db, account_id)
