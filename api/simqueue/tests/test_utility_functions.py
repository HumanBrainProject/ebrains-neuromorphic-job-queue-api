import pytest
import pytest_asyncio

from .. import utils
from ..data_models import ResourceUsage
import simqueue.db


@pytest.fixture()
def mock_quotas():
    return [
        {"limit": 100, "usage": 100, "id": 101},
        {"limit": 50, "usage": 49, "id": 102},
        {"limit": 1000, "usage": 0, "id": 103},
    ]


@pytest.mark.asyncio
async def test_check_quotas(mocker, mock_quotas):
    mocker.patch("simqueue.utils.get_available_quotas", return_value=mock_quotas)
    assert await utils.check_quotas("some-collab", "TestPlatform") is True

    mocker.patch("simqueue.utils.get_available_quotas", return_value=mock_quotas[0:1])
    assert await utils.check_quotas("some-collab", "TestPlatform") is False


@pytest.mark.asyncio
async def test_update_quotas_1(mocker, mock_quotas):
    mocker.patch("simqueue.utils.get_available_quotas", return_value=mock_quotas)
    mocker.patch("simqueue.db.update_quota")

    await utils.update_quotas(
        "some-collab", "TestPlatform", ResourceUsage(units="bushels", value=1)
    )
    assert simqueue.db.update_quota.await_args_list[0].args == (
        102,
        {"limit": 50, "usage": 50, "id": 102},
    )


@pytest.mark.asyncio
async def test_update_quotas_2(mocker, mock_quotas):
    mocker.patch("simqueue.utils.get_available_quotas", return_value=mock_quotas)
    mocker.patch("simqueue.db.update_quota")
    await utils.update_quotas(
        "some-collab", "TestPlatform", ResourceUsage(units="bushels", value=2)
    )
    assert simqueue.db.update_quota.await_args_list[0].args == (
        102,
        {"limit": 50, "usage": 50, "id": 102},
    )
    assert simqueue.db.update_quota.await_args_list[1].args == (
        103,
        {"limit": 1000, "usage": 1, "id": 103},
    )
