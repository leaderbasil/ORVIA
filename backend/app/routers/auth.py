from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import get_current_user
from app.dependencies import get_db
from app.models.user import User
from app.schemas.auth import LoginData, LoginRequest
from app.schemas.common import DataResponse
from app.schemas.user import UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=DataResponse[LoginData], summary="Log in")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> dict:
    result = auth_service.authenticate(db, payload)
    return {
        "data": {
            "access_token": result.access_token,
            "token_type": "bearer",
            "expires_in": result.expires_in,
            "user": result.user,
        },
        "message": "Logged in",
    }


@router.get("/me", response_model=DataResponse[UserOut], summary="Current user")
def me(current_user: User = Depends(get_current_user)) -> dict:
    return {"data": current_user, "message": "OK"}
