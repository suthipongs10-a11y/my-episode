"""The footprint library: search queries that surface each kind of backlink
opportunity, plus per-category metadata the scorer reuses.

A "footprint" is a search operator string that public pages of a given type
tend to match, e.g. `"{keyword}" "write for us"` for guest-post pages. Queries
use `{keyword}` (your niche term). Many use `inurl:` / `intitle:` which are
language-neutral; the rest have English and Thai variants, with more languages
easy to add.

Each category also carries the priors the scorer needs — the opportunity type,
a placement ceiling, a typical link attribute, and a base "ease" — so a
freshly discovered URL can be scored before it is even fetched.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .models import LinkAttribute, OpportunityType


@dataclass
class Category:
    key: str
    opportunity_type: OpportunityType
    description: str
    placement_rank: int          # 0..100 quality ceiling of this placement
    base_ease: int               # 0..100, higher = easier to obtain
    typical_link: LinkAttribute
    templates: dict[str, list[str]] = field(default_factory=dict)  # lang -> queries

    def render(self, keyword: str, langs: list[str]) -> list[str]:
        """Rendered queries for the given languages (plus language-neutral)."""
        out: list[str] = []
        wanted = ["neutral"] + [l for l in langs]
        seen = set()
        for lang in wanted:
            for tmpl in self.templates.get(lang, []):
                q = tmpl.replace("{keyword}", keyword)
                if q not in seen:
                    seen.add(q)
                    out.append(q)
        return out


# Language-neutral operators work regardless of the site's language.
CATEGORIES: dict[str, Category] = {
    "guest_post": Category(
        key="guest_post",
        opportunity_type=OpportunityType.GUEST_POST,
        description="Sites that accept guest articles (editorial in-content link).",
        placement_rank=90, base_ease=20, typical_link=LinkAttribute.DOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:write-for-us',
                '"{keyword}" inurl:guest-post',
                '"{keyword}" inurl:contribute',
                '"{keyword}" intitle:"write for us"',
            ],
            "en": [
                '"{keyword}" "write for us"',
                '"{keyword}" "guest post guidelines"',
                '"{keyword}" "submit a guest post"',
                '"{keyword}" "become a contributor"',
                '"{keyword}" "this is a guest post by"',
            ],
            "th": [
                '"{keyword}" "เขียนบทความให้เรา"',
                '"{keyword}" "รับเขียนบทความ"',
                '"{keyword}" "ส่งบทความ"',
            ],
        },
    ),
    "resource_page": Category(
        key="resource_page",
        opportunity_type=OpportunityType.RESOURCE_PAGE,
        description="Curated 'useful links' pages you can ask to be added to.",
        placement_rank=75, base_ease=35, typical_link=LinkAttribute.DOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:resources',
                '"{keyword}" inurl:links',
                '"{keyword}" intitle:resources',
            ],
            "en": [
                '"{keyword}" "useful links"',
                '"{keyword}" "recommended resources"',
                '"{keyword}" "helpful resources"',
                '"{keyword}" "further reading"',
            ],
            "th": [
                '"{keyword}" "ลิงก์ที่เป็นประโยชน์"',
                '"{keyword}" "แหล่งข้อมูล"',
            ],
        },
    ),
    "directory": Category(
        key="directory",
        opportunity_type=OpportunityType.DIRECTORY,
        description="Niche directories that list sites/businesses.",
        placement_rank=45, base_ease=70, typical_link=LinkAttribute.DOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:submit',
                '"{keyword}" inurl:add-url',
                '"{keyword}" inurl:directory',
            ],
            "en": [
                '"{keyword}" "submit your site"',
                '"{keyword}" "add your site"',
                '"{keyword}" "add url"',
                '"{keyword}" directory "add listing"',
            ],
            "th": [
                '"{keyword}" "เพิ่มเว็บไซต์"',
                '"{keyword}" "ไดเรกทอรี"',
            ],
        },
    ),
    "blog_comment": Category(
        key="blog_comment",
        opportunity_type=OpportunityType.BLOG_COMMENT,
        description="Articles open for comments (usually nofollow, but real "
                    "referral traffic and relationships).",
        placement_rank=30, base_ease=75, typical_link=LinkAttribute.NOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:blog "leave a comment"',
                '"{keyword}" "powered by wordpress" inurl:blog',
            ],
            "en": [
                '"{keyword}" blog "leave a reply"',
                '"{keyword}" "0 comments" blog',
                '"{keyword}" "commentluv"',
            ],
            "th": [
                '"{keyword}" บล็อก "แสดงความคิดเห็น"',
            ],
        },
    ),
    "forum": Category(
        key="forum",
        opportunity_type=OpportunityType.FORUM,
        description="Discussion boards where you can post and sometimes carry a "
                    "signature link.",
        placement_rank=40, base_ease=55, typical_link=LinkAttribute.NOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:forum',
                '"{keyword}" inurl:viewtopic',
                '"{keyword}" "powered by phpbb"',
                '"{keyword}" "powered by xenforo"',
            ],
            "en": [
                '"{keyword}" forum "register"',
                '"{keyword}" community "start a discussion"',
            ],
            "th": [
                '"{keyword}" เว็บบอร์ด',
                '"{keyword}" กระทู้',
            ],
        },
    ),
    "qa": Category(
        key="qa",
        opportunity_type=OpportunityType.QA,
        description="Question-and-answer sites where a helpful answer can cite "
                    "your page.",
        placement_rank=55, base_ease=45, typical_link=LinkAttribute.NOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:questions',
                '"{keyword}" inurl:question',
            ],
            "en": [
                '"{keyword}" "ask a question"',
                '"{keyword}" site:quora.com',
                '"{keyword}" site:reddit.com',
            ],
            "th": [
                '"{keyword}" ถาม ตอบ',
                '"{keyword}" site:pantip.com',
            ],
        },
    ),
    "profile": Category(
        key="profile",
        opportunity_type=OpportunityType.PROFILE,
        description="Sites where a member profile carries a website field.",
        placement_rank=30, base_ease=90, typical_link=LinkAttribute.NOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:members',
                '"{keyword}" inurl:profile',
                '"{keyword}" "create an account"',
            ],
            "en": [
                '"{keyword}" "edit profile" "website"',
            ],
            "th": [
                '"{keyword}" "สมัครสมาชิก"',
            ],
        },
    ),
    "web2": Category(
        key="web2",
        opportunity_type=OpportunityType.WEB2,
        description="Free hosted-blog platforms where you own the page and its "
                    "outgoing links.",
        placement_rank=45, base_ease=85, typical_link=LinkAttribute.DOFOLLOW,
        templates={
            # These are platforms, not searches. Discovery treats them as seeds.
            "neutral": [
                "site:medium.com",
                "site:wordpress.com",
                "site:blogger.com",
                "site:tumblr.com",
                "site:substack.com",
            ],
        },
    ),
    "edu_resource": Category(
        key="edu_resource",
        opportunity_type=OpportunityType.RESOURCE_PAGE,
        description="Educational resource/scholarship pages (.edu/.ac).",
        placement_rank=85, base_ease=25, typical_link=LinkAttribute.DOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" site:.edu inurl:resources',
                '"{keyword}" site:.ac.th',
                '"{keyword}" site:.edu "helpful links"',
            ],
        },
    ),
    "business_listing": Category(
        key="business_listing",
        opportunity_type=OpportunityType.BUSINESS_LISTING,
        description="Business listing sites with a website field (non-geo).",
        placement_rank=45, base_ease=65, typical_link=LinkAttribute.NOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:add-business',
                '"{keyword}" inurl:business-listing',
            ],
            "en": [
                '"{keyword}" "add your business"',
                '"{keyword}" "list your business"',
                '"{keyword}" "claim your listing"',
                '"{keyword}" "business profile" "submit"',
            ],
            "th": [
                '"{keyword}" "ลงประกาศธุรกิจ"',
                '"{keyword}" "เพิ่มธุรกิจของคุณ"',
                '"{keyword}" "ลงทะเบียนร้านค้า"',
            ],
        },
    ),
    "local_citation": Category(
        key="local_citation",
        opportunity_type=OpportunityType.LOCAL_CITATION,
        description="Geo/local citations — NAP (name, address, phone) listings "
                    "in a specific city or country. Use {city} in your keyword.",
        placement_rank=50, base_ease=60, typical_link=LinkAttribute.NOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:local',
                '"{keyword}" inurl:city',
            ],
            "en": [
                '"{keyword}" "local business directory"',
                '"{keyword}" "add a local business"',
                '"{keyword}" "business directory" "phone" "address"',
                '"{keyword}" "near me" directory submit',
            ],
            "th": [
                '"{keyword}" "ไดเรกทอรีธุรกิจท้องถิ่น"',
                '"{keyword}" "ร้านค้าใกล้ฉัน" ลงประกาศ',
                '"{keyword}" "สมุดหน้าเหลือง"',
            ],
        },
    ),
    "community": Category(
        key="community",
        opportunity_type=OpportunityType.COMMUNITY,
        description="Community platforms — subreddits, groups, Discourse/Slack "
                    "communities. Relationship-driven, strict on self-promotion.",
        placement_rank=50, base_ease=50, typical_link=LinkAttribute.NOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:community',
                '"{keyword}" inurl:c/ discourse',
                '"{keyword}" "powered by discourse"',
            ],
            "en": [
                '"{keyword}" community "join the discussion"',
                '"{keyword}" site:reddit.com',
                '"{keyword}" "slack community"',
                '"{keyword}" "discord server" list',
                '"{keyword}" "facebook group"',
            ],
            "th": [
                '"{keyword}" "กลุ่มเฟซบุ๊ก"',
                '"{keyword}" ชุมชนออนไลน์',
                '"{keyword}" site:pantip.com',
            ],
        },
    ),
    "blog": Category(
        key="blog",
        opportunity_type=OpportunityType.BLOG,
        description="Topical blogs to build a relationship with — link inserts, "
                    "round-ups, reviews, interviews, or a future guest post.",
        placement_rank=70, base_ease=35, typical_link=LinkAttribute.DOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:blog',
                '"{keyword}" intitle:blog',
            ],
            "en": [
                '"{keyword}" "best blogs" list',
                '"{keyword}" blog "round-up"',
                '"{keyword}" blog "product review" "contact"',
                '"{keyword}" "top 10" blogs',
            ],
            "th": [
                '"{keyword}" บล็อก แนะนำ',
                '"{keyword}" "รีวิว" บล็อก',
            ],
        },
    ),
    "news": Category(
        key="news",
        opportunity_type=OpportunityType.NEWS,
        description="News sites, press-release outlets, and journalist requests. "
                    "Highest authority ceiling; needs a genuine story.",
        placement_rank=95, base_ease=15, typical_link=LinkAttribute.DOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:news',
                '"{keyword}" inurl:press-release',
                '"{keyword}" inurl:submit-news',
            ],
            "en": [
                '"{keyword}" "submit a press release"',
                '"{keyword}" "news tip" contact editor',
                '"{keyword}" "sources wanted" journalist',
                '"{keyword}" "expert commentary" media',
            ],
            "th": [
                '"{keyword}" "ข่าวประชาสัมพันธ์" ส่งข่าว',
                '"{keyword}" "ฝากข่าว"',
                '"{keyword}" ข่าว ติดต่อกองบรรณาธิการ',
            ],
        },
    ),
    "wiki": Category(
        key="wiki",
        opportunity_type=OpportunityType.WIKI,
        description="Wikis with an external-links section (strict, editorial).",
        placement_rank=70, base_ease=25, typical_link=LinkAttribute.NOFOLLOW,
        templates={
            "neutral": [
                '"{keyword}" inurl:wiki "external links"',
                '"{keyword}" "powered by mediawiki"',
            ],
        },
    ),
    "bookmark": Category(
        key="bookmark",
        opportunity_type=OpportunityType.BOOKMARK,
        description="Social bookmarking sites.",
        placement_rank=25, base_ease=85, typical_link=LinkAttribute.NOFOLLOW,
        templates={
            "en": [
                '"{keyword}" "submit a link"',
                '"{keyword}" "add a bookmark"',
            ],
        },
    ),
}


def category(key: str) -> Category:
    return CATEGORIES[key]


def all_keys() -> list[str]:
    return list(CATEGORIES.keys())


def render_queries(keyword: str, categories: list[str], langs: list[str]) -> list[tuple[str, str]]:
    """Return (category_key, query) pairs for the requested categories."""
    pairs: list[tuple[str, str]] = []
    for key in categories:
        cat = CATEGORIES.get(key)
        if not cat:
            continue
        for q in cat.render(keyword, langs):
            pairs.append((key, q))
    return pairs
