import uuid
from decimal import Decimal

from sqlalchemy.exc import IntegrityError

import pytest

from app import crud
from app.models import Account, LedgerEntry
from tests.conftest import make_execute_result


class TestGetAccount:
    async def test_returns_account_when_found(self, db):
        account = Account(id=uuid.uuid4(), owner_name="Jane", email="jane@x.com", currency="USD", balance=Decimal("10"))
        db.get.return_value = account

        result = await crud.get_account(db, account.id)

        assert result is account

    async def test_raises_when_not_found(self, db):
        db.get.return_value = None
        account_id = uuid.uuid4()

        with pytest.raises(crud.AccountNotFound):
            await crud.get_account(db, account_id)


class TestCreateAccount:
    async def test_creates_account_with_given_attributes(self, db):
        account = await crud.create_account(db, "Jane Doe", "jane@x.com", "USD", Decimal("100.00"))

        assert account.owner_name == "Jane Doe"
        assert account.email == "jane@x.com"
        assert account.currency == "USD"
        assert account.balance == Decimal("100.00")
        db.add.assert_called_once_with(account)
        db.commit.assert_awaited_once()
        db.refresh.assert_awaited_once_with(account)


class TestListAccounts:
    async def test_returns_all_accounts(self, db):
        accounts = [Account(id=uuid.uuid4()), Account(id=uuid.uuid4())]
        db.execute.return_value = make_execute_result(scalars_all=accounts)

        result = await crud.list_accounts(db)

        assert result == accounts

    async def test_returns_empty_list_when_no_accounts(self, db):
        db.execute.return_value = make_execute_result(scalars_all=[])

        result = await crud.list_accounts(db)

        assert result == []


class TestCreditAccount:
    async def test_credits_new_reference_and_updates_balance(self, db):
        account_id = uuid.uuid4()
        account = Account(id=account_id, balance=Decimal("50"))
        db.execute.return_value = make_execute_result(scalar_one_or_none=None)
        db.get.return_value = account

        entry = await crud.credit_account(db, account_id, Decimal("20"), "ref-1", "top up")

        assert account.balance == Decimal("70")
        assert entry.entry_type == "CREDIT"
        assert entry.amount == Decimal("20")
        assert entry.balance_after == Decimal("70")
        assert entry.description == "top up"
        db.commit.assert_awaited_once()

    async def test_idempotent_when_reference_already_applied(self, db):
        account_id = uuid.uuid4()
        existing = LedgerEntry(
            id=uuid.uuid4(), account_id=account_id, reference_id="ref-1",
            entry_type="CREDIT", amount=Decimal("20"), balance_after=Decimal("70"),
        )
        db.execute.return_value = make_execute_result(scalar_one_or_none=existing)

        entry = await crud.credit_account(db, account_id, Decimal("20"), "ref-1")

        assert entry is existing
        db.get.assert_not_called()
        db.commit.assert_not_awaited()

    async def test_raises_account_not_found(self, db):
        account_id = uuid.uuid4()
        db.execute.return_value = make_execute_result(scalar_one_or_none=None)
        db.get.return_value = None

        with pytest.raises(crud.AccountNotFound):
            await crud.credit_account(db, account_id, Decimal("20"), "ref-1")

    async def test_concurrent_duplicate_returns_existing_entry_after_integrity_error(self, db):
        account_id = uuid.uuid4()
        account = Account(id=account_id, balance=Decimal("50"))
        existing = LedgerEntry(
            id=uuid.uuid4(), account_id=account_id, reference_id="ref-1",
            entry_type="CREDIT", amount=Decimal("20"), balance_after=Decimal("70"),
        )
        db.execute.side_effect = [
            make_execute_result(scalar_one_or_none=None),
            make_execute_result(scalar_one_or_none=existing),
        ]
        db.get.return_value = account
        db.commit.side_effect = IntegrityError("stmt", {}, Exception("duplicate"))

        entry = await crud.credit_account(db, account_id, Decimal("20"), "ref-1")

        assert entry is existing
        db.rollback.assert_awaited_once()

    async def test_reraises_integrity_error_when_not_a_duplicate(self, db):
        account_id = uuid.uuid4()
        account = Account(id=account_id, balance=Decimal("50"))
        db.execute.side_effect = [
            make_execute_result(scalar_one_or_none=None),
            make_execute_result(scalar_one_or_none=None),
        ]
        db.get.return_value = account
        db.commit.side_effect = IntegrityError("stmt", {}, Exception("duplicate"))

        with pytest.raises(IntegrityError):
            await crud.credit_account(db, account_id, Decimal("20"), "ref-1")


class TestDebitAccount:
    async def test_debits_when_sufficient_funds(self, db):
        account_id = uuid.uuid4()
        account = Account(id=account_id, balance=Decimal("50"))
        db.execute.return_value = make_execute_result(scalar_one_or_none=None)
        db.get.return_value = account

        entry = await crud.debit_account(db, account_id, Decimal("20"), "ref-1")

        assert account.balance == Decimal("30")
        assert entry.entry_type == "DEBIT"
        assert entry.balance_after == Decimal("30")
        db.commit.assert_awaited_once()

    async def test_raises_insufficient_funds_and_does_not_commit(self, db):
        account_id = uuid.uuid4()
        account = Account(id=account_id, balance=Decimal("10"))
        db.execute.return_value = make_execute_result(scalar_one_or_none=None)
        db.get.return_value = account

        with pytest.raises(crud.InsufficientFunds):
            await crud.debit_account(db, account_id, Decimal("20"), "ref-1")

        assert account.balance == Decimal("10")
        db.commit.assert_not_awaited()

    async def test_idempotent_when_reference_already_applied(self, db):
        account_id = uuid.uuid4()
        existing = LedgerEntry(
            id=uuid.uuid4(), account_id=account_id, reference_id="ref-1",
            entry_type="DEBIT", amount=Decimal("20"), balance_after=Decimal("30"),
        )
        db.execute.return_value = make_execute_result(scalar_one_or_none=existing)

        entry = await crud.debit_account(db, account_id, Decimal("20"), "ref-1")

        assert entry is existing
        db.get.assert_not_called()

    async def test_raises_account_not_found(self, db):
        account_id = uuid.uuid4()
        db.execute.return_value = make_execute_result(scalar_one_or_none=None)
        db.get.return_value = None

        with pytest.raises(crud.AccountNotFound):
            await crud.debit_account(db, account_id, Decimal("20"), "ref-1")


class TestGetLedger:
    async def test_returns_entries_for_account(self, db):
        entries = [LedgerEntry(id=uuid.uuid4()), LedgerEntry(id=uuid.uuid4())]
        db.execute.return_value = make_execute_result(scalars_all=entries)

        result = await crud.get_ledger(db, uuid.uuid4())

        assert result == entries
