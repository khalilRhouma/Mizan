"""Run database migrations (Alembic) when the API starts.

Cases:
- Empty database      -> `upgrade head` creates every table.
- Up-to-date database -> nothing to do.
- Legacy database (tables made by the old `create_all` + raw ALTERs, no
  `alembic_version` table) -> add the old ad-hoc columns if missing, mark the
  baseline revision as applied (`stamp`), then `upgrade head`.

Run by hand:  python -m app.migrate
"""

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, inspect, text

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent.parent
BASELINE_REVISION = "40adffe79c3d"

# Columns the old startup code added with raw ALTER statements. A legacy
# database may miss them, and the baseline revision expects them.
_LEGACY_COLUMNS = (
    "ALTER TABLE settings ADD COLUMN IF NOT EXISTS cash_balance_offset DOUBLE PRECISION DEFAULT 0",
    "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS card_settled BOOLEAN NOT NULL DEFAULT FALSE",
)


def _alembic_config(connection) -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.attributes["connection"] = connection
    cfg.attributes["configure_logger"] = False
    return cfg


def run_migrations(engine: Engine) -> None:
    with engine.begin() as conn:
        tables = set(inspect(conn).get_table_names())
        cfg = _alembic_config(conn)

        if "alembic_version" not in tables and "transactions" in tables:
            logger.info("Legacy database found: stamping baseline %s", BASELINE_REVISION)
            for stmt in _LEGACY_COLUMNS:
                conn.execute(text(stmt))
            command.stamp(cfg, BASELINE_REVISION)

        command.upgrade(cfg, "head")
        logger.info("Database schema is up to date")


if __name__ == "__main__":
    from app.database import engine

    logging.basicConfig(level=logging.INFO)
    run_migrations(engine)
