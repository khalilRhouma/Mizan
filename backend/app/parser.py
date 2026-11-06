"""Quick-add parser: turn free text like "gas 60" into draft transactions.

Rules only, no AI. One line = one transaction. For each line:

  amount    the number with a currency mark (60dt, 12€), else next to a
            currency word, else the largest number. "45,5" = 45.5.
            A leading "+" means income.
  currency  €, eur, euro, يورو -> EUR (paid by card). Default TND.
  payment   cash/نقد/كاش, carte/card/بطاقة, bank/virement/بنك. Default cash.
  date      today/hier/أمس, weekday names, 3/11, 03-11-2026, "3 nov"
            (parsed by dateparser, day first, never in the future).
            A line with a date and no amount sets the date for the lines
            below it. Default: today.
  category  remaining words matched against the learned rules (exact, then
            fuzzy for typos with rapidfuzz). The rule with most hits wins.
  notes     the remaining words, as written.

Lines that cannot be read are returned with an `error`, never dropped.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

import dateparser
from rapidfuzz import fuzz, process

from app.text import STOPWORDS, normalize

# --- vocabularies (normalized forms) -----------------------------------------

_RELATIVE_DAYS = {
    "today": 0, "aujourd'hui": 0, "aujourdhui": 0, "auj": 0, "اليوم": 0,
    "yesterday": 1, "hier": 1, "امس": 1, "البارحه": 1, "البارح": 1, "lbere7": 1,
    "avant-hier": 2,
}
_RELATIVE_PAIRS = {("اول", "امس"): 2, ("avant", "hier"): 2, ("day", "before"): 2}

_WEEKDAYS = {
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
    "الاثنين", "الإثنين", "الثلاثاء", "الاربعاء", "الخميس", "الجمعه", "السبت", "الاحد",
}
_WEEKDAYS = {normalize(w) for w in _WEEKDAYS}

_MONTH_PREFIXES = (
    "jan", "feb", "fev", "mar", "apr", "avr", "may", "mai", "jun", "juin", "jul", "juil",
    "aug", "aou", "sep", "oct", "nov", "dec",
    "جانفي", "فيفري", "مارس", "افريل", "ماي", "جوان", "جويليه", "اوت", "سبتمبر", "اكتوبر", "نوفمبر", "ديسمبر",
)

_EUR_WORDS = {"eur", "euro", "euros", "يورو", "اورو", "€"}
_TND_WORDS = {"dt", "tnd", "dinar", "dinars", "دينار", "د.ت", "دت", "مليم", "millimes"}
_PAYMENT_WORDS = {
    "cash": {"cash", "كاش", "نقد", "نقدا", "espece", "especes", "liquide"},
    "card": {"card", "carte", "cb", "visa", "بطاقه"},
    "bank": {"bank", "banque", "virement", "بنك", "تحويل"},
}

_DATE_TOKEN_RE = re.compile(
    r"^(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\.\d{1,2}\.\d{2,4})$"
)
_AMOUNT_RE = re.compile(
    r"^(?P<sign>[+-])?(?P<pre>€)?(?P<num>\d+(?:[.,]\d{1,3})?)(?P<suf>€|dt|tnd|eur|د\.?ت)?$"
)
_LIST_MARKER_RE = re.compile(r"^\s*(?:[-*•–]|\d+[.)])\s+")
_EDGE_PUNCT = ",;:!?()[]\"'«»"

_DATEPARSER_SETTINGS = {"DATE_ORDER": "DMY", "PREFER_DATES_FROM": "past"}
_LANGS = ["ar", "fr", "en"]

FUZZY_MIN_SCORE = 85
FUZZY_MIN_LENGTH = 4


@dataclass
class Draft:
    line: int
    raw: str
    date: date
    amount: Decimal | None = None
    currency: str = "TND"
    paymentMethod: str = "cash"
    type: str = "expense"
    category: str | None = None
    categorySource: str | None = None  # "rule" | "fuzzy" | None
    notes: str = ""
    keywords: list[str] = field(default_factory=list)
    error: str | None = None  # "no_amount"


# Rules: normalized keyword -> (category, hits). Built by the caller.
Rules = dict[str, tuple[str, int]]


def parse_text(text: str, today: date, rules: Rules, category_types: dict[str, str]) -> list[Draft]:
    drafts: list[Draft] = []
    header_date: date | None = None
    for index, raw_line in enumerate(text.splitlines(), start=1):
        line = _LIST_MARKER_RE.sub("", raw_line).strip()
        if not line:
            continue
        draft, is_date_header = _parse_line(line, index, header_date or today, today, rules, category_types)
        if is_date_header:
            header_date = draft.date
            continue
        drafts.append(draft)
    return drafts


def _parse_line(
    line: str, index: int, default_date: date, today: date, rules: Rules, category_types: dict[str, str]
) -> tuple[Draft, bool]:
    tokens = line.split()
    norm = [normalize(t).strip(_EDGE_PUNCT) for t in tokens]
    used: set[int] = set()
    draft = Draft(line=index, raw=line, date=default_date)

    found_date = _find_date(norm, used, today)
    if found_date:
        draft.date = found_date

    currency, payment = _find_currency_and_payment(norm, used)
    amount, sign = _find_amount(norm, used)

    rest = [i for i in range(len(tokens)) if i not in used]
    if amount is None and found_date and not any(_is_word(norm[i]) for i in rest):
        return draft, True  # date header line

    draft.amount = amount
    if amount is None:
        draft.error = "no_amount"
    if currency:
        draft.currency = currency
    if draft.currency == "EUR":
        draft.paymentMethod = "card"
    elif payment:
        draft.paymentMethod = payment
        if payment == "card":
            draft.currency = "EUR"  # the app treats card payments as EUR

    draft.notes = " ".join(tokens[i] for i in rest).strip(" -–:,")
    draft.keywords = [w for i in rest for w in [norm[i]] if _is_word(w) and w not in STOPWORDS][:4]

    category, source = _guess_category(draft.keywords, rules)
    draft.category, draft.categorySource = category, source
    if sign == "+" or (category and category_types.get(category) == "income"):
        draft.type = "income"
        if category and category_types.get(category) != "income":
            draft.category, draft.categorySource = None, None
        if draft.paymentMethod == "cash" and not payment:
            draft.paymentMethod = "bank"
    return draft, False


# --- pieces ------------------------------------------------------------------

def _is_word(token: str) -> bool:
    return any(ch.isalpha() for ch in token) and len(token) >= 2


def _find_date(norm: list[str], used: set[int], today: date) -> date | None:
    for i, tok in enumerate(norm):
        if i + 1 < len(norm) and (tok, norm[i + 1]) in _RELATIVE_PAIRS:
            used.update({i, i + 1})
            return today - timedelta(days=_RELATIVE_PAIRS[(tok, norm[i + 1])])
        if tok in _RELATIVE_DAYS:
            used.add(i)
            return today - timedelta(days=_RELATIVE_DAYS[tok])
        if tok in _WEEKDAYS or _DATE_TOKEN_RE.match(tok):
            parsed = _dateparse(tok, today)
            if parsed:
                used.add(i)
                return parsed
        if tok.isdigit() and i + 1 < len(norm) and norm[i + 1].startswith(_MONTH_PREFIXES):
            parsed = _dateparse(f"{tok} {norm[i + 1]}", today)
            if parsed:
                used.update({i, i + 1})
                return parsed
    return None


def _dateparse(text: str, today: date) -> date | None:
    base = datetime(today.year, today.month, today.day, 12)
    parsed = dateparser.parse(text, languages=_LANGS, settings={**_DATEPARSER_SETTINGS, "RELATIVE_BASE": base})
    if parsed is None:
        return None
    result = parsed.date()
    if result > today:  # notes are about the past
        try:
            result = result.replace(year=result.year - 1)
        except ValueError:  # 29 Feb
            return None
    return result


def _find_currency_and_payment(norm: list[str], used: set[int]) -> tuple[str | None, str | None]:
    currency = payment = None
    for i, tok in enumerate(norm):
        if i in used:
            continue
        if "€" in tok:
            currency = "EUR"  # the token may also hold the number (12€): not marked used
        elif tok in _EUR_WORDS:
            currency = "EUR"
            used.add(i)
        elif tok in _TND_WORDS:
            currency = currency or "TND"
            used.add(i)
        else:
            for method, words in _PAYMENT_WORDS.items():
                if tok in words:
                    payment = method
                    used.add(i)
    return currency, payment


def _find_amount(norm: list[str], used: set[int]) -> tuple[Decimal | None, str | None]:
    candidates: list[tuple[int, int, Decimal, str | None]] = []  # (priority, index, value, sign)
    for i, tok in enumerate(norm):
        if i in used:
            continue
        m = _AMOUNT_RE.match(tok)
        if not m:
            continue
        try:
            value = Decimal(m["num"].replace(",", "."))
        except InvalidOperation:
            continue
        if value <= 0:
            continue
        marked = bool(m["pre"] or m["suf"])
        near_currency = any(j in used and norm[j] in (_EUR_WORDS | _TND_WORDS) for j in (i - 1, i + 1))
        priority = 2 if marked else 1 if near_currency else 0
        candidates.append((priority, i, value, m["sign"]))
    if not candidates:
        return None, None
    priority, index, value, sign = max(candidates, key=lambda c: (c[0], c[2]))
    used.add(index)
    return value, sign


def _strip_article(word: str) -> str:
    for prefix in ("وال", "بال", "لل", "ال"):
        if word.startswith(prefix) and len(word) - len(prefix) >= 2:
            return word[len(prefix):]
    return word


def _guess_category(keywords: list[str], rules: Rules) -> tuple[str | None, str | None]:
    best: tuple[int, str] | None = None
    for word in keywords:
        for variant in {word, _strip_article(word)}:
            if variant in rules:
                category, hits = rules[variant]
                if best is None or hits > best[0]:
                    best = (hits, category)
    if best:
        return best[1], "rule"

    choices = [k for k in rules if len(k) >= FUZZY_MIN_LENGTH]
    for word in keywords:
        variant = _strip_article(word)
        if len(variant) < FUZZY_MIN_LENGTH:
            continue
        match = process.extractOne(variant, choices, scorer=fuzz.ratio, score_cutoff=FUZZY_MIN_SCORE)
        if match:
            return rules[match[0]][0], "fuzzy"
    return None, None
