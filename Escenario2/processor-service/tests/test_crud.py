import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app import crud
from app.models import Transaction, TransactionStatus, TransactionType
from tests.conftest import make_execute_result


class TestCreateTransaction:
    async def test_creates_recharge_transaction(self, db):
        to_account_id = uuid.uuid4()

        tx = await crud.create_transaction(db, TransactionType.RECHARGE, to_account_id, Decimal("50"))

        assert tx.type == TransactionType.RECHARGE
        assert tx.to_account_id == to_account_id
        assert tx.from_account_id is None
        assert tx.amount == Decimal("50")
        db.add.assert_called_once_with(tx)
        db.commit.assert_awaited_once()
        db.refresh.assert_awaited_once_with(tx)

    async def test_creates_transfer_transaction_with_source_account(self, db):
        from_account_id, to_account_id = uuid.uuid4(), uuid.uuid4()

        tx = await crud.create_transaction(db, TransactionType.TRANSFER, to_account_id, Decimal("50"), from_account_id)

        assert tx.type == TransactionType.TRANSFER
        assert tx.from_account_id == from_account_id
        assert tx.to_account_id == to_account_id


class TestGetTransaction:
    async def test_returns_transaction_when_found(self, db):
        tx = Transaction(id=uuid.uuid4())
        db.get.return_value = tx

        result = await crud.get_transaction(db, tx.id)

        assert result is tx

    async def test_raises_when_not_found(self, db):
        db.get.return_value = None

        with pytest.raises(crud.TransactionNotFound):
            await crud.get_transaction(db, uuid.uuid4())


class TestSetStatus:
    async def test_updates_status(self, db):
        tx = Transaction(id=uuid.uuid4(), status=TransactionStatus.PENDING)

        result = await crud.set_status(db, tx, TransactionStatus.COMPLETED)

        assert result.status == TransactionStatus.COMPLETED
        assert result.error_message is None
        db.commit.assert_awaited_once()

    async def test_sets_error_message_when_provided(self, db):
        tx = Transaction(id=uuid.uuid4(), status=TransactionStatus.PENDING)

        result = await crud.set_status(db, tx, TransactionStatus.FAILED, "boom")

        assert result.status == TransactionStatus.FAILED
        assert result.error_message == "boom"

    async def test_keeps_previous_error_message_when_not_provided(self, db):
        tx = Transaction(id=uuid.uuid4(), status=TransactionStatus.PENDING, error_message="previous error")

        result = await crud.set_status(db, tx, TransactionStatus.PENDING)

        assert result.error_message == "previous error"


class TestListForAccount:
    async def test_returns_transactions_involving_account(self, db):
        account_id = uuid.uuid4()
        txs = [Transaction(id=uuid.uuid4()), Transaction(id=uuid.uuid4())]
        db.execute.return_value = make_execute_result(scalars_all=txs)

        result = await crud.list_for_account(db, account_id)

        assert result == txs


class TestListStuck:
    async def test_returns_stuck_transactions(self, db):
        txs = [Transaction(id=uuid.uuid4(), status=TransactionStatus.PENDING)]
        db.execute.return_value = make_execute_result(scalars_all=txs)

        result = await crud.list_stuck(
            db, [TransactionStatus.PENDING], datetime.now(timezone.utc) - timedelta(seconds=60)
        )

        assert result == txs

    async def test_returns_empty_when_nothing_stuck(self, db):
        db.execute.return_value = make_execute_result(scalars_all=[])

        result = await crud.list_stuck(
            db, [TransactionStatus.PENDING], datetime.now(timezone.utc) - timedelta(seconds=60)
        )

        assert result == []
