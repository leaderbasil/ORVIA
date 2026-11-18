"""Seed an isolated, repeatable demo dataset.

Usage (from backend/):

    python -m scripts.seed_demo

Optional environment variables:

    DEMO_CASHIER_EMAIL        default: cashier@example.com
    DEMO_CASHIER_PASSWORD     when set and the account is missing, create it
    DEMO_CASHIER_FULL_NAME    default: Demo Cashier

The script only touches its own ``DEMO-*`` product SKUs and sales whose
idempotency keys start with ``demo-seed-``. Running it twice is safe: existing
demo sales are skipped. Create the first admin before running it:

    python -m app.db.init_db
"""

import os
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.product import Product
from app.models.sale import Sale
from app.models.user import User, UserRole
from app.schemas.sale import SaleCreate, SaleItemCreate
from app.services import sale_service

DEMO_PREFIX = "DEMO-"
DEMO_KEY_PREFIX = "demo-seed-sale-"
DEMO_SALE_DAYS = 30


class ProductSpec:
    def __init__(
        self,
        sku: str,
        name: str,
        barcode: str,
        category: str,
        unit: str,
        cost_price: str,
        selling_price: str,
        stock: int,
        minimum: int,
        *,
        restock_floor: int | None = None,
    ) -> None:
        self.sku = sku
        self.name = name
        self.barcode = barcode
        self.category = category
        self.unit = unit
        self.cost_price = Decimal(cost_price)
        self.selling_price = Decimal(selling_price)
        self.stock = stock
        self.minimum = minimum
        self.restock_floor = restock_floor


DEMO_PRODUCTS = [
    ProductSpec(
        "DEMO-MILK-1L",
        "حليب طازج 1 لتر",
        "200000000001",
        "ألبان",
        "piece",
        "2.00",
        "3.50",
        50,
        6,
        restock_floor=20,
    ),
    ProductSpec(
        "DEMO-BREAD",
        "خبز عربي",
        "200000000002",
        "مخبوزات",
        "piece",
        "0.80",
        "1.25",
        60,
        10,
        restock_floor=20,
    ),
    ProductSpec(
        "DEMO-EGGS-12",
        "بيض 12 حبة",
        "200000000003",
        "ألبان",
        "box",
        "5.50",
        "7.00",
        40,
        5,
        restock_floor=15,
    ),
    ProductSpec(
        "DEMO-RICE-5KG",
        "أرز بسمتي 5 كجم",
        "200000000004",
        "مواد غذائية",
        "bag",
        "18.00",
        "24.00",
        24,
        3,
        restock_floor=10,
    ),
    ProductSpec(
        "DEMO-OIL-1L",
        "زيت زيتون 1 لتر",
        "200000000005",
        "زيوت",
        "bottle",
        "22.00",
        "29.00",
        20,
        2,
        restock_floor=8,
    ),
    ProductSpec(
        "DEMO-WATER-15L",
        "ماء معدني 1.5 لتر",
        "200000000006",
        "مشروبات",
        "bottle",
        "0.30",
        "0.50",
        100,
        12,
        restock_floor=40,
    ),
    ProductSpec(
        "DEMO-TEA-250",
        "شاي أسود 250 جم",
        "200000000007",
        "مشروبات",
        "pack",
        "6.50",
        "9.00",
        2,
        5,
    ),
    ProductSpec(
        "DEMO-HONEY-500",
        "عسل طبيعي 500 جم",
        "200000000008",
        "مواد غذائية",
        "jar",
        "15.00",
        "21.00",
        0,
        2,
    ),
]


def _find_or_create_user(db: Session) -> User:
    admin = db.scalar(
        select(User)
        .where(User.role == UserRole.ADMIN, User.is_active.is_(True))
        .order_by(User.created_at.asc())
    )
    if admin is None:
        raise SystemExit("No active admin found. Run `python -m app.db.init_db` first.")

    email = settings.DEMO_CASHIER_EMAIL.strip().lower()
    full_name = settings.DEMO_CASHIER_FULL_NAME.strip()
    password = settings.DEMO_CASHIER_PASSWORD

    cashier = db.scalar(select(User).where(User.email == email))
    if cashier is not None and cashier.is_active:
        print(f"Using existing seller: {cashier.email} ({cashier.role.value})")
        return cashier

    if cashier is not None and not cashier.is_active:
        print(f"Seller {email} is inactive; using admin {admin.email} instead.")
        return admin

    if not password:
        print(
            "DEMO_CASHIER_PASSWORD is not set; using the admin account for demo sales."
        )
        return admin

    if len(password) < 8:
        raise SystemExit("DEMO_CASHIER_PASSWORD must be at least 8 characters long")
    if len(password.encode("utf-8")) > 72:
        raise SystemExit("DEMO_CASHIER_PASSWORD must be at most 72 bytes (UTF-8)")

    cashier = User(
        full_name=full_name or "Demo Cashier",
        email=email,
        password_hash=hash_password(password),
        role=UserRole.CASHIER,
        is_active=True,
    )
    db.add(cashier)
    db.commit()
    print(f"Created demo cashier: {cashier.email}")
    return cashier


def _seed_products(db: Session) -> dict[str, Product]:
    products: dict[str, Product] = {}
    created_count = 0
    updated_count = 0

    for spec in DEMO_PRODUCTS:
        product = db.scalar(select(Product).where(Product.sku == spec.sku))
        if product is None:
            product = Product(
                name=spec.name,
                sku=spec.sku,
                barcode=spec.barcode,
                category=spec.category,
                unit=spec.unit,
                cost_price=spec.cost_price,
                selling_price=spec.selling_price,
                stock_quantity=spec.stock,
                minimum_stock=spec.minimum,
                is_active=True,
            )
            db.add(product)
            created_count += 1
        else:
            product.name = spec.name
            product.category = spec.category
            product.unit = spec.unit
            product.cost_price = spec.cost_price
            product.selling_price = spec.selling_price
            product.minimum_stock = spec.minimum
            product.is_active = True
            if (
                spec.restock_floor is not None
                and product.stock_quantity < spec.restock_floor
            ):
                product.stock_quantity = spec.stock
            updated_count += 1
        products[spec.sku] = product

    db.commit()
    print(f"Demo products: {created_count} created, {updated_count} updated.")
    return products


def _sale_day(today: date, index: int) -> date:
    return today - timedelta(days=DEMO_SALE_DAYS - 1 - index)


def _sale_timestamp(store_tz: ZoneInfo, today: date, index: int) -> datetime:
    if index == DEMO_SALE_DAYS - 1:
        local_now = datetime.now(store_tz) - timedelta(minutes=2)
        return local_now.astimezone(timezone.utc)
    day = _sale_day(today, index)
    local = datetime.combine(
        day,
        time(hour=9 + (index % 9), minute=(index * 7) % 60),
        tzinfo=store_tz,
    )
    return local.astimezone(timezone.utc)


def _sale_items(index: int, products: dict[str, Product]) -> list[SaleItemCreate]:
    patterns = [
        [("DEMO-MILK-1L", 2), ("DEMO-BREAD", 2), ("DEMO-EGGS-12", 1)],
        [("DEMO-RICE-5KG", 1), ("DEMO-OIL-1L", 1)],
        [("DEMO-WATER-15L", 6), ("DEMO-BREAD", 1)],
        [("DEMO-EGGS-12", 2), ("DEMO-BREAD", 2), ("DEMO-WATER-15L", 3)],
        [("DEMO-MILK-1L", 1), ("DEMO-WATER-15L", 4)],
    ]
    return [
        SaleItemCreate(product_id=products[sku].id, quantity=quantity)
        for sku, quantity in patterns[index % len(patterns)]
    ]


def _seed_sales(
    db: Session, seller: User, products: dict[str, Product], today: date
) -> None:
    store_tz = ZoneInfo(settings.REPORT_TIMEZONE)
    created_count = 0
    skipped_count = 0
    cancelled_count = 0

    for index in range(DEMO_SALE_DAYS):
        key = f"{DEMO_KEY_PREFIX}{index + 1:03d}"
        existing = db.scalar(select(Sale).where(Sale.idempotency_key == key))
        if existing is not None:
            skipped_count += 1
            continue

        items = _sale_items(index, products)
        discount = Decimal("0.50") if index % 7 == 3 else Decimal("0.00")

        payload = SaleCreate(
            items=items,
            payment_method="CARD" if index % 3 else "CASH",
            discount_amount=discount,
        )

        try:
            sale, created = sale_service.create_sale(db, payload, key, seller)
        except AppException as exc:
            print(f"Skipped demo sale {key}: {exc.code} - {exc.detail}")
            db.rollback()
            continue

        if not created:
            skipped_count += 1
            continue

        sale.created_at = _sale_timestamp(store_tz, today, index)
        db.commit()
        created_count += 1

        if index in (9, 19, 27):
            sale_service.cancel_sale(db, sale.id)
            cancelled_count += 1

    print(
        f"Demo sales: {created_count} created, {skipped_count} skipped, "
        f"{cancelled_count} cancelled."
    )


def seed_demo_data() -> None:
    today = datetime.now(timezone.utc).astimezone(
        ZoneInfo(settings.REPORT_TIMEZONE)
    ).date()

    with SessionLocal() as db:
        seller = _find_or_create_user(db)
        products = _seed_products(db)
        _seed_sales(db, seller, products, today)

    print("Demo data ready. Open the dashboard or reports page as an admin.")


if __name__ == "__main__":
    seed_demo_data()
