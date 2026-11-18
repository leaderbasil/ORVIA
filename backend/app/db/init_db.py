"""Create the first ADMIN account from environment variables (idempotent).

Usage (from backend/):
    python -m app.db.init_db
"""

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User, UserRole


def seed_first_admin() -> None:
    email = settings.FIRST_ADMIN_EMAIL.strip().lower()

    if len(settings.FIRST_ADMIN_PASSWORD) < 8:
        raise SystemExit("FIRST_ADMIN_PASSWORD must be at least 8 characters long")
    if len(settings.FIRST_ADMIN_PASSWORD.encode("utf-8")) > 72:
        raise SystemExit("FIRST_ADMIN_PASSWORD must be at most 72 bytes (UTF-8)")

    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == email))
        if existing is not None:
            print(f"Admin account already exists: {email}")
            return

        admin = User(
            full_name=settings.FIRST_ADMIN_FULL_NAME.strip(),
            email=email,
            password_hash=hash_password(settings.FIRST_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"First admin created: {email}")


if __name__ == "__main__":
    seed_first_admin()
