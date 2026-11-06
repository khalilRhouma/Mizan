"""API tests: happy paths and validation (fake data only)."""

import pytest

from app.categories import CATEGORIES
from tests.conftest import make_debt, make_tx


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


# --- categories -------------------------------------------------------------

def test_categories_endpoint_returns_the_backend_list(client):
    res = client.get("/categories")
    assert res.status_code == 200
    assert res.json() == CATEGORIES
    assert {c["type"] for c in res.json()} == {"income", "expense"}


# --- transactions -----------------------------------------------------------

def test_create_list_update_delete_transaction(client):
    assert client.post("/transactions", json=make_tx()).status_code == 200

    [tx] = client.get("/transactions").json()
    assert tx["category"] == "car"
    assert tx["amount"] == 60
    assert tx["date"] == "2026-03-15"
    assert tx["cardSettled"] is False

    client.post("/transactions", json=make_tx(amount=75.5, notes="ليسونس + لافاج"))
    [tx] = client.get("/transactions").json()
    assert tx["amount"] == 75.5
    assert tx["notes"] == "ليسونس + لافاج"

    assert client.delete("/transactions/tx-1").status_code == 204
    assert client.get("/transactions").json() == []


def test_money_is_stored_exactly(client):
    # With float columns these would drift (0.1 + 0.2 != 0.3).
    for i, amount in enumerate([0.1, 0.2, 1234.567]):
        client.post("/transactions", json=make_tx(id=f"tx-{i}", amount=amount))
    amounts = sorted(t["amount"] for t in client.get("/transactions").json())
    assert amounts == [0.1, 0.2, 1234.567]


def test_update_keeps_card_settled_when_not_sent(client):
    client.post("/transactions", json=make_tx(currency="EUR", paymentMethod="card"))
    assert client.post("/transactions/settle-card").json() == {"settled": 1}

    client.post("/transactions", json=make_tx(currency="EUR", paymentMethod="card", amount=61))
    [tx] = client.get("/transactions").json()
    assert tx["cardSettled"] is True


def test_cash_withdrawal(client):
    body = make_tx(kind="cash_withdrawal", category="cash_withdrawal", paymentMethod="bank", amount=400)
    assert client.post("/transactions", json=body).status_code == 200


def test_cash_withdrawal_with_wrong_category_is_normalized(client):
    res = client.post("/transactions", json=make_tx(kind="cash_withdrawal", category="car", currency="EUR"))
    assert res.status_code == 200
    assert (res.json()["category"], res.json()["currency"]) == ("cash_withdrawal", "TND")


def test_legacy_caisse_payload_is_normalized(client):
    res = client.post("/transactions", json=make_tx(category="caisse", currency="EUR", kind=""))
    assert res.status_code == 200
    tx = res.json()
    assert (tx["kind"], tx["category"], tx["currency"]) == ("cash_withdrawal", "cash_withdrawal", "TND")


@pytest.mark.parametrize(
    "overrides",
    [
        {"category": "unknown"},
        {"category": "salary"},  # income category on an expense
        {"amount": 0},
        {"amount": -5},
        {"amount": 1.2345},  # more than 3 decimals
        {"date": "2026-02-30"},
        {"date": "15/03/2026"},
        {"currency": "USD"},
        {"type": "gift"},
        {"paymentMethod": "crypto"},
        {"id": ""},
    ],
)
def test_invalid_transaction_is_rejected(client, overrides):
    res = client.post("/transactions", json=make_tx(**overrides))
    assert res.status_code == 422
    assert client.get("/transactions").json() == []


# --- debts ------------------------------------------------------------------

def test_debt_with_and_without_deadline(client):
    assert client.post("/debts", json=make_debt()).status_code == 200
    assert client.post("/debts", json=make_debt(id="debt-2", type="lent", deadline="2026-06-30")).status_code == 200

    debts = {d["id"]: d for d in client.get("/debts").json()}
    assert debts["debt-1"]["deadline"] == ""
    assert debts["debt-2"]["deadline"] == "2026-06-30"

    client.post("/debts", json=make_debt(status="closed"))
    debts = {d["id"]: d for d in client.get("/debts").json()}
    assert debts["debt-1"]["status"] == "closed"


@pytest.mark.parametrize(
    "overrides",
    [{"status": "paid"}, {"type": "gift"}, {"amount": 0}, {"label": ""}, {"deadline": "soon"}],
)
def test_invalid_debt_is_rejected(client, overrides):
    assert client.post("/debts", json=make_debt(**overrides)).status_code == 422


# --- monthly funds ----------------------------------------------------------

def test_monthly_funds(client):
    assert client.get("/monthly-funds/2026-03").status_code == 404
    body = {"yearMonth": "2026-03", "commitments": 400, "personal": 200, "investment": 400}
    assert client.post("/monthly-funds", json=body).status_code == 200
    assert client.get("/monthly-funds/2026-03").json() == body


@pytest.mark.parametrize("year_month", ["2026-13", "2026-3", "march"])
def test_invalid_year_month_is_rejected(client, year_month):
    res = client.post("/monthly-funds", json={"yearMonth": year_month})
    assert res.status_code == 422


# --- settings ---------------------------------------------------------------

def test_settings_defaults_and_partial_patch(client):
    s = client.get("/settings").json()
    assert s["language"] == "ar"
    assert s["fundSplits"] == {"commitments": 40, "personal": 20, "investment": 40}

    client.patch("/settings", json={"salary": 2500, "cashBalanceOffset": -12.5})
    client.patch("/settings", json={"theme": "dark"})  # must not reset salary

    s = client.get("/settings").json()
    assert (s["theme"], s["salary"], s["cashBalanceOffset"]) == ("dark", 2500, -12.5)


@pytest.mark.parametrize("body", [{"language": "de"}, {"theme": "blue"}, {"salary": -1}, {"fundSplits": {"commitments": 150}}])
def test_invalid_settings_are_rejected(client, body):
    assert client.patch("/settings", json=body).status_code == 422


# --- quick add ----------------------------------------------------------------

def parse(client, text: str) -> list[dict]:
    res = client.post("/quick-add/parse", json={"text": text, "today": "2026-11-06"})
    assert res.status_code == 200
    return res.json()["drafts"]


def test_parse_returns_drafts_and_saves_nothing(client):
    drafts = parse(client, "3/11\nليسونس 60\nصيدلية 18\nنشري هدية")
    assert [(d["date"], d["amount"], d["category"], d["error"]) for d in drafts] == [
        ("2026-11-03", 60, "car", None),
        ("2026-11-03", 18, "health", None),
        ("2026-11-03", None, None, "no_amount"),
    ]
    assert client.get("/transactions").json() == []


@pytest.mark.parametrize(
    "line, category",
    [
        # Tunisian words from the seed migrations (real vocabulary, not test data)
        ("ليسونس 60", "car"),
        ("كرهبة لافاج 15", "car"),
        ("تاكسي 7", "car"),
        ("قضية 45", "food"),
        ("خضرة وغلة 23", "food"),
        ("حوت 30", "food"),
        ("حوايج 120", "clothes"),
        ("زوز سراول 90", "clothes"),
        ("صباط 89", "clothes"),
        ("الفريب 35", "clothes"),
        ("دوا 18", "health"),
        ("سبيطار 40", "health"),
        ("ستاغ 85", "bills"),
        ("صوناد 32", "bills"),
        ("رشارج 5", "bills"),
        ("كرا 650", "rent"),
        ("صدقة 10", "donations"),
        ("قهوة 3", "leisure"),
        ("لبلابي 4", "leisure"),
        ("9ahwa 3", "leisure"),
        ("جافال 4", "needs"),
        ("ياجور 300", "construction"),
        ("ملابس 40", "clothes"),  # category name works as a word
    ],
)
def test_tunisian_vocabulary(client, line, category):
    [d] = parse(client, line)
    assert d["category"] == category, line


def test_salary_line_is_income(client):
    [d] = parse(client, "الشهرية 2500")
    assert (d["type"], d["category"], d["paymentMethod"]) == ("income", "salary", "bank")


def test_shared_category_word_is_ignored(client):
    [d] = parse(client, "extra 40")
    assert d["category"] is None  # "extra" belongs to two categories


def test_learning_changes_the_next_guess(client):
    line = "عصير برتقال 25"  # "orange juice": not in the seed words
    [d] = parse(client, line)
    assert d["category"] is None and d["keywords"] == ["عصير", "برتقال"]

    res = client.post("/category-rules/learn", json={"items": [{"keywords": ["عصير", "برتقال"], "category": "leisure"}]})
    assert res.json() == {"learned": 2}
    [d] = parse(client, line)
    assert (d["category"], d["categorySource"]) == ("leisure", "rule")

    # Corrected twice to another category: the higher hit count wins.
    for _ in range(2):
        client.post("/category-rules/learn", json={"items": [{"keywords": ["عصير"], "category": "food"}]})
    [d] = parse(client, "عصير 6")
    assert d["category"] == "food"

    rules = [r for r in client.get("/category-rules").json() if r["keyword"] in ("عصير", "برتقال")]
    assert {(r["keyword"], r["category"], r["hits"]) for r in rules} == {
        ("عصير", "leisure", 1), ("برتقال", "leisure", 1), ("عصير", "food", 2),
    }
    for r in rules:
        assert client.delete(f"/category-rules/{r['id']}").status_code == 204
    [d] = parse(client, line)
    assert d["category"] is None


def test_seed_rules_exist(client):
    keywords = {r["keyword"] for r in client.get("/category-rules").json()}
    assert {"ليسونس", "حوايج", "ستاغ", "صيدليه", "essence"} <= keywords


@pytest.mark.parametrize(
    "path, body",
    [
        ("/quick-add/parse", {"text": ""}),
        ("/quick-add/parse", {"text": "x" * 20_001}),
        ("/category-rules/learn", {"items": [{"keywords": ["ليسونس"], "category": "unknown"}]}),
        ("/category-rules/learn", {"items": [{"keywords": ["a", "b", "c", "d", "e"], "category": "car"}]}),
    ],
)
def test_quick_add_validation(client, path, body):
    assert client.post(path, json=body).status_code == 422
