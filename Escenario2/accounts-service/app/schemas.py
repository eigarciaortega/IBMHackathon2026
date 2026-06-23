import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field


class AccountCreate(BaseModel):
    owner_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    currency: str = Field(default="USD", min_length=3, max_length=3)
    initial_balance: Decimal = Field(default=Decimal("0"), ge=0)


class AccountOut(BaseModel):
    id: uuid.UUID
    owner_name: str
    email: str
    balance: Decimal
    currency: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BalanceOut(BaseModel):
    account_id: uuid.UUID
    balance: Decimal
    currency: str


class LedgerOperation(BaseModel):
    amount: Decimal = Field(gt=0)
    reference_id: str = Field(min_length=1, max_length=64)
    description: str | None = None


class LedgerEntryOut(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    reference_id: str
    entry_type: str
    amount: Decimal
    balance_after: Decimal
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True
