import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app import crud
from app.database import get_db
from app.main import app
from app.models import Account, LedgerEntry


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr("app.main.init_db", AsyncMock())
    app.dependency_overrides[get_db] = lambda: AsyncMock()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _account(**overrides):
    defaults = dict(
        id=uuid.uuid4(), owner_name="Jane", email="jane@x.com",
        currency="USD", balance=Decimal("100"), is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return Account(**defaults)


def _ledger_entry(account_id, **overrides):
    defaults = dict(
        id=uuid.uuid4(), account_id=account_id, reference_id="ref-1",
        entry_type="CREDIT", amount=Decimal("10"), balance_after=Decimal("110"), description=None,
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return LedgerEntry(**defaults)


class TestCreateAccount:
    def test_returns_201_with_created_account(self, client, monkeypatch):
        account = _account()
        monkeypatch.setattr(crud, "create_account", AsyncMock(return_value=account))

        response = client.post("/accounts", json={
            "owner_name": "Jane", "email": "jane@x.com", "currency": "USD", "initial_balance": "100",
        })

        assert response.status_code == 201
        assert response.json()["owner_name"] == "Jane"

    def test_rejects_invalid_email(self, client):
        response = client.post("/accounts", json={"owner_name": "Jane", "email": "not-an-email"})
        assert response.status_code == 422


class TestGetAccount:
    def test_returns_404_when_not_found(self, client, monkeypatch):
        monkeypatch.setattr(crud, "get_account", AsyncMock(side_effect=crud.AccountNotFound()))

        response = client.get(f"/accounts/{uuid.uuid4()}")

        assert response.status_code == 404


class TestCredit:
    def test_returns_404_when_account_missing(self, client, monkeypatch):
        monkeypatch.setattr(crud, "credit_account", AsyncMock(side_effect=crud.AccountNotFound()))

        response = client.post(
            f"/accounts/{uuid.uuid4()}/credit", json={"amount": "10", "reference_id": "ref-1"}
        )

        assert response.status_code == 404

    def test_rejects_non_positive_amount(self, client):
        response = client.post(
            f"/accounts/{uuid.uuid4()}/credit", json={"amount": "0", "reference_id": "ref-1"}
        )
        assert response.status_code == 422


class TestDebit:
    def test_returns_422_on_insufficient_funds(self, client, monkeypatch):
        monkeypatch.setattr(
            crud, "debit_account", AsyncMock(side_effect=crud.InsufficientFunds("not enough"))
        )

        response = client.post(
            f"/accounts/{uuid.uuid4()}/debit", json={"amount": "10", "reference_id": "ref-1"}
        )

        assert response.status_code == 422

    def test_returns_404_when_account_missing(self, client, monkeypatch):
        monkeypatch.setattr(crud, "debit_account", AsyncMock(side_effect=crud.AccountNotFound()))

        response = client.post(
            f"/accounts/{uuid.uuid4()}/debit", json={"amount": "10", "reference_id": "ref-1"}
        )

        assert response.status_code == 404


class TestLedger:
    def test_returns_404_when_account_missing(self, client, monkeypatch):
        monkeypatch.setattr(crud, "get_account", AsyncMock(side_effect=crud.AccountNotFound()))

        response = client.get(f"/accounts/{uuid.uuid4()}/ledger")

        assert response.status_code == 404

    def test_returns_entries_when_account_exists(self, client, monkeypatch):
        account_id = uuid.uuid4()
        monkeypatch.setattr(crud, "get_account", AsyncMock(return_value=_account(id=account_id)))
        monkeypatch.setattr(crud, "get_ledger", AsyncMock(return_value=[_ledger_entry(account_id)]))

        response = client.get(f"/accounts/{account_id}/ledger")

        assert response.status_code == 200
        assert len(response.json()) == 1
