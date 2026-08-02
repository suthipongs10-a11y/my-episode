"""Language detection with the standard library only.

Two-stage, deterministic, and fast:

1. Script detection by Unicode range. This alone identifies Thai, Japanese,
   Korean, Chinese, Cyrillic, Arabic, Hebrew, Devanagari and Greek reliably —
   these scripts map almost 1:1 to a language for our purposes.
2. For Latin script, a stopword-frequency vote across the major web languages.

We do not need academic accuracy; we need "which language should the drafted
comment be written in", and the site's own declared <html lang> is used as a
strong prior on top of this. Returns (lang_code, confidence 0..1).
"""
from __future__ import annotations

import re
from collections import Counter
from typing import Optional

# --- Unicode script ranges (start, end, lang) -------------------------------
_SCRIPT_RANGES = [
    (0x0E00, 0x0E7F, "th"),   # Thai
    (0xAC00, 0xD7A3, "ko"),   # Hangul syllables
    (0x1100, 0x11FF, "ko"),   # Hangul jamo
    (0x3040, 0x309F, "ja"),   # Hiragana
    (0x30A0, 0x30FF, "ja"),   # Katakana
    (0x0400, 0x04FF, "ru"),   # Cyrillic
    (0x0600, 0x06FF, "ar"),   # Arabic
    (0x0590, 0x05FF, "he"),   # Hebrew
    (0x0900, 0x097F, "hi"),   # Devanagari
    (0x0370, 0x03FF, "el"),   # Greek
]
# CJK ideographs are shared by Chinese and Japanese. Handled specially below.
_CJK = (0x4E00, 0x9FFF)

# --- Latin-script stopwords (small, high-signal sets) -----------------------
_STOPWORDS: dict[str, set[str]] = {
    "en": {"the", "and", "for", "are", "with", "you", "this", "that", "have",
           "from", "your", "our", "was", "will", "can", "how", "what", "about"},
    "es": {"el", "la", "los", "las", "de", "que", "por", "para", "con", "una",
           "como", "más", "pero", "este", "esta", "porque", "muy", "también"},
    "fr": {"le", "la", "les", "des", "une", "que", "pour", "avec", "sur",
           "dans", "est", "pas", "vous", "nous", "plus", "cette", "mais"},
    "de": {"der", "die", "das", "und", "ist", "nicht", "ein", "eine", "mit",
           "auf", "für", "auch", "sich", "aber", "wie", "was", "sind", "wir"},
    "pt": {"que", "não", "uma", "com", "para", "por", "como", "mais", "mas",
           "você", "isso", "está", "são", "também", "porque", "muito"},
    "it": {"che", "non", "una", "per", "con", "come", "più", "questo", "sono",
           "anche", "della", "delle", "ma", "molto", "perché", "loro"},
    "id": {"yang", "dan", "untuk", "dengan", "ini", "itu", "tidak", "adalah",
           "pada", "dari", "akan", "atau", "juga", "kami", "bisa", "saya"},
    "nl": {"de", "het", "een", "van", "en", "dat", "niet", "met", "voor",
           "zijn", "aan", "ook", "maar", "deze", "kan", "hoe", "wat"},
    "vi": {"và", "của", "là", "cho", "không", "với", "này", "được", "các",
           "những", "một", "người", "cũng", "để", "khi", "trong"},
}

_WORD_RE = re.compile(r"[a-zà-ÿğışćčžšđ]+", re.IGNORECASE)


def _script_counts(text: str) -> Counter:
    counts: Counter = Counter()
    cjk = 0
    for ch in text:
        cp = ord(ch)
        if _CJK[0] <= cp <= _CJK[1]:
            cjk += 1
            continue
        for lo, hi, lang in _SCRIPT_RANGES:
            if lo <= cp <= hi:
                counts[lang] += 1
                break
    if cjk:
        counts["_cjk"] = cjk
    return counts


def detect(text: Optional[str], declared: Optional[str] = None) -> tuple[str, float]:
    """Return (lang_code, confidence). `declared` (from <html lang>) is a prior.

    Confidence is a rough 0..1 useful for gating, not a probability.
    """
    text = (text or "").strip()
    declared = _normalise_lang(declared)
    if not text:
        return (declared or "en", 0.2 if declared else 0.0)

    # Non-Latin scripts are decisive when they dominate the letters we can see.
    sc = _script_counts(text)
    letters = sum(sc.values())
    if letters:
        top_lang, top_count = sc.most_common(1)[0]
        share = top_count / letters
        if top_lang == "_cjk":
            # CJK ideographs with no kana -> treat as Chinese unless declared ja.
            lang = "ja" if declared == "ja" else "zh"
            return (lang, min(0.95, 0.6 + share * 0.4))
        if share >= 0.30:
            return (top_lang, min(0.98, 0.6 + share * 0.4))

    # Latin script -> stopword vote.
    words = _WORD_RE.findall(text.lower())
    if not words:
        return (declared or "en", 0.3 if declared else 0.1)
    wordset = Counter(words)
    scores: dict[str, int] = {}
    for lang, stops in _STOPWORDS.items():
        scores[lang] = sum(wordset[w] for w in stops)
    # Vietnamese also carries distinctive diacritics; boost if present.
    if re.search(r"[ăâđêôơư]", text):
        scores["vi"] = scores.get("vi", 0) + 5
    best_lang = max(scores, key=lambda k: scores[k])
    best = scores[best_lang]
    total = sum(scores.values())
    if best == 0:
        # No stopwords matched at all; fall back to the declared language.
        return (declared or "en", 0.25)
    conf = best / total if total else 0.0
    # A declared language that agrees with the vote raises confidence.
    if declared and declared == best_lang:
        conf = min(1.0, conf + 0.2)
    return (best_lang, round(min(conf, 0.97), 3))


def _normalise_lang(lang: Optional[str]) -> Optional[str]:
    """'en-US' -> 'en'; strip whitespace; lowercase; drop empties."""
    if not lang:
        return None
    lang = lang.strip().lower().replace("_", "-")
    if not lang:
        return None
    return lang.split("-")[0]


# Human-readable names, used by the drafter and reports.
LANG_NAMES = {
    "en": "English", "th": "Thai", "ja": "Japanese", "ko": "Korean",
    "zh": "Chinese", "ru": "Russian", "ar": "Arabic", "he": "Hebrew",
    "hi": "Hindi", "el": "Greek", "es": "Spanish", "fr": "French",
    "de": "German", "pt": "Portuguese", "it": "Italian", "id": "Indonesian",
    "nl": "Dutch", "vi": "Vietnamese",
}


def name(code: str) -> str:
    return LANG_NAMES.get(_normalise_lang(code) or "", code)
