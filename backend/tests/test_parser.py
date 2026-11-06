"""Parser unit tests. Mostly Arabic and Tunisian dialect (Derja), because that is
how the notes are written; a few French / English / Arabizi lines too.
All values are fake. No database needed (see test_api.py for the seed words).
"""

from datetime import date
from decimal import Decimal

import pytest

from app.categories import CATEGORY_TYPES
from app.parser import parse_text
from app.text import normalize

TODAY = date(2026, 11, 6)  # a Friday (الجمعة)

RULES = {
    normalize(word): (category, 1)
    for category, words in {
        "car": ["ليسونس", "بنزين", "مازوط", "كرهبة", "باركينغ", "essence"],
        "food": ["خبز", "حليب", "خضرة", "قضية", "حوت", "khobz"],
        "clothes": ["حوايج", "صباط", "سروال", "مريول", "فريب"],
        "health": ["دوا", "دواء", "صيدلية", "سبيطار", "فرمسيان"],
        "bills": ["ستاغ", "صوناد", "الضو", "رشارج"],
        "leisure": ["قهوة", "تاي", "9ahwa", "netflix"],
        "rent": ["كرا", "كراء"],
        "salary": ["شهرية", "راتب", "خلاص"],
    }.items()
    for word in words
}


def parse(text: str, rules=RULES):
    return parse_text(text, TODAY, rules, CATEGORY_TYPES)


def one(text: str, rules=RULES):
    [draft] = parse(text, rules)
    return draft


# --- amount + category --------------------------------------------------------

@pytest.mark.parametrize(
    "line, amount, category",
    [
        ("ليسونس 60", "60", "car"),
        ("60 ليسونس", "60", "car"),
        ("بنزين ٥٠", "50", "car"),  # Arabic-Indic digits
        ("حوايج 45,5", "45.5", "clothes"),
        ("صباط 89.900 د", "89.900", "clothes"),
        ("دوا 12.750 دينار", "12.750", "health"),
        ("سبيطار 30 دت", "30", "health"),
        ("خضرة 7د", "7", "food"),
        ("زوز سروال 90", "90", "clothes"),  # "two trousers 90": زوز is not a number
        ("2 مريول 70", "70", "clothes"),  # largest number when no currency mark
        ("قهوة 2.5", "2.5", "leisure"),
        ("كرا الدار 650", "650", "rent"),
    ],
)
def test_amount_and_category(line, amount, category):
    d = one(line)
    assert d.amount == Decimal(amount)
    assert d.category == category
    assert d.error is None
    assert (d.type, d.currency, d.date) == ("expense", "TND", TODAY)


@pytest.mark.parametrize(
    "line, amount",
    [
        ("خبز 500 مليم", "0.5"),
        ("خبز 750مليم", "0.75"),
        ("حليب 1 دينار و 350 مليم", "1.350"),
    ],
)
def test_millimes(line, amount):
    assert one(line).amount == Decimal(amount)


def test_currency_mark_wins_over_bigger_number():
    assert one("باركينغ 3 سوايع 2000 متر 4د").amount == Decimal("4")


def test_arabic_article_and_attached_letters_are_ignored():
    assert one("الصيدلية 20").category == "health"
    assert one("الدوا 20").category == "health"


def test_fuzzy_match_for_typos():
    d = one("ليسنس 60")  # missing و
    assert (d.category, d.categorySource) == ("car", "fuzzy")


def test_unknown_word_has_no_category():
    d = one("حاجة غريبة 25")
    assert (d.category, d.categorySource, d.amount) == (None, None, Decimal(25))


# --- currency + payment ----------------------------------------------------------

def test_local_card_stays_in_dinars():
    d = one("حوايج 120 بالكارطة")
    assert (d.currency, d.paymentMethod) == ("TND", "bank")


def test_euro_means_card():
    d = one("netflix 12.99€")
    assert (d.amount, d.currency, d.paymentMethod) == (Decimal("12.99"), "EUR", "card")
    d = one("netflix 13 يورو")
    assert (d.amount, d.currency, d.paymentMethod) == (Decimal("13"), "EUR", "card")


@pytest.mark.parametrize(
    "line, method",
    [
        ("ستاغ 85 بنك", "bank"),
        ("ستاغ 85 بالبنك", "bank"),
        ("ستاغ 85 فيرمون", "bank"),
        ("قهوة 3 كاش", "cash"),
        ("قهوة 3 نقدا", "cash"),
        ("حوايج 120 بالكارطة", "bank"),  # local card = bank (TND)
        ("حوايج 120 كارطة", "bank"),
        ("حوايج 120 بالبطاقة", "bank"),
        ("خبز 1", "cash"),  # default
    ],
)
def test_payment_words(line, method):
    d = one(line)
    assert d.paymentMethod == method
    assert d.notes and "بنك" not in d.notes and "كارط" not in d.notes


# --- dates -------------------------------------------------------------------------

@pytest.mark.parametrize(
    "line, expected",
    [
        ("اليوم ليسونس 60", TODAY),
        ("ليسونس 60 البارح", date(2026, 11, 5)),
        ("البارحة قهوة 3", date(2026, 11, 5)),
        ("أمس خبز 1", date(2026, 11, 5)),
        ("أول البارح خبز 2", date(2026, 11, 4)),
        ("أول أمس خبز 2", date(2026, 11, 4)),
        ("الاثنين بنزين 70", date(2026, 11, 2)),
        ("الثنين بنزين 70", date(2026, 11, 2)),
        ("نهار الخميس قهوة 4", date(2026, 11, 5)),
        ("الحد حوت 25", date(2026, 11, 1)),
        ("السبت خضرة 12", date(2026, 10, 31)),
        ("3/11 ليسونس 60", date(2026, 11, 3)),
        ("ليسونس 60 03-11-2026", date(2026, 11, 3)),
        ("3 نوفمبر ليسونس 60", date(2026, 11, 3)),
        ("15/12 حوايج 40", date(2025, 12, 15)),  # never in the future
        ("lbere7 9ahwa 3", date(2026, 11, 5)),  # Arabizi
        ("hier essence 60", date(2026, 11, 5)),
    ],
)
def test_dates(line, expected):
    d = one(line)
    assert d.date == expected
    assert d.amount is not None
    assert d.category is not None


def test_weekday_word_is_not_left_in_notes():
    assert one("نهار الخميس قهوة مع صحابي 4").notes == "قهوة مع صحابي"


def test_decimal_is_not_a_date():
    d = one("حليب 12.5")
    assert (d.amount, d.date) == (Decimal("12.5"), TODAY)


# --- whole notes -------------------------------------------------------------------

def test_date_header_applies_to_following_lines():
    drafts = parse("3/11\nليسونس 60\nخبز 1\n\nالبارح\nnetflix 12€")
    assert [(d.date.day, d.category) for d in drafts] == [(3, "car"), (3, "food"), (5, "leisure")]


def test_list_markers_and_blank_lines_are_ignored():
    drafts = parse("- ليسونس 60\n* خبز 2\n1. حوايج 40\n• قهوة 3\n\n")
    assert [d.amount for d in drafts] == [Decimal(60), Decimal(2), Decimal(40), Decimal(3)]


def test_line_without_amount_is_kept_with_error():
    [d] = parse("نشري هدية لأختي")
    assert (d.error, d.amount, d.raw) == ("no_amount", None, "نشري هدية لأختي")


def test_notes_keep_the_original_words():
    d = one("البارح فرمسيان ابن سينا 23,5 د")
    assert d.notes == "فرمسيان ابن سينا"
    assert "فرمسيان" in d.keywords


def test_income():
    d = one("الشهرية 2500")
    assert (d.type, d.category, d.paymentMethod) == ("income", "salary", "bank")
    d = one("+300 خدمة فريلانس")
    assert (d.type, d.amount, d.category) == ("income", Decimal(300), None)


def test_rule_with_more_hits_wins():
    rules = {**RULES, normalize("كرهبة"): ("car", 5), normalize("حوت"): ("food", 2)}
    assert one("حوت للكرهبة 80", rules).category == "car"


def test_two_weeks_tunisian_note():
    note = """
    28/10
    ليسونس 60
    خبز وحليب 4,2
    netflix 12.99€
    30/10
    دوا 18
    حوايج من الفريب 35 بالكارطة
    البارح
    قهوة مع صحابي 6
    ستاغ 85 بالبنك
    نشري هدية
    """
    drafts = parse(note)
    assert [d.category for d in drafts] == ["car", "food", "leisure", "health", "clothes", "leisure", "bills", None]
    assert drafts[0].date == drafts[2].date == date(2026, 10, 28)
    assert drafts[3].date == drafts[4].date == date(2026, 10, 30)
    assert drafts[5].date == drafts[6].date == date(2026, 11, 5)
    assert [d.paymentMethod for d in drafts[4:7]] == ["bank", "cash", "bank"]
    assert (drafts[2].paymentMethod, drafts[2].currency) == ("card", "EUR")  # netflix €
    assert drafts[7].error == "no_amount"
