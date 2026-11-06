"""Test setup: a throwaway Postgres (Docker, via testcontainers) per test run.

Tests never touch the real database. All data here is fake.
Run:  cd backend && .venv/bin/pytest
"""

import os

import pytest
from sqlalchemy import create_engine, text
from testcontainers.community.postgres import PostgresContainer

# Start the database BEFORE importing the app: app.config reads DATABASE_URL
# at import time.
_pg = PostgresContainer("postgres:16-alpine", driver="psycopg2")
_pg.start()
os.environ["DATABASE_URL"] = _pg.get_connection_url()

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

TABLES = ("transactions", "debts", "monthly_funds", "settings")


def pytest_sessionfinish(session, exitstatus):
    _pg.stop()


@pytest.fixture(scope="session")
def pg_url() -> str:
    return _pg.get_connection_url()


@pytest.fixture(scope="session")
def client():
    # The context manager runs the app lifespan, which runs the migrations.
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def clean_tables(client, pg_url):
    yield
    engine = create_engine(pg_url)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {', '.join(TABLES)}"))
    engine.dispose()


def make_tx(**overrides) -> dict:
    """A valid fake expense; override any field."""
    tx = {
        "id": "tx-1",
        "date": "2026-03-15",
        "type": "expense",
        "amount": 60,
        "currency": "TND",
        "category": "car",
        "notes": "fuel",
        "recurring": False,
        "createdAt": 1_700_000_000_000,
        "kind": "normal",
        "paymentMethod": "cash",
    }
    tx.update(overrides)
    return tx


def make_debt(**overrides) -> dict:
    debt = {
        "id": "debt-1",
        "type": "borrowed",
        "label": "Loan from a friend",
        "amount": 500,
        "currency": "TND",
        "date": "2026-02-01",
        "deadline": "",
        "notes": "",
        "status": "open",
        "createdAt": 1_700_000_000_000,
    }
    debt.update(overrides)
    return debt
