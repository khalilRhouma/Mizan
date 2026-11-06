"""Text normalization for matching words in Arabic, French and English.

Same idea as normalizeSearchText() in src/pages/LogPage.jsx, plus accents and
Arabic-Indic digits:
    "Essence"  -> "essence"     "Pharmacie" -> "pharmacie"
    "صيدليّة"   -> "صيدليه"       "إيجار"     -> "ايجار"
    "٦٠"       -> "60"           "Café"      -> "cafe"
"""

import re
import unicodedata

_ARABIC_MAP = str.maketrans({
    "ة": "ه",
    "ى": "ي",
    "ـ": "",  # tatweel
    # Arabic-Indic and Persian digits -> ASCII
    **{chr(0x0660 + i): str(i) for i in range(10)},
    **{chr(0x06F0 + i): str(i) for i in range(10)},
    "٫": ".",  # Arabic decimal separator
    "٬": ",",
})

_WORD_RE = re.compile(r"[^\W\d_]+", re.UNICODE)  # letters only

STOPWORDS = frozenset({
    # en
    "the", "for", "and", "with", "from", "of", "a", "an", "to", "on", "in", "at",
    # fr
    "de", "du", "des", "la", "le", "les", "pour", "et", "avec", "un", "une", "au", "aux", "en", "sur",
    # ar (already normalized)
    "في", "من", "علي", "على", "الي", "و", "مع", "عن", "ل", "ب",
})


def normalize(text: str) -> str:
    """Lowercase, remove accents and Arabic diacritics, unify Arabic letters."""
    decomposed = unicodedata.normalize("NFKD", text)
    no_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    # NFKD splits أ/إ/آ into ا + a mark, so removing marks already gives ا.
    return unicodedata.normalize("NFC", no_marks).translate(_ARABIC_MAP).lower()


def keywords(text: str, limit: int = 4) -> list[str]:
    """Meaningful normalized words (letters only, >= 2 chars, no stopwords)."""
    out: list[str] = []
    for word in _WORD_RE.findall(normalize(text)):
        if len(word) < 2 or word in STOPWORDS or word in out:
            continue
        out.append(word)
        if len(out) == limit:
            break
    return out
