import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from app.core.config import settings
from app.core.exceptions import AppException

BCRYPT_ROUNDS = 12
MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    """Hash a plain password with bcrypt (cost >= 12)."""
    raw = password.encode("utf-8")
    if len(raw) > MAX_PASSWORD_BYTES:
        raise ValueError("Password must be at most 72 bytes when UTF-8 encoded")
    return bcrypt.hashpw(raw, bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time password verification; never raises on malformed hashes."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(*, subject: uuid.UUID | str, role: str) -> tuple[str, int]:
    """Create a signed access token. Returns (token, expires_in_seconds)."""
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expires_in


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT; raises AppException(401) when invalid/expired."""
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
    except jwt.PyJWTError as exc:
        raise AppException(401, "TOKEN_INVALID", "Invalid or expired token") from exc
