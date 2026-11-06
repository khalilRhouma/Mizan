from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.crud import (
    DEFAULT_SETTINGS,
    delete_debt,
    delete_transaction,
    get_monthly_funds,
    settle_outstanding_card_payments,
    get_settings,
    list_debts,
    list_monthly_funds,
    list_transactions,
    patch_settings,
    upsert_debt,
    upsert_monthly_funds,
    upsert_transaction,
)
from app.database import Base, engine, get_db
from app.schemas import DebtIn, MonthlyFundsIn, SettingsIn, TransactionIn

cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE settings ADD COLUMN IF NOT EXISTS "
                "cash_balance_offset DOUBLE PRECISION DEFAULT 0"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "
                "card_settled BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )
    yield


app = FastAPI(
    title="Personal Finance API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/transactions")
def api_list_transactions(db: Session = Depends(get_db)):
    return list_transactions(db)


@app.post("/transactions")
def api_save_transaction(body: TransactionIn, db: Session = Depends(get_db)):
    return upsert_transaction(db, body)


@app.delete("/transactions/{tx_id}", status_code=204)
def api_delete_transaction(tx_id: str, db: Session = Depends(get_db)):
    delete_transaction(db, tx_id)


@app.post("/transactions/settle-card")
def api_settle_card(db: Session = Depends(get_db)):
    settled = settle_outstanding_card_payments(db)
    return {"settled": settled}


@app.get("/monthly-funds")
def api_list_monthly_funds(db: Session = Depends(get_db)):
    return list_monthly_funds(db)


@app.get("/monthly-funds/{year_month}")
def api_get_monthly_funds(year_month: str, db: Session = Depends(get_db)):
    record = get_monthly_funds(db, year_month)
    if record is None:
        raise HTTPException(status_code=404, detail="Not found")
    return record


@app.post("/monthly-funds")
def api_save_monthly_funds(body: MonthlyFundsIn, db: Session = Depends(get_db)):
    return upsert_monthly_funds(db, body)


@app.get("/debts")
def api_list_debts(db: Session = Depends(get_db)):
    return list_debts(db)


@app.post("/debts")
def api_save_debt(body: DebtIn, db: Session = Depends(get_db)):
    return upsert_debt(db, body)


@app.delete("/debts/{debt_id}", status_code=204)
def api_delete_debt(debt_id: str, db: Session = Depends(get_db)):
    delete_debt(db, debt_id)


@app.get("/settings")
def api_get_settings(db: Session = Depends(get_db)):
    try:
        return get_settings(db)
    except Exception:
        return DEFAULT_SETTINGS


@app.patch("/settings")
def api_patch_settings(body: SettingsIn, db: Session = Depends(get_db)):
    return patch_settings(db, body)
