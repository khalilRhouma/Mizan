"""Transaction categories: the single source of truth.

The frontend loads this list from GET /categories. To add a category, add a
line here (key must stay stable: it is stored in the database).
"""

from typing import Literal, TypedDict


class Category(TypedDict):
    key: str
    ar: str
    en: str
    type: Literal["income", "expense"]


CATEGORIES: list[Category] = [
    {"key": "salary", "ar": "راتب الوظيفة", "en": "Salary", "type": "income"},
    {"key": "extra_income", "ar": "دخل إضافي", "en": "Extra income", "type": "income"},
    {"key": "rent", "ar": "إيجار السكن", "en": "Rent", "type": "expense"},
    {"key": "bills", "ar": "فاتورات", "en": "Bills", "type": "expense"},
    {"key": "food", "ar": "مشتريات / طعام", "en": "Food / groceries", "type": "expense"},
    {"key": "clothes", "ar": "ملابس", "en": "Clothes", "type": "expense"},
    {"key": "health", "ar": "دواء / علاج", "en": "Health / medicine", "type": "expense"},
    {"key": "needs", "ar": "حاجيات", "en": "Needs", "type": "expense"},
    {"key": "donations", "ar": "صدقات", "en": "Donations", "type": "expense"},
    {"key": "leisure", "ar": "ترفيه / رياضة", "en": "Leisure / sports", "type": "expense"},
    {"key": "car", "ar": "مصاريف سيارة", "en": "Car expenses", "type": "expense"},
    {"key": "construction", "ar": "بناء / مواد بناء / يد عاملة", "en": "Construction", "type": "expense"},
    {"key": "investment_project", "ar": "مشاريع استثمار", "en": "Investment project", "type": "expense"},
    {"key": "extra_expense", "ar": "مصروفات إضافية", "en": "Extra expenses", "type": "expense"},
]

# Special category used by cash withdrawals (bank -> home cash box). Not shown
# in the category pickers, so it is not in CATEGORIES.
CASH_WITHDRAWAL = "cash_withdrawal"

CATEGORY_TYPES: dict[str, str] = {c["key"]: c["type"] for c in CATEGORIES}
