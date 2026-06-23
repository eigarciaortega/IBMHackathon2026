import logging
import uuid
from decimal import Decimal

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class AccountsServiceError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class AccountNotFoundError(AccountsServiceError):
    pass


class InsufficientFundsError(AccountsServiceError):
    pass


class AccountsClient:
    def __init__(self, base_url: str | None = None, timeout: float | None = None):
        self.base_url = base_url or settings.accounts_service_url
        self.timeout = timeout or settings.http_timeout_seconds

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            try:
                response = await client.request(method, path, **kwargs)
            except httpx.RequestError as exc:
                logger.error("Accounts service unreachable", extra={"extra_fields": {"error": str(exc)}})
                raise AccountsServiceError(f"Accounts service unreachable: {exc}") from None

        if response.status_code == 404:
            raise AccountNotFoundError(response.json().get("detail", "Account not found"), status_code=404)
        if response.status_code == 422:
            raise InsufficientFundsError(response.json().get("detail", "Insufficient funds"), status_code=422)
        if response.status_code >= 400:
            raise AccountsServiceError(f"Accounts service error: {response.text}", status_code=response.status_code)
        return response.json()

    async def get_account(self, account_id: uuid.UUID) -> dict:
        return await self._request("GET", f"/accounts/{account_id}")

    async def credit(self, account_id: uuid.UUID, amount: Decimal, reference_id: str, description: str | None = None) -> dict:
        return await self._request(
            "POST",
            f"/accounts/{account_id}/credit",
            json={"amount": str(amount), "reference_id": reference_id, "description": description},
        )

    async def debit(self, account_id: uuid.UUID, amount: Decimal, reference_id: str, description: str | None = None) -> dict:
        return await self._request(
            "POST",
            f"/accounts/{account_id}/debit",
            json={"amount": str(amount), "reference_id": reference_id, "description": description},
        )

    async def health(self) -> dict:
        return await self._request("GET", "/health")


accounts_client = AccountsClient()
