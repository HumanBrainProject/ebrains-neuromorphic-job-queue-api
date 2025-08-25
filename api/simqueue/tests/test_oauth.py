import os
import pytest
from simqueue.oauth import User


@pytest.fixture(scope="module")
def token():
    try:
        return os.environ["EBRAINS_AUTH_TOKEN"]
    except KeyError:
        pytest.skip("Environment variable EBRAINS_AUTH_TOKEN is not set")


@pytest.fixture
def fake_user_data():
    return {
        "preferred_username": "haroldlloyd",
        "roles": {
            "group": ["comic-film-actors-from-the-silent-era"],
            "team": [
                "collab-some-other-collab-viewer",
                "collab-neuromorphic-testing-private-editor",
                "collab-neuromorphic-platform-admin-administrator",
            ],
        },
    }


@pytest.mark.asyncio
async def test_user(token):
    user = await User.from_token(token)
    assert hasattr(user, "username")


def test_user_get_collabs(fake_user_data):
    user = User(**fake_user_data)
    assert user.get_collabs() == [
        "neuromorphic-platform-admin",
        "neuromorphic-testing-private",
        f"private-{fake_user_data['preferred_username']}",
        "some-other-collab",
    ]


@pytest.mark.asyncio
async def test_user_can_view_as_member(fake_user_data):
    user = User(**fake_user_data)
    assert await user.can_view("neuromorphic-testing-private")


@pytest.mark.asyncio
async def test_user_can_view_public_collab(token):
    user = await User.from_token(token)
    assert await user.can_view("documentation")


@pytest.mark.asyncio
async def test_user_can_view_non_existent_collab(token):
    user = await User.from_token(token)
    assert not await user.can_view("d0cumentat10n")


def test_user_can_edit(fake_user_data):
    user = User(**fake_user_data)
    assert user.can_edit("neuromorphic-testing-private")
    assert not user.can_edit("some-other-collab")
