"""SQLAlchemy models. Importing this package registers all tables on Base.metadata."""

from app.db.base import Base
from app.models.product import Product
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.user import User, UserRole

__all__ = ["Base", "Product", "Sale", "SaleItem", "User", "UserRole"]
