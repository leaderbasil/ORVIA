import uuid
from collections.abc import Callable

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.core.security import decode_access_token
from app.dependencies import get_db
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated, active user from the Bearer token."""
    if credentials is None or not credentials.credentials:
        raise AppException(401, "TOKEN_INVALID", "Missing authentication token")

    payload = decode_access_token(credentials.credentials)
    try:
        user_id = uuid.UUID(str(payload.get("sub")))
    except (TypeError, ValueError) as exc:
        raise AppException(401, "TOKEN_INVALID", "Invalid token subject") from exc

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        # A disabled account cannot authenticate even with a still-valid token.
        raise AppException(401, "TOKEN_INVALID", "User not found or inactive")
    return user


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    """Dependency factory enforcing that the current user has one of the roles."""
    allowed = {role.value for role in roles}

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed:
            raise AppException(403, "FORBIDDEN", "Insufficient permissions")
        return current_user

    return dependency


get_current_admin = require_roles(UserRole.ADMIN)
