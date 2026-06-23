import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models import TransactionStatus, TransactionType


class RechargeRequest(BaseModel):
    account_id: uuid.UUID
    amount: Decimal = Field(gt=0)


class TransferRequest(BaseModel):
    from_account_id: uuid.UUID
    to_account_id: uuid.UUID
    amount: Decimal = Field(gt=0)


class TransactionOut(BaseModel):
    id: uuid.UUID
    type: TransactionType
    status: TransactionStatus
    from_account_id: uuid.UUID | None
    to_account_id: uuid.UUID
    amount: Decimal
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
