import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import ORMModel, MoneyOut

MoneyIn = Annotated[Decimal, Field(max_digits=12, decimal_places=2, ge=0)]


def _clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


class ProductCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=64)
    barcode: str | None = Field(default=None, max_length=64)
    category: str | None = Field(default=None, max_length=100)
    unit: str = Field(default="piece", min_length=1, max_length=20)
    cost_price: MoneyIn
    selling_price: MoneyIn
    stock_quantity: int = Field(default=0, ge=0)
    minimum_stock: int = Field(default=0, ge=0)
    is_active: bool = True

    @field_validator("name", "sku")
    @classmethod
    def _strip_required_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("unit")
    @classmethod
    def _strip_unit(cls, value: str) -> str:
        return value.strip() or "piece"

    @field_validator("barcode", "category")
    @classmethod
    def _empty_to_none(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)


class ProductUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    sku: str | None = Field(default=None, min_length=1, max_length=64)
    barcode: str | None = Field(default=None, max_length=64)
    category: str | None = Field(default=None, max_length=100)
    unit: str | None = Field(default=None, min_length=1, max_length=20)
    cost_price: MoneyIn | None = None
    selling_price: MoneyIn | None = None
    stock_quantity: int | None = Field(default=None, ge=0)
    minimum_stock: int | None = Field(default=None, ge=0)
    is_active: bool | None = None

    @field_validator("name", "sku")
    @classmethod
    def _strip_required_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value

    @field_validator("unit")
    @classmethod
    def _strip_unit(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or "piece"

    @field_validator("barcode", "category")
    @classmethod
    def _empty_to_none(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)


class ProductAdminOut(ORMModel):
    id: uuid.UUID
    name: str
    sku: str
    barcode: str | None
    category: str | None
    unit: str
    cost_price: MoneyOut
    selling_price: MoneyOut
    stock_quantity: int
    minimum_stock: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductCashierOut(ORMModel):
    id: uuid.UUID
    name: str
    sku: str
    barcode: str | None
    category: str | None
    unit: str
    selling_price: MoneyOut
    stock_quantity: int
    minimum_stock: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


def product_to_dict(product: object, *, include_cost: bool) -> dict:
    """Serialize a product for the current role (cashiers never see cost)."""
    schema = ProductAdminOut if include_cost else ProductCashierOut
    return schema.model_validate(product).model_dump(mode="json")
