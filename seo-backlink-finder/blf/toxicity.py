"""Is this page one you want your name next to?

Authority was the only thing pulling quality up, and nothing pulled it down.
So a domain with a decent Open PageRank that happens to contain your keywords
scored well — even if the page is four hundred outbound links to casinos with
nine words of text between them. That is not a neutral link. Google's link
schemes guidance treats participation in that as a reason to discount or
penalise a site, so the tool was capable of recommending something actively
worse than doing nothing.

What we can see for free, from the page already in memory:

* **Link density.** A page with far more outbound links than sentences is a
  list, not an article. Directories are legitimately link-dense, so density is
  read against the opportunity type rather than in absolute terms.
* **Company kept.** Outbound links to the verticals that dominate link
  networks — casino, pharma, adult, payday loans, replica goods. One is an
  accident; a quarter of the page is a business model.
* **Paid-link language.** "Sponsored post", "buy backlink", "รับทำ SEO
  ราคาถูก" — a page advertising that it sells links is telling you what your
  link will be worth.
* **Keyword stuffing.** One phrase at absurd frequency is the oldest signal
  there is.

Every one of these is a heuristic, so the output is a **risk score with its
reasons attached**, never a silent verdict. The operator reads why and decides;
the score only stops the page being ranked as a prize.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable, Optional

# Verticals that dominate paid-link networks. Matched against the registrable
# domain of outbound links, so "casino" in an article's prose is not a hit.
_SPAM_VERTICALS = {
    "casino": ["casino", "slot", "betting", "poker", "baccarat", "gambl",
               "judi", "togel", "bandar", "แทงบอล", "บาคาร่า", "สล็อต"],
    "pharma": ["viagra", "cialis", "tramadol", "pharmacy", "pills"],
    "adult": ["porn", "xxx", "escort", "sexcam", "webcam"],
    "loans": ["payday", "quickloan", "cashadvance", "เงินกู้", "เงินด่วน"],
    "replica": ["replica", "rolexcopy", "fakewatch"],
}

# Phrases that mean the page sells placements.
_PAID_LINK_PHRASES = [
    "sponsored post", "paid guest post", "buy backlink", "buy backlinks",
    "link building service", "guest post service", "pbn",
    "รับทำ seo", "ขายบทความ", "รับวางลิงก์", "ซื้อบทความ", "รับโพสต์",
]

# Types where a lot of outbound links is the whole point.
_LINK_DENSE_BY_DESIGN = {
    "directory", "business_listing", "local_citation", "bookmark",
    "resource_page", "social",
}


@dataclass
class Toxicity:
    """0..1 risk, plus the evidence for it. Never a bare number."""

    risk: float = 0.0
    reasons: list[str] = field(default_factory=list)
    spam_link_ratio: float = 0.0
    verticals: list[str] = field(default_factory=list)

    @property
    def avoid(self) -> bool:
        """High enough that placing a link here is likely to cost you."""
        return self.risk >= 0.6

    def to_dict(self) -> dict:
        return {
            "risk": self.risk,
            "reasons": list(self.reasons),
            "spam_link_ratio": self.spam_link_ratio,
            "verticals": list(self.verticals),
        }

    @classmethod
    def from_dict(cls, d: Optional[dict]) -> "Toxicity":
        d = dict(d or {})
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in d.items() if k in known})


def _vertical_of(domain: str) -> Optional[str]:
    d = (domain or "").lower()
    for vertical, needles in _SPAM_VERTICALS.items():
        if any(n in d for n in needles):
            return vertical
    return None


def _word_count(text: str) -> int:
    """Thai has no spaces between words, so counting them undercounts wildly.

    Same rule as the rest of this codebase: characters divided by four for
    scripts that do not delimit, whitespace tokens otherwise.
    """
    text = text or ""
    thai_cjk = sum(1 for ch in text if "฀" <= ch <= "๿" or "一" <= ch <= "鿿")
    if thai_cjk > len(text) * 0.3:
        return max(1, len(text) // 4)
    return max(1, len(text.split()))


def assess(
    external_domains: Iterable[str],
    text: str,
    opportunity_type: Optional[str] = None,
    external_links: Optional[int] = None,
) -> Toxicity:
    """Score how risky it is to be linked from this page.

    `external_domains` is a sample of the registrable domains the page links
    out to — the sample the analyser already collects is enough; this is a
    proportion, not a census.
    """
    out = Toxicity()
    domains = [d for d in external_domains if d]
    text = text or ""
    words = _word_count(text)
    total_links = external_links if external_links is not None else len(domains)

    # -- company kept ---------------------------------------------------------
    hits: dict[str, int] = {}
    for domain in domains:
        vertical = _vertical_of(domain)
        if vertical:
            hits[vertical] = hits.get(vertical, 0) + 1

    if domains:
        spam_count = sum(hits.values())
        out.spam_link_ratio = round(spam_count / len(domains), 3)
        out.verticals = sorted(hits)
        if out.spam_link_ratio >= 0.25:
            # Graded, not flat. A quarter of the links could be a directory
            # somebody spammed; three quarters is the site's business model,
            # and a flat penalty scored those two the same.
            out.risk += 0.45 + out.spam_link_ratio * 0.4
            out.reasons.append(
                f"ลิงก์ออกไปเว็บกลุ่มเสี่ยง ({', '.join(out.verticals)}) "
                f"{int(out.spam_link_ratio * 100)}% ของลิงก์ที่สุ่มดู")
        elif out.spam_link_ratio > 0:
            out.risk += 0.2
            out.reasons.append(
                f"มีลิงก์ออกไปเว็บกลุ่มเสี่ยงอยู่บ้าง ({', '.join(out.verticals)})")

    # -- link density ---------------------------------------------------------
    # A directory is meant to be a list of links; an article is not.
    dense_by_design = (opportunity_type or "").lower() in _LINK_DENSE_BY_DESIGN
    if total_links and not dense_by_design:
        per_100_words = total_links / (words / 100)
        if per_100_words >= 25:
            out.risk += 0.35
            out.reasons.append(
                f"ลิงก์ออกเยอะผิดปกติเทียบกับเนื้อหา ({total_links} ลิงก์ ~{words} คำ)")
        elif per_100_words >= 12:
            out.risk += 0.15
            out.reasons.append("สัดส่วนลิงก์ต่อเนื้อหาค่อนข้างสูง")

    # -- pages that advertise selling links ----------------------------------
    lowered = text.lower()
    sold = [p for p in _PAID_LINK_PHRASES if p in lowered]
    if sold:
        out.risk += 0.3
        out.reasons.append(f"หน้านี้พูดถึงการขายลิงก์/รับจ้าง SEO ({sold[0]})")

    # -- keyword stuffing -----------------------------------------------------
    if words >= 80:
        tokens = re.findall(r"[a-z][a-z0-9'-]{3,}", lowered)
        if tokens:
            top = max(set(tokens), key=tokens.count)
            share = tokens.count(top) / len(tokens)
            if share >= 0.12:
                out.risk += 0.2
                out.reasons.append(f"คำว่า “{top}” ซ้ำผิดปกติ ({int(share * 100)}% ของคำ)")

    out.risk = round(min(1.0, out.risk), 3)
    return out
