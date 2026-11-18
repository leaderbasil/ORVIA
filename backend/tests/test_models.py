import app.models  # noqa: F401  (registers the mappers)
from app.db.base import Base
from app.models.user import UserRole

EXPECTED_COLUMNS = {
    "users": 8,
    "products": 13,
    "sales": 11,
    "sale_items": 9,
}


def test_only_the_four_mvp_tables_exist() -> None:
    assert set(Base.metadata.tables) == set(EXPECTED_COLUMNS)


def test_column_counts_match_the_specification() -> None:
    counts = {name: len(table.columns) for name, table in Base.metadata.tables.items()}
    assert counts == EXPECTED_COLUMNS
    assert sum(counts.values()) == 41


def test_user_role_enum_values() -> None:
    assert {role.value for role in UserRole} == {"ADMIN", "CASHIER"}
