"""category rules (word -> category) for the quick-add parser, with seed words

Revision ID: f0e0b2edbb94
Revises: 7c1e2b9a4d10
Create Date: 2026-11-06 21:20:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.text import normalize

revision: str = "f0e0b2edbb94"
down_revision: Union[str, Sequence[str], None] = "7c1e2b9a4d10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Starting vocabulary (Arabic / Tunisian / French / English). The app learns
# more words when the user saves drafts. Keys must exist in app/categories.py.
SEED_RULES: dict[str, list[str]] = {
    "car": [
        "gas", "fuel", "essence", "carburant", "gasoil", "station", "parking", "peage", "lavage",
        "vidange", "mecanicien", "pneu", "assurance", "بنزين", "وقود", "مازوط", "كار", "غسيل",
        "ميكانيك", "عجلات", "تأمين",
    ],
    "food": [
        "food", "groceries", "courses", "pain", "lait", "legumes", "fruits", "viande", "poulet",
        "carrefour", "monoprix", "aziza", "geant", "magasin", "epicerie", "boulangerie",
        "خبز", "حليب", "خضرة", "خضار", "غلال", "لحم", "دجاج", "عطار", "مشتريات", "قضية",
    ],
    "clothes": [
        "clothes", "shoes", "chemise", "pantalon", "vetements", "chaussures", "robe", "veste",
        "ملابس", "حذاء", "سروال", "قميص", "كبوط", "جاكيت",
    ],
    "health": [
        "pharmacy", "doctor", "pharmacie", "medecin", "docteur", "dentiste", "analyse", "clinique",
        "صيدلية", "دواء", "طبيب", "تحاليل", "سنية", "مصحة",
    ],
    "bills": [
        "bill", "internet", "facture", "steg", "sonede", "topnet", "ooredoo", "orange", "telecom",
        "recharge", "فاتورة", "كهرباء", "ماء", "ضوء", "انترنت", "شحن",
    ],
    "rent": ["rent", "loyer", "كراء", "إيجار"],
    "donations": ["zakat", "sadaka", "don", "صدقة", "زكاة", "تبرع"],
    "leisure": [
        "netflix", "spotify", "gym", "sport", "cinema", "cafe", "restaurant", "voyage",
        "رياضة", "قهوة", "مطعم", "خرجة", "سفر",
    ],
    "needs": ["menage", "detergent", "outils", "حاجيات", "تنظيف", "صابون"],
    "construction": ["ciment", "sable", "brique", "macon", "بناء", "اسمنت", "رملة", "ياجور", "بناي"],
    "salary": ["salary", "salaire", "راتب", "شهرية", "خلاص"],
    "extra_income": ["freelance", "prime", "bonus", "منحة"],
}

rules_table = sa.table(
    "category_rules",
    sa.column("keyword", sa.String),
    sa.column("category", sa.String),
    sa.column("hits", sa.Integer),
)


def upgrade() -> None:
    op.create_table(
        "category_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("keyword", sa.String(length=64), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("hits", sa.Integer(), server_default="1", nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("keyword", "category", name="uq_category_rules_keyword_category"),
    )
    op.create_index(op.f("ix_category_rules_keyword"), "category_rules", ["keyword"], unique=False)

    rows, seen = [], set()
    for category, words in SEED_RULES.items():
        for word in words:
            key = (normalize(word), category)
            if key not in seen:
                seen.add(key)
                rows.append({"keyword": key[0], "category": category, "hits": 1})
    op.bulk_insert(rules_table, rows)


def downgrade() -> None:
    op.drop_index(op.f("ix_category_rules_keyword"), table_name="category_rules")
    op.drop_table("category_rules")
