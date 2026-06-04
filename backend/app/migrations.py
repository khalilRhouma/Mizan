"""Normalize legacy transaction/debt field shapes on upsert."""


def migrate_transaction(raw: dict) -> dict:
    tx = dict(raw)

    if tx.get("category") == "caisse":
        tx["kind"] = "cash_withdrawal"
        tx["type"] = "expense"
        tx["currency"] = "TND"
        tx["paymentMethod"] = "bank"
        tx["category"] = "cash_withdrawal"
    elif not tx.get("kind"):
        tx["kind"] = "normal"

    if not tx.get("paymentMethod"):
        tx["paymentMethod"] = "card" if tx.get("currency") == "EUR" else "bank"

    if tx.get("kind") == "cash_withdrawal":
        tx["currency"] = "TND"
        tx["category"] = "cash_withdrawal"

    return tx


def migrate_debt(raw: dict) -> dict:
    return {
        **raw,
        "type": raw.get("type") or "borrowed",
        "status": raw.get("status") or "open",
        "deadline": raw.get("deadline") or "",
        "currency": raw.get("currency") or "TND",
        "notes": raw.get("notes") or "",
        "createdAt": raw.get("createdAt") or 0,
    }
