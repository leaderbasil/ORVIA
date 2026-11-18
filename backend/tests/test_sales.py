from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.main import app
from app.models.product import Product
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.user import User


def sale_payload(
    product_ids: list[str],
    *,
    quantities: list[int] | None = None,
    payment_method: str = "CASH",
    discount_amount: str = "0.00",
) -> dict:
    amounts = quantities or [1] * len(product_ids)
    return {
        "items": [
            {"product_id": product_id, "quantity": quantity}
            for product_id, quantity in zip(product_ids, amounts, strict=True)
        ],
        "payment_method": payment_method,
        "discount_amount": discount_amount,
    }


def with_key(headers: dict[str, str], key: str) -> dict[str, str]:
    return {**headers, "Idempotency-Key": key}


def create_sale(
    client: TestClient,
    headers: dict[str, str],
    product_ids: list[str],
    *,
    quantities: list[int] | None = None,
    key: str = "checkout-0001",
    **payload_overrides: object,
) -> dict:
    response = client.post(
        "/api/v1/sales",
        headers=with_key(headers, key),
        json=sale_payload(product_ids, quantities=quantities, **payload_overrides),
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def test_cashier_creates_sale_with_server_computed_totals(
    client: TestClient,
    db: Session,
    cashier_headers: dict[str, str],
    cashier_user: User,
    sample_products: list[Product],
) -> None:
    milk, bread = sample_products[0], sample_products[1]

    response = client.post(
        "/api/v1/sales",
        headers=with_key(cashier_headers, "checkout-0001"),
        json=sale_payload(
            [str(milk.id), str(bread.id)],
            quantities=[2, 1],
            discount_amount="1.50",
        ),
    )

    assert response.status_code == 201, response.text
    data = response.json()["data"]
    assert data["invoice_number"].startswith("INV-")
    assert data["invoice_number"].endswith("-000001")
    assert data["status"] == "COMPLETED"
    assert data["cashier"] == {
        "id": str(cashier_user.id),
        "full_name": cashier_user.full_name,
    }
    assert data["subtotal"] == "8.25"
    assert data["discount_amount"] == "1.50"
    assert data["tax_amount"] == "0.00"
    assert data["total_amount"] == "6.75"
    assert data["item_count"] == 2
    assert "idempotency_key" not in data

    items = {item["sku"]: item for item in data["items"]}
    assert items["MILK-1L"]["quantity"] == 2
    assert items["MILK-1L"]["unit_price"] == "3.50"
    assert items["MILK-1L"]["line_total"] == "7.00"
    assert items["BREAD-1"]["line_total"] == "1.25"
    assert all("unit_cost" not in item for item in data["items"])

    db.expire_all()
    milk_db = db.get(Product, milk.id)
    bread_db = db.get(Product, bread.id)
    assert milk_db.stock_quantity == 18
    assert bread_db.stock_quantity == 9

    sale = db.scalar(select(Sale).where(Sale.id == data["id"]))
    assert sale is not None
    assert sale.idempotency_key == "checkout-0001"
    assert db.scalar(select(func.count()).select_from(SaleItem)) == 2


def test_admin_sale_response_includes_unit_cost(
    client: TestClient,
    admin_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    data = create_sale(
        client,
        admin_headers,
        [str(sample_products[0].id)],
        key="admin-checkout-1",
    )

    assert data["items"][0]["unit_cost"] == "2.00"


def test_sale_is_idempotent_for_the_same_user(
    client: TestClient,
    db: Session,
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    product_id = str(sample_products[0].id)
    headers = with_key(cashier_headers, "checkout-replay-1")
    payload = sale_payload([product_id], quantities=[2])

    first = client.post("/api/v1/sales", headers=headers, json=payload)
    second = client.post("/api/v1/sales", headers=headers, json=payload)

    assert first.status_code == 201, first.text
    assert second.status_code == 200, second.text
    assert second.json()["message"] == "Sale replayed"
    assert second.json()["data"]["id"] == first.json()["data"]["id"]
    assert second.json()["data"]["invoice_number"] == first.json()["data"]["invoice_number"]

    db.expire_all()
    assert db.get(Product, sample_products[0].id).stock_quantity == 18
    assert db.scalar(select(func.count()).select_from(Sale)) == 1


def test_idempotency_key_from_another_user_conflicts(
    client: TestClient,
    db: Session,
    admin_headers: dict[str, str],
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    product_id = str(sample_products[0].id)
    key = "shared-checkout-key"
    first = client.post(
        "/api/v1/sales",
        headers=with_key(cashier_headers, key),
        json=sale_payload([product_id]),
    )
    assert first.status_code == 201, first.text

    conflict = client.post(
        "/api/v1/sales",
        headers=with_key(admin_headers, key),
        json=sale_payload([product_id], quantities=[2]),
    )

    assert conflict.status_code == 409
    assert conflict.json()["code"] == "IDEMPOTENCY_KEY_CONFLICT"
    db.expire_all()
    assert db.get(Product, sample_products[0].id).stock_quantity == 19
    assert db.scalar(select(func.count()).select_from(Sale)) == 1


def test_duplicate_product_ids_are_merged(
    client: TestClient,
    db: Session,
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    product_id = str(sample_products[0].id)

    data = create_sale(
        client,
        cashier_headers,
        [product_id, product_id],
        quantities=[1, 2],
        key="merged-cart-key",
    )

    assert data["item_count"] == 1
    assert data["items"][0]["quantity"] == 3
    assert data["subtotal"] == "10.50"
    db.expire_all()
    assert db.get(Product, sample_products[0].id).stock_quantity == 17


def test_insufficient_stock_rolls_back_the_whole_sale(
    client: TestClient,
    db: Session,
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    milk, bread = sample_products[0], sample_products[1]

    response = client.post(
        "/api/v1/sales",
        headers=with_key(cashier_headers, "insufficient-key"),
        json=sale_payload(
            [str(bread.id), str(milk.id)], quantities=[1, 999]
        ),
    )

    assert response.status_code == 409, response.text
    body = response.json()
    assert body["code"] == "INSUFFICIENT_STOCK"
    assert body["meta"]["product_id"] == str(milk.id)
    assert body["meta"]["available"] == 20
    assert body["meta"]["requested"] == 999

    db.expire_all()
    assert db.get(Product, milk.id).stock_quantity == 20
    assert db.get(Product, bread.id).stock_quantity == 10
    assert db.scalar(select(func.count()).select_from(Sale)) == 0
    assert db.scalar(select(func.count()).select_from(SaleItem)) == 0


def test_inactive_product_is_rejected(
    client: TestClient,
    db: Session,
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    product = sample_products[0]
    product.is_active = False
    db.commit()

    response = client.post(
        "/api/v1/sales",
        headers=with_key(cashier_headers, "inactive-product-key"),
        json=sale_payload([str(product.id)]),
    )

    assert response.status_code == 409, response.text
    assert response.json()["code"] == "PRODUCT_INACTIVE"
    db.expire_all()
    assert db.get(Product, product.id).stock_quantity == 20


def test_sale_validation_rules(
    client: TestClient,
    admin_headers: dict[str, str],
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    milk = sample_products[0]
    url = "/api/v1/sales"

    missing_key = client.post(
        url, headers=cashier_headers, json=sale_payload([str(milk.id)])
    )
    assert missing_key.status_code == 422
    assert missing_key.json()["code"] == "VALIDATION_ERROR"

    short_key = client.post(
        url,
        headers=with_key(cashier_headers, "short"),
        json=sale_payload([str(milk.id)]),
    )
    assert short_key.status_code == 422

    empty_cart = client.post(
        url,
        headers=with_key(cashier_headers, "empty-cart-key"),
        json={"items": [], "payment_method": "CASH"},
    )
    assert empty_cart.status_code == 422
    assert empty_cart.json()["code"] == "EMPTY_CART"

    zero_quantity = client.post(
        url,
        headers=with_key(cashier_headers, "zero-quantity-key"),
        json=sale_payload([str(milk.id)], quantities=[0]),
    )
    assert zero_quantity.status_code == 422

    client_price = client.post(
        url,
        headers=with_key(cashier_headers, "client-price-key"),
        json={
            "items": [
                {"product_id": str(milk.id), "quantity": 1, "unit_price": "0.01"}
            ],
            "payment_method": "CASH",
            "discount_amount": "0.00",
        },
    )
    assert client_price.status_code == 422

    invalid_payment = client.post(
        url,
        headers=with_key(cashier_headers, "invalid-payment-key"),
        json=sale_payload([str(milk.id)], payment_method="CREDIT"),
    )
    assert invalid_payment.status_code == 422

    negative_discount = client.post(
        url,
        headers=with_key(cashier_headers, "negative-discount-key"),
        json=sale_payload([str(milk.id)], discount_amount="-1.00"),
    )
    assert negative_discount.status_code == 422

    unknown_product = client.post(
        url,
        headers=with_key(cashier_headers, "unknown-product-key"),
        json=sale_payload(["00000000-0000-0000-0000-000000000000"]),
    )
    assert unknown_product.status_code == 404
    assert unknown_product.json()["code"] == "PRODUCT_NOT_FOUND"

    too_large_discount = client.post(
        url,
        headers=with_key(cashier_headers, "large-discount-key"),
        json=sale_payload([str(milk.id)], discount_amount="99.00"),
    )
    assert too_large_discount.status_code == 400
    assert too_large_discount.json()["code"] == "INVALID_DISCOUNT"


def test_tax_is_computed_with_round_half_up(
    client: TestClient,
    cashier_headers: dict[str, str],
    sample_products: list[Product],
    monkeypatch,
) -> None:
    monkeypatch.setattr(settings, "TAX_RATE", Decimal("0.15"))

    data = create_sale(
        client,
        cashier_headers,
        [str(sample_products[0].id)],
        discount_amount="0.01",
        key="tax-checkout-key",
    )

    assert data["subtotal"] == "3.50"
    assert data["discount_amount"] == "0.01"
    assert data["tax_amount"] == "0.52"
    assert data["total_amount"] == "4.01"


def test_history_scoping_filters_and_pagination(
    client: TestClient,
    cashier_headers: dict[str, str],
    admin_headers: dict[str, str],
    cashier_user: User,
    sample_products: list[Product],
) -> None:
    cashier_sale = create_sale(
        client,
        cashier_headers,
        [str(sample_products[0].id)],
        key="history-cashier-key",
        payment_method="CARD",
    )
    admin_sale = create_sale(
        client,
        admin_headers,
        [str(sample_products[1].id)],
        key="history-admin-key",
    )

    cashier_history = client.get("/api/v1/sales", headers=cashier_headers)
    assert cashier_history.status_code == 200, cashier_history.text
    cashier_data = cashier_history.json()["data"]
    assert cashier_data["total"] == 1
    assert cashier_data["items"][0]["id"] == cashier_sale["id"]
    assert "items" not in cashier_data["items"][0]
    assert cashier_data["items"][0]["item_count"] == 1

    admin_history = client.get("/api/v1/sales", headers=admin_headers)
    assert admin_history.json()["data"]["total"] == 2

    by_cashier = client.get(
        "/api/v1/sales",
        headers=admin_headers,
        params={"cashier_id": str(cashier_user.id)},
    )
    assert by_cashier.json()["data"]["total"] == 1
    assert by_cashier.json()["data"]["items"][0]["id"] == cashier_sale["id"]

    by_payment = client.get(
        "/api/v1/sales", headers=cashier_headers, params={"payment_method": "CARD"}
    )
    assert by_payment.json()["data"]["total"] == 1

    by_invoice = client.get(
        "/api/v1/sales",
        headers=admin_headers,
        params={"invoice_number": admin_sale["invoice_number"][-6:]},
    )
    assert by_invoice.json()["data"]["total"] == 1
    assert by_invoice.json()["data"]["items"][0]["id"] == admin_sale["id"]

    today = datetime.now(timezone.utc).date().isoformat()
    by_date = client.get(
        "/api/v1/sales",
        headers=cashier_headers,
        params={"from": today, "to": today},
    )
    assert by_date.status_code == 200
    assert by_date.json()["data"]["total"] == 1

    future = client.get(
        "/api/v1/sales",
        headers=cashier_headers,
        params={"from": "2999-01-01", "to": "2999-01-02"},
    )
    assert future.json()["data"]["total"] == 0

    reversed_range = client.get(
        "/api/v1/sales",
        headers=cashier_headers,
        params={"from": "2026-02-02", "to": "2026-02-01"},
    )
    assert reversed_range.status_code == 400
    assert reversed_range.json()["code"] == "INVALID_DATE_RANGE"

    too_wide = client.get(
        "/api/v1/sales",
        headers=cashier_headers,
        params={"from": "2026-01-01", "to": "2027-06-01"},
    )
    assert too_wide.status_code == 400

    page_two = client.get(
        "/api/v1/sales", headers=admin_headers, params={"page": 2, "page_size": 1}
    )
    page_data = page_two.json()["data"]
    assert page_data["total"] == 2
    assert len(page_data["items"]) == 1
    assert page_data["page"] == 2


def test_cashier_cannot_view_another_users_invoice(
    client: TestClient,
    cashier_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    admin_sale = create_sale(
        client,
        admin_headers,
        [str(sample_products[0].id)],
        key="admin-private-key",
    )

    detail = client.get(f"/api/v1/sales/{admin_sale['id']}", headers=cashier_headers)
    assert detail.status_code == 404
    assert detail.json()["code"] == "SALE_NOT_FOUND"

    invoice = client.get(
        f"/api/v1/sales/{admin_sale['id']}/invoice", headers=cashier_headers
    )
    assert invoice.status_code == 404

    cancel = client.post(
        f"/api/v1/sales/{admin_sale['id']}/cancel", headers=cashier_headers
    )
    assert cancel.status_code == 403


def test_sale_details_and_invoice_payload(
    client: TestClient,
    cashier_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    sale = create_sale(
        client,
        cashier_headers,
        [str(sample_products[0].id)],
        key="invoice-payload-key",
    )

    cashier_detail = client.get(
        f"/api/v1/sales/{sale['id']}", headers=cashier_headers
    )
    assert cashier_detail.status_code == 200
    assert cashier_detail.json()["data"]["items"][0]["sku"] == "MILK-1L"
    assert "unit_cost" not in cashier_detail.json()["data"]["items"][0]

    admin_detail = client.get(f"/api/v1/sales/{sale['id']}", headers=admin_headers)
    assert admin_detail.json()["data"]["items"][0]["unit_cost"] == "2.00"

    invoice = client.get(
        f"/api/v1/sales/{sale['id']}/invoice", headers=cashier_headers
    )
    assert invoice.status_code == 200
    payload = invoice.json()["data"]
    assert payload["invoice_number"] == sale["invoice_number"]
    assert payload["cashier"]["full_name"] == "Front Cashier"
    assert payload["store_name"]
    assert payload["currency"] == "USD"
    assert "unit_cost" not in payload["items"][0]


def test_admin_cancels_sale_and_restores_stock_once(
    client: TestClient,
    db: Session,
    cashier_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    milk = sample_products[0]
    sale = create_sale(
        client,
        cashier_headers,
        [str(milk.id)],
        quantities=[2],
        key="cancel-once-key",
    )

    first = client.post(f"/api/v1/sales/{sale['id']}/cancel", headers=admin_headers)
    assert first.status_code == 200, first.text
    assert first.json()["data"]["status"] == "CANCELLED"

    db.expire_all()
    assert db.get(Product, milk.id).stock_quantity == 20

    second = client.post(f"/api/v1/sales/{sale['id']}/cancel", headers=admin_headers)
    assert second.status_code == 409
    assert second.json()["code"] == "SALE_ALREADY_CANCELLED"

    db.expire_all()
    assert db.get(Product, milk.id).stock_quantity == 20
    assert db.scalar(select(func.count()).select_from(Sale)) == 1


def test_cancellation_restores_disabled_products(
    client: TestClient,
    db: Session,
    cashier_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    product = sample_products[0]
    sale = create_sale(
        client,
        cashier_headers,
        [str(product.id)],
        key="cancel-disabled-key",
    )

    product.is_active = False
    db.commit()

    cancelled = client.post(
        f"/api/v1/sales/{sale['id']}/cancel", headers=admin_headers
    )
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["data"]["status"] == "CANCELLED"

    db.expire_all()
    product_db = db.get(Product, product.id)
    assert product_db.stock_quantity == 20
    assert product_db.is_active is False


def test_cancelled_sales_are_filterable(
    client: TestClient,
    cashier_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    sale = create_sale(
        client,
        cashier_headers,
        [str(sample_products[0].id)],
        key="cancelled-filter-key",
    )
    client.post(f"/api/v1/sales/{sale['id']}/cancel", headers=admin_headers)

    filtered = client.get(
        "/api/v1/sales", headers=cashier_headers, params={"status": "CANCELLED"}
    )
    assert filtered.status_code == 200
    assert filtered.json()["data"]["total"] == 1
    assert filtered.json()["data"]["items"][0]["status"] == "CANCELLED"


def test_concurrent_sales_only_deduct_available_stock(
    db: Session,
    cashier_token: str,
    sample_products: list[Product],
) -> None:
    product = sample_products[0]
    product.stock_quantity = 1
    db.commit()

    headers = {
        "Authorization": f"Bearer {cashier_token}",
        "Idempotency-Key": "concurrent-key",
    }
    payload = sale_payload([str(product.id)])

    def attempt(key: str) -> int:
        with TestClient(app) as thread_client:
            response = thread_client.post(
                "/api/v1/sales",
                headers={**headers, "Idempotency-Key": key},
                json=payload,
            )
            return response.status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = sorted(
            executor.map(attempt, ["concurrent-key-a", "concurrent-key-b"])
        )

    assert statuses == [201, 409]
    db.expire_all()
    assert db.get(Product, product.id).stock_quantity == 0
    assert db.scalar(select(func.count()).select_from(Sale)) == 1


def test_sales_require_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/sales")

    assert response.status_code == 401
    assert response.json()["code"] == "TOKEN_INVALID"
