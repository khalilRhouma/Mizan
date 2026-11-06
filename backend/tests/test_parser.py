"""Parser unit tests with realistic (fake) phone-note lines. No database needed."""

from datetime import date
from decimal import Decimal

import pytest

from app.categories import CATEGORY_TYPES
from app.parser import parse_text
from app.text import normalize

TODAY = date(2026, 11, 6)  # a Friday

RULES = {
    normalize(word): (category, 1)
    for category, words in {
        "car": ["essence", "gas", "بنزين", "وقود", "parking"],
        "food": ["pain", "lait", "خبز", "مشتريات", "carrefour"],
        "clothes": ["chemise", "pantalon", "حذاء", "ملابس"],
        "health": ["pharmacie", "صيدلية", "دواء"],
        "bills": ["steg", "فاتورة", "internet"],
        "leisure": ["netflix", "قهوة"],
        "salary": ["salaire", "راتب"],
    }.items()
    for word in words
}


def parse(text: str, rules=RULES):
    return parse_text(text, TODAY, rules, CATEGORY_TYPES)


def one(text: str, rules=RULES):
    [draft] = parse(text, rules)
    return draft


@pytest.mark.parametrize(
    "line, amount, category",
    [
        ("gas 60", "60", "car"),
        ("60 essence", "60", "car"),
        ("بنزين 50", "50", "car"),
        ("وقود ٥٠", "50", "car"),  # Arabic-Indic digits
        ("chemise 45,5", "45.5", "clothes"),
        ("pharmacie 12.750 dt", "12.750", "health"),
        ("صيدلية 30 دينار", "30", "health"),
        ("2 pantalons 90", "90", "clothes"),  # largest number when no currency mark
        ("pain 0,9", "0.9", "food"),
    ],
)
def test_amount_and_category(line, amount, category):
    d = one(line)
    assert d.amount == Decimal(amount)
    assert d.category == category
    assert d.error is None
    assert d.type == "expense"
    assert d.currency == "TND"
    assert d.date == TODAY


def test_currency_mark_wins_over_bigger_number():
    d = one("parking 3h 2000 meters 4dt")
    assert d.amount == Decimal("4")


def test_euro_means_card():
    d = one("netflix 12.99€")
    assert (d.amount, d.currency, d.paymentMethod, d.category) == (Decimal("12.99"), "EUR", "card", "leisure")
    d = one("netflix 13 eur")
    assert (d.amount, d.currency, d.paymentMethod) == (Decimal("13"), "EUR", "card")


def test_payment_words():
    assert one("steg 85 bank").paymentMethod == "bank"
    assert one("قهوة 3 كاش").paymentMethod == "cash"
    assert one("خبز 1").paymentMethod == "cash"  # default


@pytest.mark.parametrize(
    "line, expected",
    [
        ("gas 60 hier", date(2026, 11, 5)),
        ("أمس بنزين 60", date(2026, 11, 5)),
        ("البارحة قهوة 3", date(2026, 11, 5)),
        ("أول أمس خبز 2", date(2026, 11, 4)),
        ("avant-hier pain 2", date(2026, 11, 4)),
        ("lundi essence 70", date(2026, 11, 2)),
        ("الاثنين بنزين 70", date(2026, 11, 2)),
        ("3/11 gas 60", date(2026, 11, 3)),
        ("gas 60 03-11-2026", date(2026, 11, 3)),
        ("3 nov gas 60", date(2026, 11, 3)),
        ("15/12 chemise 40", date(2025, 12, 15)),  # never in the future
        ("2026-10-30 lait 3", date(2026, 10, 30)),
    ],
)
def test_dates(line, expected):
    d = one(line)
    assert d.date == expected
    assert d.amount is not None


def test_decimal_is_not_a_date():
    d = one("lait 12.5")
    assert (d.amount, d.date) == (Decimal("12.5"), TODAY)


def test_date_header_applies_to_following_lines():
    drafts = parse("3/11\ngas 60\npain 2\n\n5/11\nnetflix 12€")
    assert [(d.date.day, d.category) for d in drafts] == [(3, "car"), (3, "food"), (5, "leisure")]


def test_list_markers_and_blank_lines_are_ignored():
    drafts = parse("- gas 60\n* pain 2\n1. chemise 40\n\n")
    assert [d.amount for d in drafts] == [Decimal(60), Decimal(2), Decimal(40)]


def test_line_without_amount_is_kept_with_error():
    [d] = parse("acheter du pain")
    assert d.error == "no_amount"
    assert d.amount is None
    assert d.raw == "acheter du pain"


def test_unknown_word_has_no_category():
    d = one("random thing 25")
    assert (d.category, d.categorySource, d.amount) == (None, None, Decimal(25))


def test_fuzzy_match_for_typos():
    d = one("essance 60")
    assert (d.category, d.categorySource) == ("car", "fuzzy")


def test_arabic_article_is_ignored():
    assert one("الصيدلية 20").category == "health"


def test_notes_keep_the_original_words():
    d = one("hier Pharmacie Ibn Sina 23,5 dt")
    assert d.notes == "Pharmacie Ibn Sina"
    assert "pharmacie" in d.keywords


def test_income():
    d = one("salaire 2500")
    assert (d.type, d.category, d.paymentMethod) == ("income", "salary", "bank")
    d = one("+300 freelance")
    assert (d.type, d.amount, d.category) == ("income", Decimal(300), None)


def test_rule_with_more_hits_wins():
    rules = {**RULES, "station": ("car", 5), "carrefour": ("food", 2)}
    assert one("carrefour station 80", rules).category == "car"


def test_mixed_note_from_two_weeks():
    note = """
    28/10
    essence 60
    pain et lait 4,2
    netflix 12.99€
    30/10
    صيدلية 18
    chemise H&M 79 carte
    hier
    قهوة مع صحاب 6
    buy gift
    """
    drafts = parse(note)
    assert len(drafts) == 7
    assert [d.category for d in drafts] == ["car", "food", "leisure", "health", "clothes", "leisure", None]
    assert drafts[0].date == drafts[2].date == date(2026, 10, 28)
    assert drafts[3].date == date(2026, 10, 30)
    assert drafts[4].paymentMethod == "card"
    assert drafts[5].date == date(2026, 11, 5)  # under the "hier" header
    assert drafts[6].error == "no_amount"
