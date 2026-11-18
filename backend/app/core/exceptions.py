from typing import Any


class AppException(Exception):
    """Business-level exception rendered as {"detail", "code", ...} by the API."""

    def __init__(
        self,
        status_code: int,
        code: str,
        detail: str,
        *,
        meta: dict[str, Any] | None = None,
        errors: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.code = code
        self.detail = detail
        self.meta = meta
        self.errors = errors

    def to_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"detail": self.detail, "code": self.code}
        if self.meta is not None:
            payload["meta"] = self.meta
        if self.errors is not None:
            payload["errors"] = self.errors
        return payload
