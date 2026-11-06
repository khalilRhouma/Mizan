from datetime import date

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.categories import CATEGORIES, CATEGORY_TYPES
from app.models import AppSettings, CategoryRule, Debt, MonthlyFund, Transaction
from app.parser import Draft, parse_text
from app.schemas import (
    DebtIn,
    FundSplits,
    LearnItem,
    MonthlyFundsIn,
    SettingsIn,
    SettingsOut,
    TransactionIn,
)
from app.text import keywords, normalize


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


# --- quick add / category rules ----------------------------------------------

def rules_map(db: Session) -> dict[str, tuple[str, int]]:
    """normalized keyword -> (category, hits), best category per keyword.

    Category names themselves ("ملابس", "rent"...) are added with 0 hits, so a
    learned rule always wins over them.
    """
    label_words: dict[str, set[str]] = {}
    for c in CATEGORIES:
        for word in keywords(f"{c['key'].replace('_', ' ')} {c['ar']} {c['en']}", limit=10):
            label_words.setdefault(word, set()).add(c["key"])
    # Skip words shared by several categories ("extra" -> income AND expense).
    best: dict[str, tuple[str, int]] = {
        word: (next(iter(cats)), 0) for word, cats in label_words.items() if len(cats) == 1
    }
    for row in db.query(CategoryRule).all():
        current = best.get(row.keyword)
        if current is None or row.hits > current[1]:
            best[row.keyword] = (row.category, row.hits)
    return best


def parse_quick_add(db: Session, text: str, today: date) -> list[Draft]:
    return parse_text(text, today, rules_map(db), CATEGORY_TYPES)


def learn_rules(db: Session, items: list[LearnItem]) -> int:
    """Add 1 hit to each (keyword, category) pair; create missing pairs."""
    pairs: dict[tuple[str, str], int] = {}
    for item in items:
        for word in item.keywords:
            key = normalize(word).strip()
            if 2 <= len(key) <= 64:
                pairs[(key, item.category)] = pairs.get((key, item.category), 0) + 1
    if not pairs:
        return 0
    stmt = pg_insert(CategoryRule).values(
        [{"keyword": k, "category": c, "hits": n} for (k, c), n in pairs.items()]
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_category_rules_keyword_category",
        set_={"hits": CategoryRule.hits + stmt.excluded.hits},
    )
    db.execute(stmt)
    db.commit()
    return len(pairs)


def list_rules(db: Session) -> list[CategoryRule]:
    return db.query(CategoryRule).order_by(CategoryRule.category, CategoryRule.hits.desc(), CategoryRule.keyword).all()


def delete_rule(db: Session, rule_id: int) -> None:
    row = db.get(CategoryRule, rule_id)
    if row:
        db.delete(row)
        db.commit()
