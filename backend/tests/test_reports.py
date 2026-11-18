import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.sale import Sale


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


def create_sale(
    client: TestClient,
    headers: dict[str, str],
    product_ids: list[str],
    *,
    key: str,
    quantities: list[int] | None = None,
    **payload_overrides: object,
) -> dict:
    response = client.post(
        "/api/v1/sales",
        headers={**headers, "Idempotency-Key": key},
        json=sale_payload(product_ids, quantities=quantities, **payload_overrides),
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def set_sale_created_at(db: Session, sale_id: str, when: datetime) -> None:
    db.execute(
        update(Sale)
        .where(Sale.id == uuid.UUID(sale_id))
        .values(created_at=when)
    )
    db.commit()


def at_noon(day: date) -> datetime:
    return datetime(day.year, day.month, day.day, 12, 0, tzinfo=timezone.utc)


def test_dashboard_totals_profit_top_products_and_low_stock(
    client: TestClient,
    db: Session,
    admin_headers: dict[str, str],
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    milk, bread, low_stock = sample_products
    today = datetime.now(timezone.utc).date()

    today_sale = create_sale(
        client,
        cashier_headers,
        [str(milk.id)],
        quantities=[2],
        key="dashboard-today",
        payment_method="CARD",
        discount_amount="0.50",
    )
    yesterday_sale = create_sale(
        client,
        cashier_headers,
        [str(bread.id)],
        key="dashboard-yesterday",
    )
    cancelled_sale = create_sale(
        client,
        cashier_headers,
        [str(bread.id)],
        key="dashboard-cancelled",
    )
    old_sale = create_sale(
        client,
        cashier_headers,
        [str(milk.id)],
        key="dashboard-old",
    )

    client.post(
        f"/api/v1/sales/{cancelled_sale['id']}/cancel", headers=admin_headers
    )

    set_sale_created_at(db, today_sale["id"], at_noon(today))
    set_sale_created_at(
        db, yesterday_sale["id"], at_noon(today - timedelta(days=1))
    )
    set_sale_created_at(
        db, cancelled_sale["id"], at_noon(today - timedelta(days=2))
    )
    set_sale_created_at(
        db, old_sale["id"], at_noon(today - timedelta(days=40))
    )

    response = client.get("/api/v1/reports/dashboard", headers=admin_headers)

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["today"] == {"sales_total": "6.50", "invoice_count": 1}

    assert data["period"]["from"] == (today - timedelta(days=29)).isoformat()
    assert data["period"]["to"] == today.isoformat()
    assert data["period"]["sales_total"] == "7.75"
    assert data["period"]["invoice_count"] == 2
    assert data["period"]["average_invoice"] == "3.88"
    assert data["period"]["gross_profit"] == "3.45"

    assert data["low_stock_count"] == 1
    assert len(data["top_products"]) == 2
    assert data["top_products"][0]["sku"] == "MILK-1L"
    assert data["top_products"][0]["quantity_sold"] == 2
    assert data["top_products"][0]["revenue"] == "7.00"
    assert data["top_products"][1]["sku"] == "BREAD-1"

    assert len(data["daily_sales"]) == 30
    assert data["daily_sales"][-1] == {
        "period": today.isoformat(),
        "sales_total": "6.50",
        "invoice_count": 1,
    }
    assert data["daily_sales"][-2]["sales_total"] == "1.25"

    forbidden = client.get("/api/v1/reports/dashboard", headers=cashier_headers)
    assert forbidden.status_code == 403
    assert forbidden.json()["code"] == "FORBIDDEN"


def test_sales_report_daily_and_monthly_series_exclude_cancelled(
    client: TestClient,
    db: Session,
    admin_headers: dict[str, str],
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    milk, bread = sample_products[0], sample_products[1]

    november_one = create_sale(
        client,
        cashier_headers,
        [str(milk.id)],
        quantities=[2],
        key="report-nov-1",
        discount_amount="1.00",
    )
    november_fifteen = create_sale(
        client,
        cashier_headers,
        [str(bread.id)],
        key="report-nov-15",
    )
    october = create_sale(
        client,
        cashier_headers,
        [str(milk.id)],
        key="report-oct",
    )
    cancelled = create_sale(
        client,
        cashier_headers,
        [str(bread.id)],
        key="report-cancelled",
    )
    client.post(f"/api/v1/sales/{cancelled['id']}/cancel", headers=admin_headers)

    set_sale_created_at(db, november_one["id"], at_noon(date(2026, 11, 1)))
    set_sale_created_at(
        db, november_fifteen["id"], at_noon(date(2026, 11, 15))
    )
    set_sale_created_at(db, october["id"], at_noon(date(2026, 10, 20)))
    set_sale_created_at(
        db, cancelled["id"], at_noon(date(2026, 11, 10))
    )

    monthly = client.get(
        "/api/v1/reports/sales",
        headers=admin_headers,
        params={
            "from": "2026-10-01",
            "to": "2026-11-30",
            "group_by": "month",
        },
    )
    assert monthly.status_code == 200, monthly.text
    monthly_data = monthly.json()["data"]
    assert monthly_data["from"] == "2026-10-01"
    assert monthly_data["to"] == "2026-11-30"
    assert monthly_data["group_by"] == "month"
    assert monthly_data["summary"] == {
        "sales_total": "10.75",
        "invoice_count": 3,
        "average_invoice": "3.58",
        "total_discount": "1.00",
    }
    assert monthly_data["series"] == [
        {"period": "2026-10", "sales_total": "3.50", "invoice_count": 1},
        {"period": "2026-11", "sales_total": "7.25", "invoice_count": 2},
    ]

    daily = client.get(
        "/api/v1/reports/sales",
        headers=admin_headers,
        params={
            "from": "2026-11-01",
            "to": "2026-11-03",
            "group_by": "day",
        },
    )
    assert daily.status_code == 200, daily.text
    daily_data = daily.json()["data"]
    assert daily_data["summary"]["invoice_count"] == 1
    assert daily_data["summary"]["sales_total"] == "6.00"
    assert daily_data["series"] == [
        {"period": "2026-11-01", "sales_total": "6.00", "invoice_count": 1},
        {"period": "2026-11-02", "sales_total": "0.00", "invoice_count": 0},
        {"period": "2026-11-03", "sales_total": "0.00", "invoice_count": 0},
    ]

    invalid_group = client.get(
        "/api/v1/reports/sales",
        headers=admin_headers,
        params={"group_by": "week"},
    )
    assert invalid_group.status_code == 422

    reversed_range = client.get(
        "/api/v1/reports/sales",
        headers=admin_headers,
        params={"from": "2026-11-30", "to": "2026-11-01"},
    )
    assert reversed_range.status_code == 400
    assert reversed_range.json()["code"] == "INVALID_DATE_RANGE"

    too_wide = client.get(
        "/api/v1/reports/sales",
        headers=admin_headers,
        params={"from": "2025-01-01", "to": "2026-11-30"},
    )
    assert too_wide.status_code == 400
    assert too_wide.json()["code"] == "INVALID_DATE_RANGE"

    edge_ok = client.get(
        "/api/v1/reports/sales",
        headers=admin_headers,
        params={"from": "2025-01-01", "to": "2026-01-01"},
    )
    assert edge_ok.status_code == 200
    assert len(edge_ok.json()["data"]["series"]) == 366

    one_day_too_wide = client.get(
        "/api/v1/reports/sales",
        headers=admin_headers,
        params={"from": "2025-01-01", "to": "2026-01-02"},
    )
    assert one_day_too_wide.status_code == 400
    assert one_day_too_wide.json()["code"] == "INVALID_DATE_RANGE"


def test_top_products_report_groups_sales_and_honours_limit(
    client: TestClient,
    db: Session,
    admin_headers: dict[str, str],
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    milk, bread = sample_products[0], sample_products[1]
    milk_sale = create_sale(
        client,
        cashier_headers,
        [str(milk.id)],
        quantities=[3],
        key="top-milk",
    )
    bread_sale = create_sale(
        client,
        cashier_headers,
        [str(bread.id)],
        quantities=[2],
        key="top-bread",
    )
    cancelled = create_sale(
        client,
        cashier_headers,
        [str(milk.id)],
        quantities=[10],
        key="top-cancelled",
    )
    client.post(f"/api/v1/sales/{cancelled['id']}/cancel", headers=admin_headers)

    for sale in (milk_sale, bread_sale, cancelled):
        set_sale_created_at(db, sale["id"], at_noon(date(2026, 11, 5)))

    all_products = client.get(
        "/api/v1/reports/top-products",
        headers=admin_headers,
        params={"from": "2026-11-01", "to": "2026-11-30"},
    )
    assert all_products.status_code == 200, all_products.text
    items = all_products.json()["data"]
    assert [item["sku"] for item in items] == ["MILK-1L", "BREAD-1"]
    assert items[0] == {
        "product_id": str(milk.id),
        "product_name": "Milk 1L",
        "sku": "MILK-1L",
        "quantity_sold": 3,
        "revenue": "10.50",
    }
    assert items[1]["quantity_sold"] == 2
    assert items[1]["revenue"] == "2.50"

    limited = client.get(
        "/api/v1/reports/top-products",
        headers=admin_headers,
        params={"from": "2026-11-01", "to": "2026-11-30", "limit": 1},
    )
    assert len(limited.json()["data"]) == 1
    assert limited.json()["data"][0]["sku"] == "MILK-1L"

    bad_limit = client.get(
        "/api/v1/reports/top-products",
        headers=admin_headers,
        params={"limit": 0},
    )
    assert bad_limit.status_code == 422


def test_inventory_report_counts_and_value(
    client: TestClient,
    admin_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    response = client.get("/api/v1/reports/inventory", headers=admin_headers)

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["total_products"] == 3
    assert data["active_products"] == 3
    assert data["out_of_stock"] == 0
    assert data["low_stock"] == 1
    assert data["stock_value_at_cost"] == "49.00"
    assert len(data["low_stock_items"]) == 1
    assert data["low_stock_items"][0]["sku"] == "LOW-1"
    assert data["low_stock_items"][0]["stock_quantity"] == 1
    assert data["low_stock_items"][0]["minimum_stock"] == 3
    assert data["low_stock_items"][0]["value_at_cost"] == "1.00"


def test_reports_require_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/reports/dashboard")

    assert response.status_code == 401
    assert response.json()["code"] == "TOKEN_INVALID"
