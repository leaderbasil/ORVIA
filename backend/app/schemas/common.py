from decimal import Decimal
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, PlainSerializer

T = TypeVar("T")

# Money is always serialized as a string with exactly two decimals ("12.50").
MoneyOut = Annotated[
    Decimal,
    PlainSerializer(lambda value: format(Decimal(value), ".2f"), return_type=str),
]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    data: object | None = None
    message: str = "OK"


class DataResponse(BaseModel, Generic[T]):
    data: T
    message: str = "OK"


class PageData(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class PageResponse(BaseModel, Generic[T]):
    data: PageData[T]
    message: str = "OK"


class ErrorResponse(BaseModel):
    detail: str
    code: str
    errors: list[dict] | None = None
    meta: dict | None = None
