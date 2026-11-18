from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest


@dataclass(frozen=True)
class AuthResult:
    user: User
    access_token: str
    expires_in: int


def authenticate(db: Session, payload: LoginRequest) -> AuthResult:
    """Validate credentials and issue an access token (no refresh token)."""
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        # Same error for unknown email and wrong password (no user enumeration).
        raise AppException(401, "INVALID_CREDENTIALS", "Invalid email or password")
    if not user.is_active:
        raise AppException(403, "USER_INACTIVE", "Account is disabled")

    token, expires_in = create_access_token(subject=user.id, role=user.role.value)
    return AuthResult(user=user, access_token=token, expires_in=expires_in)
