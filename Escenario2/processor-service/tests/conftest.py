from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models import TransactionStatus


def make_execute_result(scalars_all=None):
    """Builds a fake SQLAlchemy `Result` for mocking `AsyncSession.execute`."""
    result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = scalars_all if scalars_all is not None else []
    result.scalars.return_value = scalars_mock
    return result


def _apply_insert_defaults(obj):
    """A mocked session never flushes, so column-level defaults (e.g.
    Transaction.status) never run. Emulate that here for added objects."""
    if hasattr(obj, "status") and obj.status is None:
        obj.status = TransactionStatus.PENDING


@pytest.fixture
def db():
    session = AsyncMock()
    session.add = MagicMock(side_effect=_apply_insert_defaults)
    return session
