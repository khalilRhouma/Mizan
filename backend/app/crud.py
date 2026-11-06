from sqlalchemy.orm import Session

from app.models import AppSettings, Debt, MonthlyFund, Transaction
from app.schemas import (
    DebtIn,
    FundSplits,
    MonthlyFundsIn,
    SettingsIn,
    SettingsOut,
    TransactionIn,
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
        "cardSettled": bool(row.card_settled),
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
    row = db.get(Transaction, data.id)
    is_new = row is None
    if is_new:
        row = Transaction(id=data.id)
        db.add(row)
    row.date = data.date.isoformat()
    row.type = data.type
    row.amount = data.amount
    row.currency = data.currency
    row.category = data.category
    row.notes = data.notes
    row.recurring = data.recurring
    row.created_at = data.createdAt
    row.kind = data.kind
    row.payment_method = data.paymentMethod
    # cardSettled is optional: on update, keep the stored value unless sent.
    if is_new or data.cardSettled is not None:
        row.card_settled = bool(data.cardSettled)
    db.commit()
    db.refresh(row)
    return _tx_to_api(row)


def settle_outstanding_card_payments(db: Session) -> int:
    rows = (
        db.query(Transaction)
        .filter(
            Transaction.currency == "EUR",
            Transaction.type == "expense",
            Transaction.kind != "cash_withdrawal",
            Transaction.card_settled.is_(False),
        )
        .all()
    )
    for row in rows:
        row.card_settled = True
    db.commit()
    return len(rows)


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
    row = db.get(Debt, data.id)
    if row is None:
        row = Debt(id=data.id)
        db.add(row)
    row.type = data.type
    row.label = data.label
    row.amount = data.amount
    row.currency = data.currency
    row.date = data.date.isoformat()
    row.deadline = data.deadline.isoformat() if data.deadline else ""
    row.notes = data.notes
    row.status = data.status
    row.created_at = data.createdAt
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
        cashBalanceOffset=row.cash_balance_offset or 0,
    )


def patch_settings(db: Session, patch: SettingsIn) -> SettingsOut:
    """Change only the fields that were sent."""
    row = _settings_row(db)
    if patch.language is not None:
        row.language = patch.language
    if patch.theme is not None:
        row.theme = patch.theme
    if patch.salary is not None:
        row.salary = patch.salary
    if patch.fundSplits is not None:
        row.fund_splits_commitments = patch.fundSplits.commitments
        row.fund_splits_personal = patch.fundSplits.personal
        row.fund_splits_investment = patch.fundSplits.investment
    if patch.cashBalanceOffset is not None:
        row.cash_balance_offset = patch.cashBalanceOffset
    db.commit()
    return get_settings(db)
