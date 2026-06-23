import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud, saga
from app.clients import AccountsServiceError
from app.database import get_db
from app.schemas import RechargeRequest, TransactionOut, TransferRequest

logger = logging.getLogger(__name__)
router = APIRouter(tags=["transactions"])


@router.post(
    "/transactions/recharge",
    response_model=TransactionOut,
    summary="Recargar cuenta",
    description="Inicia una saga de recarga: acredita el monto en la cuenta destino vía accounts-service.",
)
async def recharge(payload: RechargeRequest, db: AsyncSession = Depends(get_db)):
    try:
        tx = await saga.start_recharge(db, payload.account_id, payload.amount)
    except AccountsServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    logger.info(
        "Recharge processed", extra={"extra_fields": {"transaction_id": str(tx.id), "status": tx.status.value}}
    )
    return tx


@router.post(
    "/transactions/transfer",
    response_model=TransactionOut,
    summary="Transferir entre cuentas",
    description="Inicia una saga de transferencia P2P (débito + crédito) con compensación automática "
    "si el crédito destino falla.",
)
async def transfer(payload: TransferRequest, db: AsyncSession = Depends(get_db)):
    try:
        tx = await saga.start_transfer(db, payload.from_account_id, payload.to_account_id, payload.amount)
    except AccountsServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    logger.info(
        "Transfer processed", extra={"extra_fields": {"transaction_id": str(tx.id), "status": tx.status.value}}
    )
    return tx


@router.get("/transactions/{transaction_id}", response_model=TransactionOut, summary="Obtener transacción por id")
async def get_transaction(transaction_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    try:
        return await crud.get_transaction(db, transaction_id)
    except crud.TransactionNotFound:
        raise HTTPException(status_code=404, detail=f"Transaction {transaction_id} not found")


@router.get(
    "/accounts/{account_id}/transactions",
    response_model=list[TransactionOut],
    summary="Listar transacciones de una cuenta",
)
async def account_transactions(account_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await crud.list_for_account(db, account_id)
