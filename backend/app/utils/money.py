from decimal import Decimal, ROUND_HALF_UP
from typing import Union

CENT = Decimal("0.01")
MoneyInput = Union[Decimal, int, str]


def to_decimal(value: MoneyInput) -> Decimal:
    """Convert a safe numeric input to Decimal. Floats are rejected on purpose."""
    if isinstance(value, float):
        raise TypeError("Money values must never be floats; use Decimal or str")
    return Decimal(value)


def round2(value: MoneyInput) -> Decimal:
    """Round a money value to 2 decimals using ROUND_HALF_UP."""
    return to_decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def money_str(value: MoneyInput) -> str:
    """Serialize a money value as a fixed 2-decimal string (e.g. '12.50')."""
    return format(round2(value), ".2f")
