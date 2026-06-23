import uuid
from unittest.mock import AsyncMock

import pytest

from app import reconciliation
from app.models import Transaction, TransactionStatus


@pytest.fixture(autouse=True)
def session_local(monkeypatch, db):
    class _SessionContext:
        async def __aenter__(self_inner):
            return db

        async def __aexit__(self_inner, *args):
            return False

    monkeypatch.setattr(reconciliation, "SessionLocal", lambda: _SessionContext())
    return db


class TestReconcileOnce:
    async def test_resumes_each_stuck_transaction(self, monkeypatch, db):
        stuck = [
            Transaction(id=uuid.uuid4(), status=TransactionStatus.PENDING),
            Transaction(id=uuid.uuid4(), status=TransactionStatus.DEBIT_COMPLETED),
        ]
        monkeypatch.setattr(reconciliation.crud, "list_stuck", AsyncMock(return_value=stuck))
        resume_mock = AsyncMock(side_effect=lambda db, tx: tx)
        monkeypatch.setattr(reconciliation.saga, "resume_transaction", resume_mock)

        resumed = await reconciliation.reconcile_once()

        assert resumed == 2
        assert resume_mock.await_count == 2

    async def test_returns_zero_when_nothing_stuck(self, monkeypatch, db):
        monkeypatch.setattr(reconciliation.crud, "list_stuck", AsyncMock(return_value=[]))
        resume_mock = AsyncMock()
        monkeypatch.setattr(reconciliation.saga, "resume_transaction", resume_mock)

        resumed = await reconciliation.reconcile_once()

        assert resumed == 0
        resume_mock.assert_not_awaited()

    async def test_continues_after_a_failed_resume_and_does_not_count_it(self, monkeypatch, db):
        stuck = [
            Transaction(id=uuid.uuid4(), status=TransactionStatus.PENDING),
            Transaction(id=uuid.uuid4(), status=TransactionStatus.PENDING),
        ]
        monkeypatch.setattr(reconciliation.crud, "list_stuck", AsyncMock(return_value=stuck))
        resume_mock = AsyncMock(side_effect=[Exception("boom"), stuck[1]])
        monkeypatch.setattr(reconciliation.saga, "resume_transaction", resume_mock)

        resumed = await reconciliation.reconcile_once()

        assert resumed == 1
        assert resume_mock.await_count == 2
