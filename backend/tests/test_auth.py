from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User, UserRole


def test_login_returns_token_and_user(client: TestClient, admin_user: User) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "ADMIN@example.com", "password": "admin-password"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["message"]
    data = body["data"]
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 1800
    assert data["access_token"]
    assert data["user"]["email"] == "admin@example.com"
    assert data["user"]["role"] == "ADMIN"
    assert "password_hash" not in data["user"]


def test_me_returns_the_current_user(
    client: TestClient, admin_headers: dict[str, str], admin_user: User
) -> None:
    response = client.get("/api/v1/auth/me", headers=admin_headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == str(admin_user.id)
    assert data["full_name"] == "Store Admin"
    assert "password_hash" not in data


def test_login_rejects_wrong_password(client: TestClient, admin_user: User) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401
    body = response.json()
    assert body["code"] == "INVALID_CREDENTIALS"


def test_login_does_not_reveal_unknown_email(client: TestClient, db: Session) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "whatever-password"},
    )

    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_CREDENTIALS"


def test_inactive_user_cannot_log_in(client: TestClient, db: Session) -> None:
    db.add(
        User(
            full_name="Disabled Cashier",
            email="disabled@example.com",
            password_hash=hash_password("disabled-password"),
            role=UserRole.CASHIER,
            is_active=False,
        )
    )
    db.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "disabled@example.com", "password": "disabled-password"},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "USER_INACTIVE"


def test_protected_route_requires_a_token(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["code"] == "TOKEN_INVALID"


def test_invalid_token_is_rejected(client: TestClient) -> None:
    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )

    assert response.status_code == 401
    assert response.json()["code"] == "TOKEN_INVALID"


def test_disabling_a_user_invalidates_their_existing_token(
    client: TestClient, db: Session, cashier_token: str, cashier_user: User
) -> None:
    cashier_user.is_active = False
    db.commit()

    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {cashier_token}"}
    )

    assert response.status_code == 401
    assert response.json()["code"] == "TOKEN_INVALID"


def test_login_validation_uses_the_error_envelope(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login", json={"email": "not-an-email", "password": ""}
    )

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert body["detail"] == "Validation error"
    assert body["errors"]
