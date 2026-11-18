from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User


def test_admin_lists_users_with_pagination(
    client: TestClient,
    admin_headers: dict[str, str],
    admin_user: User,
    cashier_user: User,
) -> None:
    response = client.get("/api/v1/users", headers=admin_headers)

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["total"] == 2
    assert data["page"] == 1
    assert data["page_size"] == 20
    assert len(data["items"]) == 2
    assert all("password_hash" not in item for item in data["items"])


def test_admin_can_filter_users(
    client: TestClient,
    admin_headers: dict[str, str],
    admin_user: User,
    cashier_user: User,
) -> None:
    by_search = client.get(
        "/api/v1/users", headers=admin_headers, params={"search": "cashier"}
    )
    assert by_search.status_code == 200
    assert by_search.json()["data"]["total"] == 1

    by_role = client.get(
        "/api/v1/users", headers=admin_headers, params={"role": "ADMIN"}
    )
    assert by_role.status_code == 200
    roles = {item["role"] for item in by_role.json()["data"]["items"]}
    assert roles == {"ADMIN"}

    by_status = client.get(
        "/api/v1/users", headers=admin_headers, params={"is_active": False}
    )
    assert by_status.status_code == 200
    assert by_status.json()["data"]["total"] == 0


def test_cashier_cannot_access_user_management(
    client: TestClient, cashier_headers: dict[str, str]
) -> None:
    forbidden = client.get("/api/v1/users", headers=cashier_headers)
    assert forbidden.status_code == 403
    assert forbidden.json()["code"] == "FORBIDDEN"

    create = client.post(
        "/api/v1/users",
        headers=cashier_headers,
        json={
            "full_name": "Nope",
            "email": "nope@example.com",
            "password": "long-enough-password",
            "role": "CASHIER",
        },
    )
    assert create.status_code == 403


def test_admin_creates_a_user_who_can_log_in(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "full_name": "  New Cashier  ",
            "email": "NEW.Cashier@Example.com",
            "password": "strong-password",
            "role": "CASHIER",
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()["data"]
    assert data["full_name"] == "New Cashier"
    assert data["email"] == "new.cashier@example.com"
    assert data["is_active"] is True
    assert "password_hash" not in data

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "new.cashier@example.com", "password": "strong-password"},
    )
    assert login.status_code == 200


def test_duplicate_email_is_rejected_case_insensitively(
    client: TestClient, admin_headers: dict[str, str], admin_user: User
) -> None:
    response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "full_name": "Copycat",
            "email": "ADMIN@EXAMPLE.COM",
            "password": "strong-password",
            "role": "CASHIER",
        },
    )

    assert response.status_code == 409
    assert response.json()["code"] == "DUPLICATE_EMAIL"


def test_user_validation_rules(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    short_password = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "full_name": "Short",
            "email": "short@example.com",
            "password": "short",
            "role": "CASHIER",
        },
    )
    assert short_password.status_code == 422
    assert short_password.json()["code"] == "VALIDATION_ERROR"

    extra_field = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "full_name": "Extra",
            "email": "extra@example.com",
            "password": "strong-password",
            "role": "CASHIER",
            "is_active": False,
        },
    )
    assert extra_field.status_code == 422

    invalid_role = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "full_name": "Invalid",
            "email": "invalid@example.com",
            "password": "strong-password",
            "role": "OWNER",
        },
    )
    assert invalid_role.status_code == 422


def test_admin_updates_name_and_role(
    client: TestClient,
    admin_headers: dict[str, str],
    cashier_user: User,
) -> None:
    response = client.patch(
        f"/api/v1/users/{cashier_user.id}",
        headers=admin_headers,
        json={"full_name": "Senior Cashier", "role": "ADMIN"},
    )

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["full_name"] == "Senior Cashier"
    assert data["role"] == "ADMIN"


def test_admin_cannot_demote_or_disable_self(
    client: TestClient, admin_headers: dict[str, str], admin_user: User
) -> None:
    demote = client.patch(
        f"/api/v1/users/{admin_user.id}",
        headers=admin_headers,
        json={"role": "CASHIER"},
    )
    assert demote.status_code == 409
    assert demote.json()["code"] == "CANNOT_MODIFY_SELF"

    disable = client.patch(
        f"/api/v1/users/{admin_user.id}/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert disable.status_code == 409
    assert disable.json()["code"] == "CANNOT_MODIFY_SELF"


def test_admin_can_disable_and_reenable_a_cashier(
    client: TestClient,
    admin_headers: dict[str, str],
    cashier_user: User,
) -> None:
    disabled = client.patch(
        f"/api/v1/users/{cashier_user.id}/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert disabled.status_code == 200
    assert disabled.json()["data"]["is_active"] is False

    login = client.post(
        "/api/v1/auth/login",
        json={"email": cashier_user.email, "password": "cashier-password"},
    )
    assert login.status_code == 403
    assert login.json()["code"] == "USER_INACTIVE"

    enabled = client.patch(
        f"/api/v1/users/{cashier_user.id}/status",
        headers=admin_headers,
        json={"is_active": True},
    )
    assert enabled.status_code == 200
    assert enabled.json()["data"]["is_active"] is True


def test_unknown_user_returns_404(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.patch(
        "/api/v1/users/00000000-0000-0000-0000-000000000000",
        headers=admin_headers,
        json={"full_name": "Ghost"},
    )

    assert response.status_code == 404
    assert response.json()["code"] == "USER_NOT_FOUND"
