"""money columns to numeric(12,3)

Float (double precision) cannot store money exactly: 0.1 + 0.2 != 0.3, and sums
drift (e.g. 0.30000000000000004). TND has 3 decimals, so use NUMERIC(12, 3).
Existing values are rounded to 3 decimals; this was checked on a copy of real
data: no value changes.

Also makes settings.cash_balance_offset NOT NULL DEFAULT 0 (legacy databases
had it nullable).

Revision ID: 7c1e2b9a4d10
Revises: 40adffe79c3d
Create Date: 2026-11-06 21:10:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "7c1e2b9a4d10"
down_revision: Union[str, Sequence[str], None] = "40adffe79c3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MONEY = sa.Numeric(12, 3)

# (table, column)
MONEY_COLUMNS = [
    ("transactions", "amount"),
    ("debts", "amount"),
    ("monthly_funds", "commitments"),
    ("monthly_funds", "personal"),
    ("monthly_funds", "investment"),
    ("settings", "salary"),
    ("settings", "cash_balance_offset"),
]


def upgrade() -> None:
    op.execute("UPDATE settings SET cash_balance_offset = 0 WHERE cash_balance_offset IS NULL")

    for table, column in MONEY_COLUMNS:
        op.alter_column(
            table,
            column,
            type_=MONEY,
            existing_type=sa.Float(),
            postgresql_using=f"round({column}::numeric, 3)",
        )

    op.alter_column(
        "settings",
        "cash_balance_offset",
        existing_type=MONEY,
        nullable=False,
        server_default="0",
    )


def downgrade() -> None:
    op.alter_column(
        "settings",
        "cash_balance_offset",
        existing_type=MONEY,
        nullable=True,
        server_default=None,
    )
    for table, column in MONEY_COLUMNS:
        op.alter_column(
            table,
            column,
            type_=sa.Float(),
            existing_type=MONEY,
            postgresql_using=f"{column}::double precision",
        )
