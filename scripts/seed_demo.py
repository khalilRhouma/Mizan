"""Fill an EMPTY Mizan API with fake demo data (for screenshots and demos).

All amounts, notes and debts are invented. Never point this at your real data:
the script refuses to run if the target already has transactions.

Usage (stdlib only, no install needed):
    python3 scripts/seed_demo.py --api-url http://localhost:8001

Typical demo setup (separate database, real data untouched):
    docker exec finance-db createdb -U finance finance_demo
    docker build -t finance-demo-api backend
    docker run -d --rm --name finance-demo-api --network finance-system_default \
      -e DATABASE_URL=postgresql://finance:finance@db:5432/finance_demo \
      -e CORS_ORIGINS=http://localhost:5174 -p 8001:8000 finance-demo-api
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
import urllib.request
import uuid
from datetime import date

# Fixed seed: the same demo data on every run.
RNG = random.Random(42)

SALARY = 2800

# (category, payment method, min, max, times per month, notes)
MONTHLY_EXPENSES = [
    ("rent", "bank", 650, 650, 1, "إيجار الشهر"),
    ("bills", "bank", 70, 140, 2, "كهرباء / ماء / إنترنت"),
    ("food", "cash", 40, 120, 6, "مشتريات أسبوعية"),
    ("car", "cash", 50, 80, 3, "وقود"),
    ("health", "cash", 15, 60, 1, "صيدلية"),
    ("needs", "cash", 20, 70, 2, "حاجيات البيت"),
    ("donations", "cash", 10, 40, 2, ""),
    ("leisure", "card", 25, 60, 1, "اشتراك رياضة"),
]

# Occasional bigger spends: (month offset from the start, category, method, amount, notes)
ONE_OFF = [
    (1, "clothes", "card", 180, "ملابس الصيف"),
    (2, "extra_expense", "bank", 320, "تصليح الثلاجة"),
    (3, "car", "bank", 260, "صيانة السيارة"),
    (4, "clothes", "cash", 95, "حذاء"),
    (5, "investment_project", "bank", 400, "معدات المشروع"),
]


def month_starts(count: int) -> list[date]:
    """First day of the last `count` months, oldest first, ending with the current month."""
    today = date.today()
    out = []
    y, m = today.year, today.month
    for _ in range(count):
        out.append(date(y, m, 1))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return list(reversed(out))


def tx(day: date, type_: str, amount: float, category: str, method: str, notes: str = "", kind: str = "normal") -> dict:
    return {
        "id": str(uuid.uuid4()),
        "date": day.isoformat(),
        "type": type_,
        "amount": round(amount, 3),
        "currency": "TND",
        "category": category,
        "notes": notes,
        "recurring": category in ("salary", "rent"),
        "createdAt": int(time.time() * 1000),
        "kind": kind,
        "paymentMethod": method,
    }


def build_transactions(months: list[date]) -> list[dict]:
    today = date.today()
    items: list[dict] = []
    for i, start in enumerate(months):
        def day(n: int) -> date:
            # Days after today (current month) are dropped by the final filter.
            return start.replace(day=min(n, 28))

        items.append(tx(day(1), "income", SALARY, "salary", "bank", "راتب الشهر"))
        if i % 2 == 1:
            items.append(tx(day(15), "income", RNG.choice([300, 450, 600]), "extra_income", "bank", "عمل حر"))
        items.append(tx(day(2), "expense", 400, "cash_withdrawal", "bank", "", kind="cash_withdrawal"))

        for category, method, lo, hi, times, notes in MONTHLY_EXPENSES:
            for _ in range(times):
                amount = lo if lo == hi else RNG.randint(lo, hi)
                items.append(tx(day(RNG.randint(1, 28)), "expense", amount, category, method, notes))

        for offset, category, method, amount, notes in ONE_OFF:
            if offset == i:
                items.append(tx(day(RNG.randint(5, 25)), "expense", amount, category, method, notes))

    # One EUR card payment, to show the card panel.
    eur = tx(months[-1].replace(day=min(3, today.day)), "expense", 12.99, "leisure", "card", "اشتراك تطبيق")
    eur["date"] = months[-1].replace(day=1).isoformat()
    eur["currency"] = "EUR"
    items.append(eur)
    return [t for t in items if t["date"] <= today.isoformat()]


def build_debts(months: list[date]) -> list[dict]:
    now = int(time.time() * 1000)
    return [
        {"id": str(uuid.uuid4()), "type": "borrowed", "label": "سلفة من صديق", "amount": 500,
         "currency": "TND", "date": months[-3].isoformat(), "deadline": months[-1].replace(day=28).isoformat(),
         "notes": "", "status": "open", "createdAt": now},
        {"id": str(uuid.uuid4()), "type": "lent", "label": "سلفة لأخي", "amount": 200,
         "currency": "TND", "date": months[-2].isoformat(), "deadline": "",
         "notes": "", "status": "open", "createdAt": now},
    ]


def call(api: str, method: str, path: str, body: dict | None = None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{api}{path}", data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as res:
        raw = res.read()
        return json.loads(raw) if raw else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api-url", required=True, help="Base URL of the DEMO API, e.g. http://localhost:8001")
    parser.add_argument("--months", type=int, default=6, help="How many months of data (default 6)")
    args = parser.parse_args()
    api = args.api_url.rstrip("/")

    existing = call(api, "GET", "/transactions")
    if existing:
        print(f"Refusing to seed: {api} already has {len(existing)} transactions. "
              "Use an empty demo database.", file=sys.stderr)
        return 1

    months = month_starts(args.months)
    transactions = build_transactions(months)
    for t in transactions:
        call(api, "POST", "/transactions", t)
    for d in build_debts(months):
        call(api, "POST", "/debts", d)
    call(api, "PATCH", "/settings", {"salary": SALARY, "language": "ar", "theme": "light"})

    print(f"Seeded {len(transactions)} fake transactions and 2 debts into {api}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
