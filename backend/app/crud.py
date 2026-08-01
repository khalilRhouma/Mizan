from sqlalchemy.orm import Session

from app.migrations import migrate_debt, migrate_transaction
from app.models import AppSettings, Debt, MonthlyFund, Transaction
from app.schemas import (
    DebtIn,
    FundSplits,
    MonthlyFundsIn,
    SettingsIn,
    SettingsOut,
    TransactionIn,
)

DEFAULT_SETTINGS = SettingsOut(
    language="ar",
    theme="light",
    salary=0,
    fundSplits=FundSplits(),
    cashBalanceOffset=0,
)


def _tx_to_api(row: Transaction) -> dict:
    return {
        "id": row.id,
        "date": row.date,
        "type": row.type,
        "amount": row.amount,
        "currency": row.currency,
        "category": row.category,
        "notes": row.notes or "",
        "recurring": row.recurring,
        "createdAt": row.created_at,
        "kind": row.kind,
        "paymentMethod": row.payment_method,
    }


def _debt_to_api(row: Debt) -> dict:
    return {
        "id": row.id,
        "type": row.type,
        "label": row.label,
        "amount": row.amount,
        "currency": row.currency,
        "date": row.date,
        "deadline": row.deadline or "",
        "notes": row.notes or "",
        "status": row.status,
        "createdAt": row.created_at,
    }


def list_transactions(db: Session) -> list[dict]:
    rows = db.query(Transaction).order_by(Transaction.date.desc(), Transaction.created_at.desc()).all()
    return [_tx_to_api(r) for r in rows]


def upsert_transaction(db: Session, data: TransactionIn) -> dict:
    payload = migrate_transaction(data.model_dump(by_alias=True))
    row = db.get(Transaction, payload["id"])
    if row is None:
        row = Transaction(id=payload["id"])
        db.add(row)
    row.date = payload["date"]
    row.type = payload["type"]
    row.amount = payload["amount"]
    row.currency = payload["currency"]
    row.category = payload["category"]
    row.notes = payload.get("notes") or ""
    row.recurring = payload.get("recurring", False)
    row.created_at = payload["createdAt"]
    row.kind = payload.get("kind") or "normal"
    row.payment_method = payload.get("paymentMethod") or "bank"
    db.commit()
    db.refresh(row)
    return _tx_to_api(row)


def delete_transaction(db: Session, tx_id: str) -> None:
    row = db.get(Transaction, tx_id)
    if row:
        db.delete(row)
        db.commit()


def list_monthly_funds(db: Session) -> list[dict]:
    rows = db.query(MonthlyFund).all()
    return [
        {
            "yearMonth": r.year_month,
            "commitments": r.commitments,
            "personal": r.personal,
            "investment": r.investment,
        }
        for r in rows
    ]


def get_monthly_funds(db: Session, year_month: str) -> dict | None:
    row = db.get(MonthlyFund, year_month)
    if not row:
        return None
    return {
        "yearMonth": row.year_month,
        "commitments": row.commitments,
        "personal": row.personal,
        "investment": row.investment,
    }


def upsert_monthly_funds(db: Session, data: MonthlyFundsIn) -> dict:
    row = db.get(MonthlyFund, data.yearMonth)
    if row is None:
        row = MonthlyFund(year_month=data.yearMonth)
        db.add(row)
    row.commitments = data.commitments
    row.personal = data.personal
    row.investment = data.investment
    db.commit()
    db.refresh(row)
    return get_monthly_funds(db, row.year_month)


def list_debts(db: Session) -> list[dict]:
    rows = db.query(Debt).order_by(Debt.date.desc()).all()
    return [_debt_to_api(r) for r in rows]


def upsert_debt(db: Session, data: DebtIn) -> dict:
    payload = migrate_debt(data.model_dump(by_alias=True))
    row = db.get(Debt, payload["id"])
    if row is None:
        row = Debt(id=payload["id"])
        db.add(row)
    row.type = payload["type"]
    row.label = payload["label"]
    row.amount = payload["amount"]
    row.currency = payload["currency"]
    row.date = payload["date"]
    row.deadline = payload.get("deadline") or ""
    row.notes = payload.get("notes") or ""
    row.status = payload.get("status") or "open"
    row.created_at = payload["createdAt"]
    db.commit()
    db.refresh(row)
    return _debt_to_api(row)


def delete_debt(db: Session, debt_id: str) -> None:
    row = db.get(Debt, debt_id)
    if row:
        db.delete(row)
        db.commit()


def _settings_row(db: Session) -> AppSettings:
    row = db.get(AppSettings, 1)
    if row is None:
        row = AppSettings(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_settings(db: Session) -> SettingsOut:
    row = _settings_row(db)
    language = row.language
    if language == "fr":
        language = "en"
    return SettingsOut(
        language=language,
        theme=row.theme,
        salary=row.salary,
        fundSplits=FundSplits(
            commitments=row.fund_splits_commitments,
            personal=row.fund_splits_personal,
            investment=row.fund_splits_investment,
        ),
        cashBalanceOffset=getattr(row, "cash_balance_offset", 0) or 0,
    )


def patch_settings(db: Session, patch: SettingsIn) -> SettingsOut:
    row = _settings_row(db)
    current = get_settings(db)
    merged = current.model_dump()
    if patch.language is not None:
        merged["language"] = patch.language
    if patch.theme is not None:
        merged["theme"] = patch.theme
    if patch.salary is not None:
        merged["salary"] = patch.salary
    if patch.fundSplits is not None:
        merged["fundSplits"] = patch.fundSplits.model_dump()
    if patch.cashBalanceOffset is not None:
        merged["cashBalanceOffset"] = patch.cashBalanceOffset

    row.language = merged["language"]
    row.theme = merged["theme"]
    row.salary = merged["salary"]
    row.fund_splits_commitments = merged["fundSplits"]["commitments"]
    row.fund_splits_personal = merged["fundSplits"]["personal"]
    row.fund_splits_investment = merged["fundSplits"]["investment"]
    row.cash_balance_offset = merged.get("cashBalanceOffset", 0) or 0
    db.commit()
    return get_settings(db)
