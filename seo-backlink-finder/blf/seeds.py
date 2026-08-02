"""A catalog of platforms that accept submissions, so Start works with no key.

Search discovery needs a SerpAPI or Google CSE key. Without one, pressing
Start would find nothing, which makes the tool useless on first run. These are
well-known destinations where anyone can create a profile, publish a post, or
list a business — the standing opportunities that exist regardless of niche.

They are a floor, not the goal. The high-value, genuinely on-topic targets —
the niche blog that takes guest posts about *your* subject — come from search
discovery. Every entry is scored by the same pipeline as everything else, so a
generic platform with no topical fit ranks where it deserves to.

`geo` limits an entry to a country (local citations are country-specific).
`langs` limits it to sites whose audience speaks that language.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Seed:
    url: str
    category: str
    note: str = ""
    geo: Optional[str] = None            # ISO country code, or None = global
    langs: list[str] = field(default_factory=list)   # empty = any language


SEEDS: list[Seed] = [
    # --- Web 2.0: you publish, you control the outgoing link ---------------
    Seed("https://medium.com", "web2", "publish articles; profile link"),
    Seed("https://wordpress.com", "web2", "free hosted blog"),
    Seed("https://www.blogger.com", "web2", "free hosted blog"),
    Seed("https://www.tumblr.com", "web2", "microblog"),
    Seed("https://substack.com", "web2", "newsletter + web archive"),
    Seed("https://write.as", "web2", "minimal blog host"),
    Seed("https://telegra.ph", "web2", "instant publishing"),
    Seed("https://hashnode.com", "web2", "dev-focused blogging"),
    Seed("https://dev.to", "web2", "dev community posts", langs=["en"]),

    # --- Profiles: a website field on a real account -----------------------
    Seed("https://about.me", "profile", "personal landing page"),
    Seed("https://gravatar.com", "profile", "profile tied to your email"),
    Seed("https://www.behance.net", "profile", "portfolio profile"),
    Seed("https://dribbble.com", "profile", "design portfolio"),
    Seed("https://github.com", "profile", "profile website field"),
    Seed("https://gitlab.com", "profile", "profile website field"),
    Seed("https://www.crunchbase.com", "profile", "company profile"),
    Seed("https://angel.co", "profile", "startup profile"),
    Seed("https://www.producthunt.com", "profile", "product + maker profile"),
    Seed("https://linktr.ee", "profile", "link hub"),

    # --- Community: discussion, strict on self-promotion -------------------
    Seed("https://www.reddit.com", "community", "find your subreddit first"),
    Seed("https://news.ycombinator.com", "community", "Show HN / comments",
         langs=["en"]),
    Seed("https://www.indiehackers.com", "community", "founder community",
         langs=["en"]),
    Seed("https://lobste.rs", "community", "tech link community", langs=["en"]),
    Seed("https://pantip.com", "community", "Thailand's largest forum",
         geo="TH", langs=["th"]),
    Seed("https://www.blockdit.com", "community", "Thai content platform",
         geo="TH", langs=["th"]),

    # --- Q&A ---------------------------------------------------------------
    Seed("https://www.quora.com", "qa", "answer questions in your niche"),
    Seed("https://stackexchange.com/sites", "qa", "pick the right site"),
    Seed("https://answers.microsoft.com", "qa", "narrow, technical"),

    # --- Directories -------------------------------------------------------
    Seed("https://www.crunchbase.com", "directory", "company directory"),
    Seed("https://clutch.co", "directory", "B2B services directory"),
    Seed("https://www.goodfirms.co", "directory", "B2B services directory"),
    Seed("https://www.sitejabber.com", "directory", "review directory"),
    Seed("https://www.trustpilot.com", "directory", "review platform"),
    Seed("https://alternativeto.net", "directory", "software alternatives"),
    Seed("https://www.saashub.com", "directory", "SaaS directory"),
    Seed("https://slashdot.org/software", "directory", "software directory"),

    # --- Business listings / local citations -------------------------------
    Seed("https://www.google.com/business", "local_citation",
         "Google Business Profile — the single most important citation"),
    Seed("https://www.bingplaces.com", "local_citation", "Bing Places"),
    Seed("https://foursquare.com", "local_citation", "Foursquare listing"),
    Seed("https://www.yelp.com", "local_citation", "Yelp business page"),
    Seed("https://www.tripadvisor.com", "local_citation",
         "for hospitality and travel"),
    Seed("https://www.yellowpages.co.th", "local_citation",
         "Thailand yellow pages", geo="TH", langs=["th"]),
    Seed("https://www.thaibizinfo.com", "local_citation",
         "Thai business directory", geo="TH", langs=["th"]),
    Seed("https://www.brandexdirectory.com", "local_citation",
         "Thai B2B directory", geo="TH", langs=["th"]),
    Seed("https://www.facebook.com/business", "business_listing",
         "Facebook business page"),
    Seed("https://www.apple.com/business/maps", "business_listing",
         "Apple Business Connect"),

    # --- News / PR ---------------------------------------------------------
    Seed("https://www.prlog.org", "news", "free press release distribution"),
    Seed("https://www.openpr.com", "news", "free press release"),
    Seed("https://www.einpresswire.com", "news", "paid PR distribution"),
    Seed("https://www.newswire.com", "news", "paid PR distribution"),
    Seed("https://www.thaipr.net", "news", "Thai press release wire",
         geo="TH", langs=["th"]),

    # --- Bookmarks ---------------------------------------------------------
    Seed("https://www.diigo.com", "bookmark", "social bookmarking"),
    Seed("https://raindrop.io", "bookmark", "public collections"),
    Seed("https://flipboard.com", "bookmark", "curated magazines"),
    Seed("https://www.scoop.it", "bookmark", "content curation"),
]


def for_profile(
    categories: Optional[list[str]] = None,
    langs: Optional[list[str]] = None,
    country: Optional[str] = None,
    include_global: bool = True,
) -> list[Seed]:
    """Seeds that apply to a given site profile.

    A seed is kept when its category was requested, its language overlaps with
    the site's, and its geo either matches the site's country or is global.
    """
    langs = [l.lower() for l in (langs or [])]
    out: list[Seed] = []
    for s in SEEDS:
        if categories and s.category not in categories:
            continue
        if s.langs and langs and not (set(s.langs) & set(langs)):
            continue
        if s.geo:
            if country and s.geo != country:
                continue
            if not country:
                continue          # geo-specific seed, unknown country -> skip
        elif not include_global:
            continue
        out.append(s)
    return out


def urls_by_category(seeds: list[Seed]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for s in seeds:
        out.setdefault(s.category, []).append(s.url)
    return out
