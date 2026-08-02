"""Text feature extraction shared by the profiler and the relevance scorer.

Two jobs:

1. **Terms for similarity.** Languages that separate words with spaces get
   word unigrams + bigrams. Thai, Japanese, Chinese and Korean do not put
   spaces between words, and we have no tokeniser for them, so those get
   character n-grams instead — a standard trick that works well for cosine
   similarity without needing a dictionary.

2. **Human-readable keyphrases.** Frequency-ranked phrases drawn from the
   places a site states its own topic: title, meta description, headings and
   anchor text. These are what we show you and feed into search footprints, so
   they have to read like something a person would type into Google.

Everything is stdlib.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from typing import Iterable, Optional

# Scripts that do not delimit words with spaces -> use character n-grams.
_NO_SPACE_LANGS = {"th", "ja", "zh", "ko"}

_WORD_RE = re.compile(r"[^\W\d_]{2,}", re.UNICODE)
_THAI_RE = re.compile(r"[฀-๿]")
_CJK_RE = re.compile(r"[぀-ヿ一-鿿가-힣]")

# Whole phrases that are site furniture, not subject matter. These come from
# navigation and page titles, repeat on every page, and would otherwise
# outrank the real topic — "about us" is not what any site is about.
_BOILERPLATE = {
    # English
    "about", "about us", "contact", "contact us", "home", "home page",
    "our services", "services", "service", "products", "our products",
    "blog", "news", "articles", "resources", "faq", "faqs", "support",
    "privacy policy", "terms of service", "terms and conditions", "sitemap",
    "log in", "login", "sign up", "sign in", "register", "my account",
    "read more", "learn more", "get started", "free trial", "book now",
    "our team", "our story", "careers", "pricing", "testimonials", "gallery",
    # Thai
    "เกี่ยวกับเรา", "เกี่ยวกับ", "ติดต่อเรา", "ติดต่อ", "หน้าแรก", "บริการ",
    "บริการของเรา", "สินค้า", "สินค้าของเรา", "บทความ", "ข่าวสาร", "ข่าว",
    "คำถามที่พบบ่อย", "นโยบายความเป็นส่วนตัว", "เงื่อนไขการใช้บริการ",
    "เข้าสู่ระบบ", "สมัครสมาชิก", "อ่านต่อ", "ดูเพิ่มเติม", "ทีมงาน",
    "ผลงาน", "ราคา", "แกลเลอรี่", "รีวิว", "ร่วมงานกับเรา", "แผนผังเว็บไซต์",
}

# Thai has no spaces between words, but it does have high-frequency connectors
# that reliably sit at a phrase boundary. Splitting on them turns one
# unsearchably long string into the two or three real keyphrases inside it:
# "ระบบวางแผนชำระหนี้และบริหารสินเชื่อ" -> "ระบบวางแผนชำระหนี้", "บริหารสินเชื่อ".
_TH_CONNECTORS = [
    "และ", "หรือ", "ให้", "ของ", "ที่", "เพื่อ", "โดย", "จาก", "กับ",
    "แบบ", "ด้วย", "ตาม", "ใน", "อย่าง", "ซึ่ง", "แต่", "เป็น",
]
_TH_SPLIT_RE = re.compile("|".join(re.escape(c) for c in _TH_CONNECTORS))

# Words too generic to describe what a site is about. Kept small and obvious;
# the IDF-style weighting below handles the long tail.
_STOP = {
    # English
    "the", "and", "for", "are", "with", "you", "this", "that", "have", "from",
    "your", "our", "was", "will", "can", "how", "what", "about", "all", "more",
    "get", "not", "but", "has", "was", "were", "they", "their", "them", "its",
    "we", "us", "or", "if", "on", "in", "at", "to", "of", "by", "as", "an",
    "is", "it", "be", "do", "does", "new", "one", "two", "may", "also", "any",
    "home", "page", "site", "website", "click", "here", "read", "more", "menu",
    "search", "login", "sign", "register", "contact", "privacy", "policy",
    "terms", "cookie", "cookies", "copyright", "rights", "reserved", "skip",
    "content", "navigation", "toggle", "close", "open", "share", "follow",
    "email", "address", "phone", "submit", "send", "back", "next", "previous",
    "learn", "view", "see", "use", "using", "make", "made", "help", "need",
    # Thai (space-separated function words that still show up in phrases)
    "และ", "หรือ", "ของ", "ที่", "ใน", "การ", "ความ", "เป็น", "ได้", "ให้",
    "กับ", "จาก", "โดย", "แต่", "ก็", "จะ", "มี", "ไม่", "นี้", "นั้น",
    "เรา", "คุณ", "ครับ", "ค่ะ", "เพิ่มเติม", "หน้าแรก", "ติดต่อ", "เข้าสู่ระบบ",
    "สมัครสมาชิก", "ค้นหา", "อ่านต่อ",
}


def script_of(text: str) -> str:
    """'th', 'cjk' or 'latin' — which tokenisation strategy this text needs."""
    if not text:
        return "latin"
    sample = text[:4000]
    if len(_THAI_RE.findall(sample)) >= 10:
        return "th"
    if len(_CJK_RE.findall(sample)) >= 10:
        return "cjk"
    return "latin"


def needs_ngrams(lang: Optional[str], text: str = "") -> bool:
    if lang and lang.lower().split("-")[0] in _NO_SPACE_LANGS:
        return True
    return script_of(text) in ("th", "cjk")


def _char_ngrams(text: str, n: int = 3) -> list[str]:
    """Character n-grams over the non-Latin runs of the text."""
    # Keep letters only; collapse everything else to a separator so n-grams
    # never straddle unrelated words.
    cleaned = re.sub(r"[\s\d_\W]+", " ", text, flags=re.UNICODE)
    grams = []
    for chunk in cleaned.split():
        if len(chunk) < n:
            if len(chunk) >= 2:
                grams.append(chunk)
            continue
        for i in range(len(chunk) - n + 1):
            grams.append(chunk[i:i + n])
    return grams


def terms(text: str, lang: Optional[str] = None) -> Counter:
    """Weighted term counts suitable for cosine similarity."""
    text = (text or "").lower()
    if not text.strip():
        return Counter()
    if needs_ngrams(lang, text):
        return Counter(_char_ngrams(text, 3))
    words = [w for w in _WORD_RE.findall(text) if w not in _STOP and len(w) > 2]
    counts = Counter(words)
    # Bigrams capture "coffee brewing" vs "coffee" + "brewing".
    counts.update(f"{a} {b}" for a, b in zip(words, words[1:]))
    return counts


def cosine(a: Counter, b: Counter) -> float:
    """Cosine similarity of two term vectors, with sublinear TF damping.

    Damping (1 + log tf) stops a page that repeats one word 200 times from
    dominating the vector — common on landing pages and category listings.
    """
    if not a or not b:
        return 0.0
    shared = set(a) & set(b)
    if not shared:
        return 0.0

    def w(c: Counter, k: str) -> float:
        return 1.0 + math.log(c[k]) if c[k] > 0 else 0.0

    dot = sum(w(a, k) * w(b, k) for k in shared)
    na = math.sqrt(sum(w(a, k) ** 2 for k in a))
    nb = math.sqrt(sum(w(b, k) ** 2 for k in b))
    if na == 0 or nb == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (na * nb)))


def keyphrases(
    sources: Iterable[tuple[str, float]],
    lang: Optional[str] = None,
    limit: int = 15,
) -> list[tuple[str, float]]:
    """Rank human-readable keyphrases.

    `sources` is (text, weight) pairs — a title is worth more than body text.
    Returns [(phrase, score)] sorted best first.
    """
    scores: Counter = Counter()
    is_ngram_lang = False
    for text, weight in sources:
        if not text:
            continue
        if needs_ngrams(lang, text):
            is_ngram_lang = True
        for phrase in _candidate_phrases(text, is_ngram_lang):
            scores[phrase] += weight

    # Drop phrases that are contained in a higher-scoring phrase: keep
    # "coffee brewing guide" over "coffee brewing" when both rank similarly.
    ranked = scores.most_common(limit * 4)
    kept: list[tuple[str, float]] = []
    for phrase, sc in ranked:
        if any(phrase != other and phrase in other and osc >= sc * 0.8
               for other, osc in ranked):
            continue
        kept.append((phrase, round(sc, 2)))
        if len(kept) >= limit:
            break
    return kept


def _split_thai(chunk: str, max_len: int = 26) -> list[str]:
    """Break a long Thai clause into searchable phrases at word boundaries.

    Short chunks are returned as-is: splitting "ปลดหนี้บัตรเครดิต" would only
    damage it. Long ones are cut at the boundaries Thai actually gives us —
    spaces between phrases, then high-frequency connectors.

    Anything still too long is dropped rather than truncated. Cutting Thai at a
    fixed character count lands mid-word and produces a string that matches
    nothing ("เครื่องมือวางแผนชำระหนี้ ค"), which is worse than no keyword.
    """
    chunk = chunk.strip()
    if len(chunk) <= max_len:
        return [chunk]

    pieces: list[str] = []
    for part in chunk.split():                 # Thai does space-separate phrases
        part = part.strip()
        if not part:
            continue
        if len(part) <= max_len:
            pieces.append(part)
            continue
        for sub in _TH_SPLIT_RE.split(part):   # then split on connectors
            sub = sub.strip()
            if 4 <= len(sub) <= max_len:
                pieces.append(sub)
    return pieces


def _usable_phrase(phrase: str) -> bool:
    """Is this phrase worth keeping as a topic candidate?"""
    p = phrase.strip().lower()
    if len(p) < 3 or len(p) > 40:
        return False
    if p in _STOP or p in _BOILERPLATE:
        return False
    if p.isdigit():
        return False
    return True


def _candidate_phrases(text: str, ngram_lang: bool) -> list[str]:
    """Phrase candidates from one piece of text."""
    text = re.sub(r"\s+", " ", (text or "")).strip()
    if not text:
        return []
    out = []
    # Split on punctuation that separates ideas, keeping the chunks intact.
    for chunk in re.split(r"[|·•\-–—:;,/\\()\[\]{}!?\"'“”…]+|\.\s", text):
        chunk = chunk.strip().lower()
        if not chunk or len(chunk) < 3:
            continue
        if ngram_lang:
            # Thai/CJK: the chunk between separators is a phrase, but it can be
            # a whole clause. Split it on connectors so the pieces are short
            # enough to be searchable, and keep the whole chunk too when it is
            # already short.
            for piece in _split_thai(chunk):
                if _usable_phrase(piece):
                    out.append(piece)
            continue
        if chunk in _BOILERPLATE:
            continue
        words = [w for w in _WORD_RE.findall(chunk) if len(w) > 2]
        meaningful = [w for w in words if w not in _STOP]
        if not meaningful:
            continue
        # unigrams (meaningful only) and 2-3 word windows
        out.extend(w for w in meaningful if _usable_phrase(w))
        for n in (2, 3):
            for i in range(len(words) - n + 1):
                window = words[i:i + n]
                if window[0] in _STOP or window[-1] in _STOP:
                    continue
                if all(w in _STOP for w in window):
                    continue
                phrase = " ".join(window)
                if _usable_phrase(phrase):
                    out.append(phrase)
    return out
