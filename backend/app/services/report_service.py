from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppException
from app.models.product import Product
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.utils.money import money_str, round2

MAX_DATE_RANGE_DAYS = 366
DEFAULT_REPORT_DAYS = 30
LOW_STOCK_ITEM_LIMIT = 50


def _as_decimal(value: object) -> Decimal:
    if value is None:
        return Decimal("0.00")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def resolve_report_range(
    date_from: date | None,
    date_to: date | None,
    *,
    default_days: int = DEFAULT_REPORT_DAYS,
) -> tuple[date, date, datetime, datetime]:
    """Return inclusive store-timezone dates plus a UTC half-open interval."""
    timezone_info = ZoneInfo(settings.REPORT_TIMEZONE)
    today = datetime.now(timezone.utc).astimezone(timezone_info).date()

    if date_to is None:
        date_to = today
    if date_from is None:
        date_from = date_to - timedelta(days=default_days - 1)

    if date_from > date_to:
        raise AppException(400, "INVALID_DATE_RANGE", "from must be before to")
    if (date_to - date_from).days + 1 > MAX_DATE_RANGE_DAYS:
        raise AppException(
            400, "INVALID_DATE_RANGE", "Date range must not exceed 366 days"
        )

    start = datetime.combine(date_from, time.min, tzinfo=timezone_info).astimezone(
        timezone.utc
    )
    end = datetime.combine(
        date_to + timedelta(days=1), time.min, tzinfo=timezone_info
    ).astimezone(timezone.utc)
    return date_from, date_to, start, end


def _completed_sale_conditions(
    start: datetime, end: datetime
) -> tuple[object, object, object]:
    return (
        Sale.status == "COMPLETED",
        Sale.created_at >= start,
        Sale.created_at < end,
    )


def _sales_summary(
    db: Session, start: datetime, end: datetime
) -> dict[str, object]:
    row = db.execute(
        select(
            func.coalesce(func.sum(Sale.total_amount), 0),
            func.count(Sale.id),
            func.coalesce(func.sum(Sale.discount_amount), 0),
        ).where(*_completed_sale_conditions(start, end))
    ).one()

    sales_total = round2(_as_decimal(row[0]))
    invoice_count = int(row[1])
    total_discount = round2(_as_decimal(row[2]))
    average_invoice = (
        round2(sales_total / invoice_count) if invoice_count else Decimal("0.00")
    )
    return {
        "sales_total": sales_total,
        "invoice_count": invoice_count,
        "average_invoice": average_invoice,
        "total_discount": total_discount,
    }


def _gross_profit(db: Session, start: datetime, end: datetime) -> Decimal:
    value = db.scalar(
        select(
            func.coalesce(
                func.sum(
                    (SaleItem.unit_price - SaleItem.unit_cost) * SaleItem.quantity
                ),
                0,
            )
        )
        .select_from(SaleItem)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(*_completed_sale_conditions(start, end))
    )
    return round2(_as_decimal(value))


def _top_products(
    db: Session,
    start: datetime,
    end: datetime,
    limit: int,
) -> list[dict]:
    rows = db.execute(
        select(
            SaleItem.product_id,
            SaleItem.product_name,
            SaleItem.sku,
            func.sum(SaleItem.quantity).label("quantity_sold"),
            func.sum(SaleItem.line_total).label("revenue"),
        )
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(*_completed_sale_conditions(start, end))
        .group_by(SaleItem.product_id, SaleItem.product_name, SaleItem.sku)
        .order_by(
            func.sum(SaleItem.quantity).desc(),
            func.sum(SaleItem.line_total).desc(),
            SaleItem.product_name.asc(),
        )
        .limit(limit)
    ).all()

    return [
        {
            "product_id": str(row.product_id),
            "product_name": row.product_name,
            "sku": row.sku,
            "quantity_sold": int(row.quantity_sold),
            "revenue": money_str(round2(_as_decimal(row.revenue))),
        }
        for row in rows
    ]


def _day_keys(date_from: date, date_to: date) -> list[str]:
    keys: list[str] = []
    current = date_from
    while current <= date_to:
        keys.append(current.isoformat())
        current += timedelta(days=1)
    return keys


def _month_keys(date_from: date, date_to: date) -> list[str]:
    keys: list[str] = []
    year, month = date_from.year, date_from.month
    end_year, end_month = date_to.year, date_to.month
    while (year, month) <= (end_year, end_month):
        keys.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            month = 1
            year += 1
    return keys


def _sales_series(
    db: Session,
    date_from: date,
    date_to: date,
    start: datetime,
    end: datetime,
    group_by: str,
) -> list[dict]:
    bucket = func.date_trunc(
        group_by, func.timezone(settings.REPORT_TIMEZONE, Sale.created_at)
    )
    rows = db.execute(
        select(
            bucket.label("bucket"),
            func.coalesce(func.sum(Sale.total_amount), 0).label("sales_total"),
            func.count(Sale.id).label("invoice_count"),
        )
        .where(*_completed_sale_conditions(start, end))
        .group_by(bucket)
        .order_by(bucket)
    ).all()

    if group_by == "month":
        keys = _month_keys(date_from, date_to)
        values = {
            row.bucket.strftime("%Y-%m"): (
                round2(_as_decimal(row.sales_total)),
                int(row.invoice_count),
            )
            for row in rows
        }
    else:
        keys = _day_keys(date_from, date_to)
        values = {
            row.bucket.date().isoformat(): (
                round2(_as_decimal(row.sales_total)),
                int(row.invoice_count),
            )
            for row in rows
        }

    return [
        {
            "period": key,
            "sales_total": money_str(values.get(key, (Decimal("0.00"), 0))[0]),
            "invoice_count": values.get(key, (Decimal("0.00"), 0))[1],
        }
        for key in keys
    ]


def dashboard(db: Session) -> dict:
    timezone_info = ZoneInfo(settings.REPORT_TIMEZONE)
    today = datetime.now(timezone.utc).astimezone(timezone_info).date()
    period_from = today - timedelta(days=DEFAULT_REPORT_DAYS - 1)

    _, _, today_start, today_end = resolve_report_range(today, today)
    _, _, period_start, period_end = resolve_report_range(period_from, today)

    today_summary = _sales_summary(db, today_start, today_end)
    period_summary = _sales_summary(db, period_start, period_end)

    low_stock_count = (
        db.scalar(
            select(func.count())
            .select_from(Product)
            .where(
                Product.is_active.is_(True),
                Product.stock_quantity <= Product.minimum_stock,
            )
        )
        or 0
    )

    return {
        "today": {
            "sales_total": money_str(today_summary["sales_total"]),
            "invoice_count": today_summary["invoice_count"],
        },
        "period": {
            "from": period_from.isoformat(),
            "to": today.isoformat(),
            "sales_total": money_str(period_summary["sales_total"]),
            "invoice_count": period_summary["invoice_count"],
            "average_invoice": money_str(period_summary["average_invoice"]),
            "gross_profit": money_str(_gross_profit(db, period_start, period_end)),
        },
        "low_stock_count": int(low_stock_count),
        "top_products": _top_products(db, period_start, period_end, 5),
        "daily_sales": _sales_series(
            db, period_from, today, period_start, period_end, "day"
        ),
    }


def sales_report(
    db: Session, date_from: date | None, date_to: date | None, group_by: str
) -> dict:
    range_from, range_to, start, end = resolve_report_range(date_from, date_to)
    summary = _sales_summary(db, start, end)

    return {
        "from": range_from.isoformat(),
        "to": range_to.isoformat(),
        "group_by": group_by,
        "summary": {
            "sales_total": money_str(summary["sales_total"]),
            "invoice_count": summary["invoice_count"],
            "average_invoice": money_str(summary["average_invoice"]),
            "total_discount": money_str(summary["total_discount"]),
        },
        "series": _sales_series(db, range_from, range_to, start, end, group_by),
    }


def top_products_report(
    db: Session, date_from: date | None, date_to: date | None, limit: int
) -> list[dict]:
    _, _, start, end = resolve_report_range(date_from, date_to)
    return _top_products(db, start, end, limit)


def inventory_report(db: Session) -> dict:
    active_filter = Product.is_active.is_(True)
    total_products = db.scalar(select(func.count()).select_from(Product)) or 0
    active_products = (
        db.scalar(
            select(func.count()).select_from(Product).where(active_filter)
        )
        or 0
    )
    out_of_stock = (
        db.scalar(
            select(func.count())
            .select_from(Product)
            .where(active_filter, Product.stock_quantity == 0)
        )
        or 0
    )
    low_stock = (
        db.scalar(
            select(func.count())
            .select_from(Product)
            .where(
                active_filter,
                Product.stock_quantity <= Product.minimum_stock,
            )
        )
        or 0
    )
    stock_value = db.scalar(
        select(
            func.coalesce(
                func.sum(Product.cost_price * Product.stock_quantity), 0
            )
        ).where(active_filter)
    )

    low_stock_products = list(
        db.scalars(
            select(Product)
            .where(
                active_filter,
                Product.stock_quantity <= Product.minimum_stock,
            )
            .order_by(Product.stock_quantity.asc(), Product.name.asc())
            .limit(LOW_STOCK_ITEM_LIMIT)
        ).all()
    )

    return {
        "total_products": int(total_products),
        "active_products": int(active_products),
        "out_of_stock": int(out_of_stock),
        "low_stock": int(low_stock),
        "stock_value_at_cost": money_str(round2(_as_decimal(stock_value))),
        "low_stock_items": [
            {
                "product_id": str(product.id),
                "name": product.name,
                "sku": product.sku,
                "category": product.category,
                "stock_quantity": product.stock_quantity,
                "minimum_stock": product.minimum_stock,
                "value_at_cost": money_str(
                    round2(product.cost_price * product.stock_quantity)
                ),
            }
            for product in low_stock_products
        ],
    }
