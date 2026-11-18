from collections.abc import Iterator
from typing import Annotated

from fastapi import Query
from sqlalchemy.orm import Session

from app.db.session import SessionLocal


def get_db() -> Iterator[Session]:
    """One session per request. Services own commit/rollback; we always close."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class PaginationParams:
    def __init__(
        self,
        page: Annotated[int, Query(ge=1)] = 1,
        page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    ) -> None:
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
