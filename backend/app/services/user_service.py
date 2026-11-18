import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.core.security import hash_password
from app.dependencies import PaginationParams
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.utils.pagination import escape_like, paginate


def _get_user_or_404(db: Session, user_id: uuid.UUID) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise AppException(404, "USER_NOT_FOUND", "User not found")
    return user


def _active_admin_count(db: Session) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.role == UserRole.ADMIN, User.is_active.is_(True))
        )
        or 0
    )


def list_users(
    db: Session,
    pagination: PaginationParams,
    *,
    search: str | None = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
) -> tuple[list[User], int]:
    stmt = select(User)
    if search:
        pattern = f"%{escape_like(search.strip())}%"
        stmt = stmt.where(
            or_(User.full_name.ilike(pattern), User.email.ilike(pattern))
        )
    if role is not None:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))

    stmt = stmt.order_by(User.created_at.desc(), User.id)
    return paginate(db, stmt, pagination)


def create_user(db: Session, payload: UserCreate) -> User:
    email = payload.email
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise AppException(409, "DUPLICATE_EMAIL", "Email already registered")

    user = User(
        full_name=payload.full_name,
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise AppException(409, "DUPLICATE_EMAIL", "Email already registered") from exc

    db.refresh(user)
    return user


def update_user(
    db: Session, user_id: uuid.UUID, payload: UserUpdate, current_user: User
) -> User:
    target = _get_user_or_404(db, user_id)
    data = payload.model_dump(exclude_unset=True)

    new_role = data.get("role")
    if new_role is not None and new_role != target.role:
        if target.id == current_user.id:
            raise AppException(
                409, "CANNOT_MODIFY_SELF", "You cannot change your own role"
            )
        if (
            target.role == UserRole.ADMIN
            and target.is_active
            and _active_admin_count(db) <= 1
        ):
            raise AppException(409, "LAST_ADMIN", "Cannot demote the last active admin")
        target.role = new_role

    if data.get("full_name") is not None:
        target.full_name = data["full_name"]

    db.commit()
    db.refresh(target)
    return target


def update_user_status(
    db: Session, user_id: uuid.UUID, is_active: bool, current_user: User
) -> User:
    target = _get_user_or_404(db, user_id)

    if target.id == current_user.id and not is_active:
        raise AppException(409, "CANNOT_MODIFY_SELF", "You cannot disable yourself")

    if (
        not is_active
        and target.role == UserRole.ADMIN
        and target.is_active
        and _active_admin_count(db) <= 1
    ):
        raise AppException(409, "LAST_ADMIN", "Cannot disable the last active admin")

    target.is_active = is_active
    db.commit()
    db.refresh(target)
    return target
