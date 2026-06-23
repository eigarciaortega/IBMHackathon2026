import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app import crud, saga
from app.clients import AccountsServiceError
from app.database import get_db
from app.main import app
from app.models import Transaction, TransactionStatus, TransactionType


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr("app.main.init_db", AsyncMock())
    app.dependency_overrides[get_db] = lambda: AsyncMock()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _transaction(**overrides):
    defaults = dict(
        id=uuid.uuid4(), type=TransactionType.RECHARGE, status=TransactionStatus.COMPLETED,
        from_account_id=None, to_account_id=uuid.uuid4(), amount=Decimal("50"), error_message=None,
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return Transaction(**defaults)


class TestRecharge:
    def test_returns_completed_transaction(self, client, monkeypatch):
        tx = _transaction()
        monkeypatch.setattr(saga, "start_recharge", AsyncMock(return_value=tx))

        response = client.post("/transactions/recharge", json={"account_id": str(tx.to_account_id), "amount": "50"})

        assert response.status_code == 200
        assert response.json()["status"] == "COMPLETED"

    def test_returns_502_when_accounts_service_unreachable(self, client, monkeypatch):
        monkeypatch.setattr(saga, "start_recharge", AsyncMock(side_effect=AccountsServiceError("down")))

        response = client.post(
            "/transactions/recharge", json={"account_id": str(uuid.uuid4()), "amount": "50"}
        )

        assert response.status_code == 502

    def test_rejects_non_positive_amount(self, client):
        response = client.post(
            "/transactions/recharge", json={"account_id": str(uuid.uuid4()), "amount": "0"}
        )
        assert response.status_code == 422


class TestTransfer:
    def test_returns_completed_transaction(self, client, monkeypatch):
        tx = _transaction(type=TransactionType.TRANSFER, from_account_id=uuid.uuid4())
        monkeypatch.setattr(saga, "start_transfer", AsyncMock(return_value=tx))

        response = client.post(
            "/transactions/transfer",
            json={"from_account_id": str(tx.from_account_id), "to_account_id": str(tx.to_account_id), "amount": "50"},
        )

        assert response.status_code == 200


class TestGetTransaction:
    def test_returns_404_when_not_found(self, client, monkeypatch):
        monkeypatch.setattr(crud, "get_transaction", AsyncMock(side_effect=crud.TransactionNotFound()))

        response = client.get(f"/transactions/{uuid.uuid4()}")

        assert response.status_code == 404


class TestAccountTransactions:
    def test_returns_transactions_for_account(self, client, monkeypatch):
        account_id = uuid.uuid4()
        monkeypatch.setattr(crud, "list_for_account", AsyncMock(return_value=[_transaction(to_account_id=account_id)]))

        response = client.get(f"/accounts/{account_id}/transactions")

        assert response.status_code == 200
        assert len(response.json()) == 1
