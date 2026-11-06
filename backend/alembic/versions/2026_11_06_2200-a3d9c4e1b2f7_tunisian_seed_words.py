"""more seed words in Tunisian dialect (Derja), plurals and Arabizi

Existing (keyword, category) pairs are left as they are (learned hits kept).

Revision ID: a3d9c4e1b2f7
Revises: f0e0b2edbb94
Create Date: 2026-11-06 22:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.text import normalize

revision: str = "a3d9c4e1b2f7"
down_revision: Union[str, Sequence[str], None] = "f0e0b2edbb94"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TUNISIAN_RULES: dict[str, list[str]] = {
    "car": [
        "ليسونس", "ليسانس", "كرهبة", "الكرهبة", "باركينغ", "بارکینغ", "فيدونج", "فيدانج", "ميكانيسيان",
        "بنوات", "بنو", "اسورونس", "فيزيت", "لافاج", "طوموبيل", "لواج", "تاكسي", "طاكسي", "ميترو", "كار",
        "lisons", "lisance", "karhba", "taxi",
    ],
    "food": [
        "قضية", "القضية", "خضرة", "غلة", "حوت", "زيت", "سكر", "ماكلة", "فطور", "عشاء", "كسكسي",
        "باتيسري", "حلو", "عطار", "حانوت", "مغازة", "سوق", "مرشي", "دجاج", "علوش", "مقرونة",
        "khobz", "7lib", "9adhia", "khodra", "makla",
    ],
    "clothes": [
        "حوايج", "صباط", "صبابط", "سبادري", "سبادريات", "سروال", "سراول", "مريول", "مراول", "جاكيطة",
        "كبوط", "فريب", "الفريب", "شلاكة", "شلايك", "قمجة", "كسوة", "7wayej", "sabbat", "frip",
    ],
    "health": [
        "دوا", "ادوية", "سبيطار", "فرمسيان", "فرماسي", "دكتور", "طبيب", "كلينيك", "تحليل", "تحاليل",
        "سنيور", "نظارات", "dwe", "sbitar", "pharma",
    ],
    "bills": [
        "ستاغ", "صوناد", "الضو", "ضو", "الما", "رشارج", "شارجة", "ويفي", "كونكسيون", "انترنات",
        "تيليكوم", "اوريدو", "اورنج", "فاتورة", "فاتورات", "steg", "sonede", "recharge", "wifi",
    ],
    "rent": ["كرا", "الكرا", "kra"],
    "donations": ["صدقة", "صدقات", "زكاة", "الزكاة", "فطرة", "عيدية"],
    "leisure": [
        "قهوة", "قهاوي", "كافي", "تاي", "شيشة", "ريسطو", "بيتزا", "ملاوي", "شاورما", "سندويتش", "لبلابي",
        "كفتاجي", "خرجة", "بحر", "سينما", "ماتش", "قاعة", "9ahwa", "kahwa", "kafe", "sandwich", "resto",
    ],
    "needs": ["جافال", "صابون", "تنظيف", "ديترجون", "شامبو", "معجون", "حفاظات", "kleenex"],
    "construction": ["ياجور", "سيما", "رملة", "حديد", "بناي", "بلاط", "دهينة", "صباغة", "بلومبي", "الكتريسيان"],
    "salary": ["شهرية", "الشهرية", "خلاص", "الخلاص", "pay", "chahria"],
    "extra_income": ["بريم", "مكافأة", "فريلانس", "prime"],
}

rules_table = sa.table(
    "category_rules",
    sa.column("keyword", sa.String),
    sa.column("category", sa.String),
    sa.column("hits", sa.Integer),
)


def _rows() -> list[dict]:
    rows, seen = [], set()
    for category, words in TUNISIAN_RULES.items():
        for word in words:
            key = (normalize(word), category)
            if key not in seen:
                seen.add(key)
                rows.append({"keyword": key[0], "category": category, "hits": 1})
    return rows


def upgrade() -> None:
    stmt = pg_insert(rules_table).values(_rows())
    op.execute(stmt.on_conflict_do_nothing(constraint="uq_category_rules_keyword_category"))


def downgrade() -> None:
    # No-op on purpose: some words are also in the first seed list, and words
    # may have learned hits since. Extra words in the table are harmless.
    pass
