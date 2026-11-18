from decimal import Decimal
from functools import lru_cache
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    APP_ENV: Literal["development", "test", "production"] = "development"
    APP_NAME: str = "ORVIA"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str
    TEST_DATABASE_URL: str | None = None

    JWT_SECRET_KEY: str = Field(min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=1, le=1440)

    FRONTEND_ORIGIN: str = "http://localhost:5173"

    TAX_RATE: Decimal = Field(default=Decimal("0.00"), ge=0, le=1)
    CURRENCY_CODE: str = Field(default="USD", min_length=3, max_length=3)
    REPORT_TIMEZONE: str = "UTC"

    FIRST_ADMIN_EMAIL: str = "admin@example.com"
    FIRST_ADMIN_PASSWORD: str = "change-me-now"
    FIRST_ADMIN_FULL_NAME: str = "Store Admin"

    DEMO_CASHIER_EMAIL: str = "cashier@example.com"
    DEMO_CASHIER_PASSWORD: str = ""
    DEMO_CASHIER_FULL_NAME: str = "Demo Cashier"

    @field_validator("DATABASE_URL", "TEST_DATABASE_URL")
    @classmethod
    def _require_psycopg_driver(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.startswith("postgresql+psycopg://"):
            raise ValueError("Database URL must use the postgresql+psycopg:// driver")
        return value

    @field_validator("CURRENCY_CODE")
    @classmethod
    def _normalize_currency(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("FRONTEND_ORIGIN")
    @classmethod
    def _no_wildcard_origin(cls, value: str) -> str:
        if value.strip() == "*":
            raise ValueError("FRONTEND_ORIGIN must be an explicit origin, not '*'")
        return value.rstrip("/")

    @field_validator("FIRST_ADMIN_EMAIL")
    @classmethod
    def _normalize_admin_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("REPORT_TIMEZONE")
    @classmethod
    def _validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError(f"Unknown REPORT_TIMEZONE: {value}") from exc
        return value

    @model_validator(mode="after")
    def _production_guards(self) -> "Settings":
        if self.APP_ENV == "production":
            weak_markers = ("replace-with", "change-me", "secret-key", "changeme")
            lowered = self.JWT_SECRET_KEY.lower()
            if any(marker in lowered for marker in weak_markers):
                raise ValueError("JWT_SECRET_KEY still contains a placeholder value")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
