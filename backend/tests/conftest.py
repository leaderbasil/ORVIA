import os
from decimal import Decimal
from pathlib import Path

from fastapi.testclient import TestClient
from pytest import fixture
from sqlalchemy import create_engine, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_TEST_DATABASE_URL = (
    "postgresql+psycopg://postgres:postgres@localhost:5432/mini_grocery_pos_test"
)

test_database_url = os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)
database_name = test_database_url.rsplit("/", 1)[-1].split("?")[0]
if not database_name.endswith("_test"):
    raise RuntimeError(
        "Refusing to run the test suite against a database whose name does not "
        f"end with '_test' (got '{database_name}')"
    )

# Force the app (settings, engine, alembic env.py) onto the isolated test DB.
os.environ["DATABASE_URL"] = test_database_url
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault(
    "JWT_SECRET_KEY", "test-secret-key-for-pytest-only-0123456789abcdef"
)
os.environ.setdefault("FRONTEND_ORIGIN", "http://localhost:5173")

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.product import Product  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402


@fixture(scope="session")
def database_schema() -> None:
    """Reset the test schema and apply every Alembic migration once."""
    admin_engine = create_engine(test_database_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    admin_engine.dispose()

    alembic_config = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(alembic_config, "head")


@fixture
def db(database_schema: None) -> Session:
    """A session against a freshly truncated database."""
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE TABLE sale_items, sales, products, users "
                "RESTART IDENTITY CASCADE"
            )
        )
        connection.execute(text("ALTER SEQUENCE invoice_number_seq RESTART WITH 1"))

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@fixture
def client(database_schema: None) -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def _create_user(
    db: Session, *, email: str, role: UserRole, password: str, full_name: str
) -> User:
    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@fixture
def admin_user(db: Session) -> User:
    return _create_user(
        db,
        email="admin@example.com",
        full_name="Store Admin",
        role=UserRole.ADMIN,
        password="admin-password",
    )


@fixture
def cashier_user(db: Session) -> User:
    return _create_user(
        db,
        email="cashier@example.com",
        full_name="Front Cashier",
        role=UserRole.CASHIER,
        password="cashier-password",
    )


def _login(client: TestClient, email: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["access_token"]


@fixture
def admin_token(client: TestClient, admin_user: User) -> str:
    return _login(client, admin_user.email, "admin-password")


@fixture
def cashier_token(client: TestClient, cashier_user: User) -> str:
    return _login(client, cashier_user.email, "cashier-password")


@fixture
def admin_headers(admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}


@fixture
def cashier_headers(cashier_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {cashier_token}"}


@fixture
def sample_products(db: Session) -> list[Product]:
    products = [
        Product(
            name="Milk 1L",
            sku="MILK-1L",
            barcode="111111",
            category="Dairy",
            unit="piece",
            cost_price=Decimal("2.00"),
            selling_price=Decimal("3.50"),
            stock_quantity=20,
            minimum_stock=5,
        ),
        Product(
            name="Bread",
            sku="BREAD-1",
            barcode="222222",
            category="Bakery",
            unit="piece",
            cost_price=Decimal("0.80"),
            selling_price=Decimal("1.25"),
            stock_quantity=10,
            minimum_stock=2,
        ),
        Product(
            name="Low Stock Item",
            sku="LOW-1",
            barcode=None,
            category=None,
            unit="piece",
            cost_price=Decimal("1.00"),
            selling_price=Decimal("2.00"),
            stock_quantity=1,
            minimum_stock=3,
        ),
    ]
    db.add_all(products)
    db.commit()
    for product in products:
        db.refresh(product)
    return products
