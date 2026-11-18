import uuid
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.utils.money import money_str

MoneyIn = Annotated[Decimal, Field(max_digits=12, decimal_places=2, ge=0)]
PaymentMethod = Literal["CASH", "CARD"]
SaleStatus = Literal["COMPLETED", "CANCELLED"]


class SaleItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: uuid.UUID
    quantity: int = Field(ge=1)


class SaleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[SaleItemCreate] = Field(max_length=100)
    payment_method: PaymentMethod
    discount_amount: MoneyIn = Decimal("0.00")


def _cashier_dict(sale: object) -> dict:
    cashier = getattr(sale, "cashier", None)
    return {
        "id": str(sale.cashier_id),
        "full_name": cashier.full_name if cashier is not None else "",
    }


def sale_item_to_dict(item: object, *, include_cost: bool) -> dict:
    data = {
        "product_id": str(item.product_id),
        "product_name": item.product_name,
        "sku": item.sku,
        "quantity": item.quantity,
        "unit_price": money_str(item.unit_price),
        "line_total": money_str(item.line_total),
    }
    if include_cost:
        data["unit_cost"] = money_str(item.unit_cost)
    return data


def sale_to_dict(sale: object, *, include_cost: bool, include_items: bool = True) -> dict:
    """Serialize a sale for the current role (cashiers never see unit_cost)."""
    items = sorted(sale.items, key=lambda item: (item.product_name, str(item.id)))
    data = {
        "id": str(sale.id),
        "invoice_number": sale.invoice_number,
        "status": sale.status,
        "cashier": _cashier_dict(sale),
        "subtotal": money_str(sale.subtotal),
        "discount_amount": money_str(sale.discount_amount),
        "tax_amount": money_str(sale.tax_amount),
        "total_amount": money_str(sale.total_amount),
        "payment_method": sale.payment_method,
        "created_at": sale.created_at.isoformat(),
        "item_count": len(items),
    }
    if include_items:
        data["items"] = [
            sale_item_to_dict(item, include_cost=include_cost) for item in items
        ]
    return data


def invoice_to_dict(sale: object, *, store_name: str, currency: str) -> dict:
    """Print payload for an invoice; unit_cost is never included."""
    data = sale_to_dict(sale, include_cost=False, include_items=True)
    data["store_name"] = store_name
    data["currency"] = currency
    return data
