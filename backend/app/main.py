import logging
import time
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.exceptions import AppException
from app.routers.auth import router as auth_router
from app.routers.products import router as products_router
from app.routers.reports import router as reports_router
from app.routers.sales import router as sales_router
from app.routers.users import router as users_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("app")


def _serialize_validation_errors(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Make Pydantic errors JSON-safe (ctx may hold exception objects)."""
    cleaned: list[dict[str, Any]] = []
    for error in errors:
        item = {key: value for key, value in error.items() if key != "ctx"}
        item["loc"] = [str(part) for part in error.get("loc", [])]
        item["msg"] = str(error.get("msg", "Invalid value"))
        cleaned.append(item)
    return cleaned


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        docs_url="/docs",
        redoc_url=None,
        openapi_url="/openapi.json",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    @application.middleware("http")
    async def request_logging_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        started_at = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - started_at) * 1000
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "%s %s -> %s (%.1f ms) request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response

    @application.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_payload())

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Validation error",
                "code": "VALIDATION_ERROR",
                "errors": _serialize_validation_errors(exc.errors()),
            },
        )

    @application.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        codes = {
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
        }
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": str(exc.detail),
                "code": codes.get(exc.status_code, "HTTP_ERROR"),
            },
        )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "code": "INTERNAL_ERROR"},
        )

    @application.get("/health", tags=["system"], summary="Liveness probe")
    def health_check() -> dict[str, str]:
        return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}

    # Phase 2+: versioned API routers.
    application.include_router(auth_router, prefix=settings.API_V1_PREFIX)
    application.include_router(users_router, prefix=settings.API_V1_PREFIX)
    application.include_router(products_router, prefix=settings.API_V1_PREFIX)
    application.include_router(sales_router, prefix=settings.API_V1_PREFIX)
    application.include_router(reports_router, prefix=settings.API_V1_PREFIX)

    return application


app = create_app()
