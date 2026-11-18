import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.permissions import get_current_admin
from app.dependencies import PaginationParams, get_db
from app.models.user import User, UserRole
from app.schemas.common import DataResponse, PageData
from app.schemas.user import UserCreate, UserOut, UserStatusUpdate, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=DataResponse[PageData[UserOut]], summary="List users")
def list_users(
    pagination: PaginationParams = Depends(),
    search: str | None = Query(default=None, max_length=150),
    role: UserRole | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict:
    items, total = user_service.list_users(
        db, pagination, search=search, role=role, is_active=is_active
    )
    return {
        "data": {
            "items": items,
            "total": total,
            "page": pagination.page,
            "page_size": pagination.page_size,
        },
        "message": "OK",
    }


@router.post(
    "", status_code=201, response_model=DataResponse[UserOut], summary="Create a user"
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict:
    user = user_service.create_user(db, payload)
    return {"data": user, "message": "User created"}


@router.patch(
    "/{user_id}", response_model=DataResponse[UserOut], summary="Update a user"
)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> dict:
    user = user_service.update_user(db, user_id, payload, current_user)
    return {"data": user, "message": "User updated"}


@router.patch(
    "/{user_id}/status",
    response_model=DataResponse[UserOut],
    summary="Activate or disable a user",
)
def update_user_status(
    user_id: uuid.UUID,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> dict:
    user = user_service.update_user_status(db, user_id, payload.is_active, current_user)
    return {"data": user, "message": "User status updated"}
