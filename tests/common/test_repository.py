import pytest
import pytest_asyncio
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from newell_common.db import Base, make_engine, make_session_factory
from newell_common.repository import BaseRepository


class Widget(Base):
    __tablename__ = "widgets"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))


@pytest_asyncio.fixture
async def session():
    engine = make_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = make_session_factory(engine)
    async with factory() as s:
        yield s
    await engine.dispose()


@pytest.mark.asyncio
async def test_add_populates_pk_and_get(session):
    repo = BaseRepository(session, Widget)
    saved = await repo.add(Widget(name="hi"))
    assert saved.id is not None
    fetched = await repo.get(saved.id)
    assert fetched.name == "hi"


@pytest.mark.asyncio
async def test_list_returns_all(session):
    repo = BaseRepository(session, Widget)
    await repo.add(Widget(name="a"))
    await repo.add(Widget(name="b"))
    assert len(await repo.list()) == 2
