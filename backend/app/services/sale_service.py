import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.exceptions import AppException
from app.dependencies import PaginationParams
from app.models.product import Product
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.user import User, UserRole
from app.schemas.sale import SaleCreate
from app.utils.money import round2
from app.utils.pagination import escape_like, paginate

MAX_DATE_RANGE_DAYS = 366


def _merge_item_quantities(payload: SaleCreate) -> dict[uuid.UUID, int]:
    """Merge duplicate product IDs while keeping the first-seen order."""
    quantities: dict[uuid.UUID, int] = {}
    for item in payload.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity
    return quantities


def _sale_options() -> tuple:
    return (selectinload(Sale.cashier), selectinload(Sale.items))


def _find_by_idempotency_key(db: Session, key: str) -> Sale | None:
    return db.scalar(
        select(Sale)
        .where(Sale.idempotency_key == key)
        .options(*_sale_options())
    )


def _replay_or_conflict(
    existing: Sale, current_user: User
) -> tuple[Sale, bool]:
    if existing.cashier_id != current_user.id:
        raise AppException(
            409,
            "IDEMPOTENCY_KEY_CONFLICT",
            "Idempotency key belongs to another user",
        )
    return existing, False


def _lock_products(
    db: Session, product_ids: list[uuid.UUID]
) -> dict[uuid.UUID, Product]:
    """Lock every requested product in id order to avoid deadlocks."""
    if not product_ids:
        return {}
    products = list(
        db.scalars(
            select(Product)
            .where(Product.id.in_(product_ids))
            .order_by(Product.id)
            .with_for_update()
        ).all()
    )
    return {product.id: product for product in products}


def _resolve_date_range(
    date_from: date | None, date_to: date | None
) -> tuple[datetime | None, datetime | None]:
    """Convert inclusive store-timezone dates into a UTC half-open interval."""
    if date_from is not None and date_to is not None:
        if date_from > date_to:
            raise AppException(400, "INVALID_DATE_RANGE", "from must be before to")
        if (date_to - date_from).days > MAX_DATE_RANGE_DAYS:
            raise AppException(
                400, "INVALID_DATE_RANGE", "Date range must not exceed 366 days"
            )

    timezone_info = ZoneInfo(settings.REPORT_TIMEZONE)
    start = None
    end = None
    if date_from is not None:
        start = datetime.combine(date_from, time.min, tzinfo=timezone_info).astimezone(
            timezone.utc
        )
    if date_to is not None:
        end = datetime.combine(
            date_to + timedelta(days=1), time.min, tzinfo=timezone_info
        ).astimezone(timezone.utc)
    return start, end


def list_sales(
    db: Session,
    pagination: PaginationParams,
    current_user: User,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    payment_method: str | None = None,
    invoice_number: str | None = None,
    cashier_id: uuid.UUID | None = None,
) -> tuple[list[Sale], int]:
    start, end = _resolve_date_range(date_from, date_to)

    stmt = select(Sale).options(*_sale_options())

    # Cashiers only ever see their own invoices; admin may filter by cashier.
    if current_user.role != UserRole.ADMIN:
        stmt = stmt.where(Sale.cashier_id == current_user.id)
    elif cashier_id is not None:
        stmt = stmt.where(Sale.cashier_id == cashier_id)

    if start is not None:
        stmt = stmt.where(Sale.created_at >= start)
    if end is not None:
        stmt = stmt.where(Sale.created_at < end)
    if status is not None:
        stmt = stmt.where(Sale.status == status)
    if payment_method is not None:
        stmt = stmt.where(Sale.payment_method == payment_method)
    if invoice_number:
        pattern = f"%{escape_like(invoice_number.strip())}%"
        stmt = stmt.where(Sale.invoice_number.ilike(pattern))

    stmt = stmt.order_by(Sale.created_at.desc(), Sale.id.desc())
    return paginate(db, stmt, pagination)


def get_sale(db: Session, sale_id: uuid.UUID, current_user: User) -> Sale:
    sale = db.scalar(
        select(Sale).where(Sale.id == sale_id).options(*_sale_options())
    )
    if sale is None or (
        current_user.role != UserRole.ADMIN and sale.cashier_id != current_user.id
    ):
        # Cashiers receive 404 for other cashiers' invoices (no existence leak).
        raise AppException(404, "SALE_NOT_FOUND", "Sale not found")
    return sale


def create_sale(
    db: Session,
    payload: SaleCreate,
    idempotency_key: str,
    current_user: User,
) -> tuple[Sale, bool]:
    """Create a sale, deduct stock and commit once.

    Returns (sale, created). A replay of the same key by the same user returns
    the original invoice with created=False and does not touch stock again.
    """
    existing = _find_by_idempotency_key(db, idempotency_key)
    if existing is not None:
        return _replay_or_conflict(existing, current_user)

    if not payload.items:
        raise AppException(422, "EMPTY_CART", "Sale must contain at least one item")

    quantities = _merge_item_quantities(payload)
    product_ids = sorted(quantities)
    products = _lock_products(db, product_ids)

    missing = set(product_ids) - set(products)
    if missing:
        raise AppException(404, "PRODUCT_NOT_FOUND", "Product not found")

    # Validate everything before mutating stock or building the invoice.
    line_data: list[tuple[Product, int, Decimal, Decimal]] = []
    subtotal = Decimal("0.00")
    for product_id in product_ids:
        product = products[product_id]
        quantity = quantities[product_id]
        if not product.is_active:
            raise AppException(
                409,
                "PRODUCT_INACTIVE",
                "Product is disabled",
                meta={"product_id": str(product.id), "product_name": product.name},
            )
        if product.stock_quantity < quantity:
            raise AppException(
                409,
                "INSUFFICIENT_STOCK",
                "Insufficient stock",
                meta={
                    "product_id": str(product.id),
                    "product_name": product.name,
                    "available": product.stock_quantity,
                    "requested": quantity,
                },
            )

        unit_price = round2(product.selling_price)
        line_total = round2(unit_price * quantity)
        subtotal += line_total
        line_data.append((product, quantity, unit_price, line_total))

    subtotal = round2(subtotal)
    discount = round2(payload.discount_amount)
    if discount > subtotal:
        raise AppException(
            400,
            "INVALID_DISCOUNT",
            "Discount cannot exceed the subtotal",
        )

    tax = round2((subtotal - discount) * settings.TAX_RATE)
    total = round2(subtotal - discount + tax)

    sale_items: list[SaleItem] = []
    for product, quantity, unit_price, line_total in line_data:
        product.stock_quantity -= quantity
        sale_items.append(
            SaleItem(
                product_id=product.id,
                product_name=product.name,
                sku=product.sku,
                quantity=quantity,
                unit_price=unit_price,
                unit_cost=round2(product.cost_price),
                line_total=line_total,
            )
        )

    sequence = int(
        db.execute(text("SELECT nextval('invoice_number_seq')")).scalar_one()
    )
    year = datetime.now(timezone.utc).year
    sale = Sale(
        invoice_number=f"INV-{year}-{sequence:06d}",
        cashier=current_user,
        subtotal=subtotal,
        discount_amount=discount,
        tax_amount=tax,
        total_amount=total,
        payment_method=payload.payment_method,
        status="COMPLETED",
        idempotency_key=idempotency_key,
        items=sale_items,
    )
    db.add(sale)
    try:
        db.commit()
    except IntegrityError:
        # A concurrent request may have committed the same idempotency key.
        db.rollback()
        existing = _find_by_idempotency_key(db, idempotency_key)
        if existing is not None:
            return _replay_or_conflict(existing, current_user)
        raise

    db.refresh(sale)
    return sale, True


def cancel_sale(db: Session, sale_id: uuid.UUID) -> Sale:
    """Cancel a completed invoice once and restore its stock."""
    sale = db.scalar(
        select(Sale)
        .where(Sale.id == sale_id)
        .options(*_sale_options())
        .with_for_update()
    )
    if sale is None:
        raise AppException(404, "SALE_NOT_FOUND", "Sale not found")
    if sale.status == "CANCELLED":
        raise AppException(
            409, "SALE_ALREADY_CANCELLED", "Sale is already cancelled"
        )

    product_ids = sorted({item.product_id for item in sale.items})
    products = _lock_products(db, product_ids)
    for item in sale.items:
        product = products.get(item.product_id)
        if product is None:
            # The FK prevents this; fail loudly instead of silently losing stock.
            raise AppException(404, "PRODUCT_NOT_FOUND", "Product not found")
        # Restock even when the product has since been disabled.
        product.stock_quantity += item.quantity

    sale.status = "CANCELLED"
    db.commit()
    db.refresh(sale)
    return sale
