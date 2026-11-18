from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.user import User


def product_payload(**overrides: object) -> dict:
    payload = {
        "name": "Orange Juice",
        "sku": "JUICE-1L",
        "barcode": "333333",
        "category": "Beverages",
        "unit": "piece",
        "cost_price": "2.50",
        "selling_price": "4.00",
        "stock_quantity": 12,
        "minimum_stock": 3,
    }
    payload.update(overrides)
    return payload


def test_admin_creates_a_product_with_string_money(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/products", headers=admin_headers, json=product_payload()
    )

    assert response.status_code == 201, response.text
    data = response.json()["data"]
    assert data["name"] == "Orange Juice"
    assert data["cost_price"] == "2.50"
    assert data["selling_price"] == "4.00"
    assert data["stock_quantity"] == 12
    assert data["is_active"] is True


def test_empty_barcode_becomes_null_and_can_repeat(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    first = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json=product_payload(sku="NOBAR-1", barcode="", category=""),
    )
    second = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json=product_payload(sku="NOBAR-2", barcode=""),
    )

    assert first.status_code == 201, first.text
    assert first.json()["data"]["barcode"] is None
    assert first.json()["data"]["category"] is None
    assert second.status_code == 201, second.text
    assert second.json()["data"]["barcode"] is None


def test_duplicate_sku_and_barcode_are_rejected(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    assert (
        client.post(
            "/api/v1/products", headers=admin_headers, json=product_payload()
        ).status_code
        == 201
    )

    duplicate_sku = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json=product_payload(barcode="444444"),
    )
    assert duplicate_sku.status_code == 409
    assert duplicate_sku.json()["code"] == "DUPLICATE_SKU"

    duplicate_barcode = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json=product_payload(sku="JUICE-2L"),
    )
    assert duplicate_barcode.status_code == 409
    assert duplicate_barcode.json()["code"] == "DUPLICATE_BARCODE"


def test_product_validation_rules(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    negative_price = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json=product_payload(cost_price="-1.00"),
    )
    assert negative_price.status_code == 422

    negative_stock = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json=product_payload(stock_quantity=-1),
    )
    assert negative_stock.status_code == 422

    three_decimals = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json=product_payload(selling_price="4.001"),
    )
    assert three_decimals.status_code == 422

    client_supplied_total = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json=product_payload(line_total="99.00"),
    )
    assert client_supplied_total.status_code == 422
    assert client_supplied_total.json()["code"] == "VALIDATION_ERROR"


def test_cashier_cannot_manage_products(
    client: TestClient, cashier_headers: dict[str, str], sample_products: list[Product]
) -> None:
    create = client.post(
        "/api/v1/products", headers=cashier_headers, json=product_payload()
    )
    assert create.status_code == 403
    assert create.json()["code"] == "FORBIDDEN"

    update = client.patch(
        f"/api/v1/products/{sample_products[0].id}",
        headers=cashier_headers,
        json={"name": "Nope"},
    )
    assert update.status_code == 403

    delete = client.delete(
        f"/api/v1/products/{sample_products[0].id}", headers=cashier_headers
    )
    assert delete.status_code == 403


def test_cashier_never_sees_cost_price(
    client: TestClient, cashier_headers: dict[str, str], sample_products: list[Product]
) -> None:
    listed = client.get("/api/v1/products", headers=cashier_headers)
    assert listed.status_code == 200
    items = listed.json()["data"]["items"]
    assert items
    assert all("cost_price" not in item for item in items)

    detail = client.get(
        f"/api/v1/products/{sample_products[0].id}", headers=cashier_headers
    )
    assert detail.status_code == 200
    assert "cost_price" not in detail.json()["data"]


def test_admin_sees_cost_price(
    client: TestClient, admin_headers: dict[str, str], sample_products: list[Product]
) -> None:
    detail = client.get(
        f"/api/v1/products/{sample_products[0].id}", headers=admin_headers
    )

    assert detail.status_code == 200
    assert detail.json()["data"]["cost_price"] == "2.00"


def test_product_search_prioritizes_exact_sku_and_escapes_wildcards(
    client: TestClient,
    admin_headers: dict[str, str],
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    client.post(
        "/api/v1/products",
        headers=admin_headers,
        json=product_payload(name="100% Juice", sku="PERCENT-1", barcode="999999"),
    )

    by_sku = client.get(
        "/api/v1/products/search", headers=cashier_headers, params={"q": "MILK-1L"}
    )
    assert by_sku.status_code == 200
    results = by_sku.json()["data"]
    assert results[0]["sku"] == "MILK-1L"

    by_barcode = client.get(
        "/api/v1/products/search", headers=cashier_headers, params={"q": "222222"}
    )
    assert by_barcode.json()["data"][0]["sku"] == "BREAD-1"

    by_name = client.get(
        "/api/v1/products/search", headers=cashier_headers, params={"q": "milk"}
    )
    assert any(item["sku"] == "MILK-1L" for item in by_name.json()["data"])

    by_partial_sku = client.get(
        "/api/v1/products/search", headers=cashier_headers, params={"q": "ILK-1"}
    )
    assert [item["sku"] for item in by_partial_sku.json()["data"]] == ["MILK-1L"]

    by_partial_barcode = client.get(
        "/api/v1/products/search", headers=cashier_headers, params={"q": "111"}
    )
    assert [item["sku"] for item in by_partial_barcode.json()["data"]] == ["MILK-1L"]

    literal_percent = client.get(
        "/api/v1/products/search", headers=cashier_headers, params={"q": "%"}
    )
    assert literal_percent.status_code == 200
    assert [item["sku"] for item in literal_percent.json()["data"]] == ["PERCENT-1"]


def test_list_filters_sorting_and_pagination(
    client: TestClient,
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    filtered = client.get(
        "/api/v1/products", headers=cashier_headers, params={"category": "Dairy"}
    )
    assert filtered.status_code == 200
    assert [item["sku"] for item in filtered.json()["data"]["items"]] == ["MILK-1L"]

    searched = client.get(
        "/api/v1/products", headers=cashier_headers, params={"search": "bread"}
    )
    assert [item["sku"] for item in searched.json()["data"]["items"]] == ["BREAD-1"]

    sorted_desc = client.get(
        "/api/v1/products", headers=cashier_headers, params={"sort": "-selling_price"}
    )
    prices = [item["selling_price"] for item in sorted_desc.json()["data"]["items"]]
    assert prices == ["3.50", "2.00", "1.25"]

    page_two = client.get(
        "/api/v1/products",
        headers=cashier_headers,
        params={"page": 2, "page_size": 2},
    )
    data = page_two.json()["data"]
    assert data["total"] == 3
    assert len(data["items"]) == 1
    assert data["page"] == 2
    assert data["page_size"] == 2

    invalid_sort = client.get(
        "/api/v1/products", headers=cashier_headers, params={"sort": "cost_price"}
    )
    assert invalid_sort.status_code == 422


def test_update_product_and_manual_stock_correction(
    client: TestClient, admin_headers: dict[str, str], sample_products: list[Product]
) -> None:
    product = sample_products[0]

    response = client.patch(
        f"/api/v1/products/{product.id}",
        headers=admin_headers,
        json={"selling_price": "9.99", "stock_quantity": 3, "minimum_stock": 4},
    )

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["selling_price"] == "9.99"
    assert data["stock_quantity"] == 3
    assert data["minimum_stock"] == 4
    assert data["cost_price"] == "2.00"


def test_updating_to_a_duplicate_sku_is_rejected(
    client: TestClient, admin_headers: dict[str, str], sample_products: list[Product]
) -> None:
    response = client.patch(
        f"/api/v1/products/{sample_products[1].id}",
        headers=admin_headers,
        json={"sku": sample_products[0].sku},
    )

    assert response.status_code == 409
    assert response.json()["code"] == "DUPLICATE_SKU"


def test_disable_product_is_soft_and_removes_it_from_pos_search(
    client: TestClient,
    admin_headers: dict[str, str],
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    product = sample_products[0]

    disabled = client.delete(f"/api/v1/products/{product.id}", headers=admin_headers)
    assert disabled.status_code == 204
    assert disabled.content == b""

    detail = client.get(f"/api/v1/products/{product.id}", headers=admin_headers)
    assert detail.status_code == 200
    assert detail.json()["data"]["is_active"] is False

    search = client.get(
        "/api/v1/products/search", headers=cashier_headers, params={"q": "MILK"}
    )
    assert search.json()["data"] == []

    inactive_list = client.get(
        "/api/v1/products", headers=admin_headers, params={"is_active": False}
    )
    assert [item["sku"] for item in inactive_list.json()["data"]["items"]] == ["MILK-1L"]

    enabled = client.patch(
        f"/api/v1/products/{product.id}",
        headers=admin_headers,
        json={"is_active": True},
    )
    assert enabled.status_code == 200
    assert enabled.json()["data"]["is_active"] is True


def test_low_stock_is_admin_only_and_uses_the_threshold(
    client: TestClient,
    admin_headers: dict[str, str],
    cashier_headers: dict[str, str],
    sample_products: list[Product],
) -> None:
    response = client.get("/api/v1/products/low-stock", headers=admin_headers)

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["sku"] == "LOW-1"
    assert data["items"][0]["stock_quantity"] <= data["items"][0]["minimum_stock"]

    forbidden = client.get("/api/v1/products/low-stock", headers=cashier_headers)
    assert forbidden.status_code == 403


def test_unknown_product_returns_404(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.get(
        "/api/v1/products/00000000-0000-0000-0000-000000000000",
        headers=admin_headers,
    )

    assert response.status_code == 404
    assert response.json()["code"] == "PRODUCT_NOT_FOUND"


def test_products_require_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/products")

    assert response.status_code == 401
    assert response.json()["code"] == "TOKEN_INVALID"
