import uuid
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from app import saga
from app.clients import AccountNotFoundError, AccountsClient, AccountsServiceError, InsufficientFundsError
from app.models import Transaction, TransactionStatus, TransactionType


@pytest.fixture
def client():
    return AsyncMock(spec=AccountsClient)


class TestStartRecharge:
    async def test_completes_on_successful_credit(self, db, client):
        account_id = uuid.uuid4()
        client.credit.return_value = {}

        tx = await saga.start_recharge(db, account_id, Decimal("50"), client)

        assert tx.status == TransactionStatus.COMPLETED
        assert tx.type == TransactionType.RECHARGE
        client.credit.assert_awaited_once_with(account_id, Decimal("50"), reference_id=str(tx.id), description="recharge")

    async def test_fails_when_account_not_found(self, db, client):
        client.credit.side_effect = AccountNotFoundError("Account not found")

        tx = await saga.start_recharge(db, uuid.uuid4(), Decimal("50"), client)

        assert tx.status == TransactionStatus.FAILED
        assert tx.error_message == "Account not found"

    async def test_stays_pending_for_retry_when_accounts_service_unreachable(self, db, client):
        client.credit.side_effect = AccountsServiceError("unreachable")

        tx = await saga.start_recharge(db, uuid.uuid4(), Decimal("50"), client)

        assert tx.status == TransactionStatus.PENDING


class TestStartTransfer:
    async def test_fails_immediately_when_accounts_are_the_same(self, db, client):
        account_id = uuid.uuid4()

        tx = await saga.start_transfer(db, account_id, account_id, Decimal("50"), client)

        assert tx.status == TransactionStatus.FAILED
        assert "must differ" in tx.error_message
        client.debit.assert_not_awaited()
        client.credit.assert_not_awaited()

    async def test_completes_full_happy_path(self, db, client):
        from_account_id, to_account_id = uuid.uuid4(), uuid.uuid4()
        client.debit.return_value = {}
        client.credit.return_value = {}

        tx = await saga.start_transfer(db, from_account_id, to_account_id, Decimal("30"), client)

        assert tx.status == TransactionStatus.COMPLETED
        client.debit.assert_awaited_once_with(from_account_id, Decimal("30"), reference_id=f"{tx.id}:debit", description="transfer-out")
        client.credit.assert_awaited_once_with(to_account_id, Decimal("30"), reference_id=f"{tx.id}:credit", description="transfer-in")

    async def test_fails_on_insufficient_funds_without_crediting(self, db, client):
        client.debit.side_effect = InsufficientFundsError("not enough funds")

        tx = await saga.start_transfer(db, uuid.uuid4(), uuid.uuid4(), Decimal("30"), client)

        assert tx.status == TransactionStatus.FAILED
        assert tx.error_message == "not enough funds"
        client.credit.assert_not_awaited()

    async def test_fails_when_source_account_not_found(self, db, client):
        client.debit.side_effect = AccountNotFoundError("source missing")

        tx = await saga.start_transfer(db, uuid.uuid4(), uuid.uuid4(), Decimal("30"), client)

        assert tx.status == TransactionStatus.FAILED
        client.credit.assert_not_awaited()

    async def test_stays_pending_for_retry_when_debit_step_unreachable(self, db, client):
        client.debit.side_effect = AccountsServiceError("unreachable")

        tx = await saga.start_transfer(db, uuid.uuid4(), uuid.uuid4(), Decimal("30"), client)

        assert tx.status == TransactionStatus.PENDING
        client.credit.assert_not_awaited()

    async def test_compensates_when_destination_account_not_found(self, db, client):
        client.debit.return_value = {}
        client.credit.side_effect = [AccountNotFoundError("destination missing"), {}]

        tx = await saga.start_transfer(db, uuid.uuid4(), uuid.uuid4(), Decimal("30"), client)

        assert tx.status == TransactionStatus.COMPENSATED
        assert client.credit.await_count == 2

    async def test_stays_debit_completed_for_retry_when_credit_step_unreachable(self, db, client):
        client.debit.return_value = {}
        client.credit.side_effect = AccountsServiceError("unreachable")

        tx = await saga.start_transfer(db, uuid.uuid4(), uuid.uuid4(), Decimal("30"), client)

        assert tx.status == TransactionStatus.DEBIT_COMPLETED
        assert client.credit.await_count == 1

    async def test_marks_failed_compensation_when_compensation_credit_unreachable(self, db, client):
        client.debit.return_value = {}
        client.credit.side_effect = [AccountNotFoundError("destination missing"), AccountsServiceError("unreachable")]

        tx = await saga.start_transfer(db, uuid.uuid4(), uuid.uuid4(), Decimal("30"), client)

        assert tx.status == TransactionStatus.FAILED_COMPENSATION


class TestResumeTransaction:
    async def test_recharge_already_completed_is_a_noop(self, db, client):
        account_id = uuid.uuid4()
        tx = await saga.start_recharge(db, account_id, Decimal("50"), client)
        client.credit.reset_mock()

        result = await saga.resume_transaction(db, tx, client)

        assert result.status == TransactionStatus.COMPLETED
        client.credit.assert_not_awaited()

    async def test_resumes_transfer_stuck_at_debit_completed(self, db, client):
        client.debit.return_value = {}
        client.credit.side_effect = AccountsServiceError("unreachable")
        tx = await saga.start_transfer(db, uuid.uuid4(), uuid.uuid4(), Decimal("30"), client)
        assert tx.status == TransactionStatus.DEBIT_COMPLETED

        client.credit.side_effect = None
        client.credit.return_value = {}
        result = await saga.resume_transaction(db, tx, client)

        assert result.status == TransactionStatus.COMPLETED

    async def test_resumes_transfer_stuck_at_compensating(self, db, client):
        # Simulates a crash right after the COMPENSATING status was persisted
        # but before the compensating credit was issued.
        tx = Transaction(
            id=uuid.uuid4(),
            type=TransactionType.TRANSFER,
            status=TransactionStatus.COMPENSATING,
            from_account_id=uuid.uuid4(),
            to_account_id=uuid.uuid4(),
            amount=Decimal("30"),
        )
        client.credit.return_value = {}

        result = await saga.resume_transaction(db, tx, client)

        assert result.status == TransactionStatus.COMPENSATED
        client.credit.assert_awaited_once_with(
            tx.from_account_id, Decimal("30"), reference_id=f"{tx.id}:compensate", description="transfer-compensation"
        )
        client.debit.assert_not_awaited()
