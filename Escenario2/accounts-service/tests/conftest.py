from unittest.mock import AsyncMock, MagicMock

import pytest


def make_execute_result(scalar_one_or_none=None, scalars_all=None):
    """Builds a fake SQLAlchemy `Result` for mocking `AsyncSession.execute`."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = scalar_one_or_none
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = scalars_all if scalars_all is not None else []
    result.scalars.return_value = scalars_mock
    return result


@pytest.fixture
def db():
    session = AsyncMock()
    session.add = MagicMock()
    return session
