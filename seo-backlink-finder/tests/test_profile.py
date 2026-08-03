"""Profiler tests. No network: a fake fetcher serves canned HTML."""
from blf.fetcher import FetchResult
from blf.profile import (SiteProfile, _guess_brand, _guess_country,
                         _looks_local, _same_ground, _seed_keywords,
                         _singular, build_profile)

HOME_TH = """
<!doctype html><html lang="th"><head>
<title>PayoffLogic — ระบบวางแผนชำระหนี้และบริหารสินเชื่อ</title>
<meta name="description" content="เครื่องมือวางแผนชำระหนี้ คำนวณดอกเบี้ย รีไฟแนนซ์สินเชื่อ">
<meta property="og:site_name" content="PayoffLogic">
</head><body>
<h1>วางแผนชำระหนี้ให้หมดเร็วขึ้น</h1>
<h2>คำนวณดอกเบี้ย</h2><h2>บริหารหนี้บัตรเครดิต</h2>
<p>โทร 02-123-4567 ที่อยู่ 99 ถนนสุขุมวิท กรุงเทพฯ เวลาทำการ จันทร์-ศุกร์</p>
<a href="/about/">เกี่ยวกับเรา</a><a href="/services/">บริการ</a>
</body></html>
"""

ABOUT_TH = """
<!doctype html><html lang="th"><head><title>เกี่ยวกับเรา — PayoffLogic</title></head>
<body><h1>เกี่ยวกับ PayoffLogic</h1>
<p>ทีมผู้เชี่ยวชาญด้านการปลดหนี้และวางแผนชำระหนี้</p></body></html>
"""

HOME_EN = """
<!doctype html><html lang="en"><head>
<title>BrewJournal — Pour Over Coffee Brewing Guides</title>
<meta name="description" content="Coffee brewing guides, espresso tips and grind size charts.">
</head><body><h1>Pour over coffee brewing</h1>
<h2>Espresso basics</h2><a href="/about/">About</a></body></html>
"""


class FakeFetcher:
    """Serves a dict of path -> html; anything else 404s.

    `robots_blocks` mimics a site whose robots.txt disallows crawlers: any
    fetch that does not pass ignore_robots comes back blocked.
    """

    def __init__(self, pages: dict, robots_blocks: bool = False):
        self.pages = pages
        self.robots_blocks = robots_blocks
        self.calls = []
        self.ignored_robots = []

    def get(self, url: str, ignore_robots: bool = False) -> FetchResult:
        self.calls.append(url)
        self.ignored_robots.append(ignore_robots)
        if self.robots_blocks and not ignore_robots:
            return FetchResult(url=url, ok=False, error="blocked by robots.txt")
        for path, html in self.pages.items():
            if url.rstrip("/").endswith(path.rstrip("/")) or url == path:
                return FetchResult(url=url, ok=True, status=200,
                                   final_url=url, text=html)
        return FetchResult(url=url, ok=False, status=404, error="not found")


def test_profiles_thai_site():
    f = FakeFetcher({
        "http://payofflogic.test": HOME_TH,
        "/about/": ABOUT_TH,
    })
    prof = build_profile("http://payofflogic.test", f, max_pages=3)
    assert prof.language == "th"
    assert prof.brand == "PayoffLogic"
    assert prof.country == "TH"
    assert prof.topics
    # navigation labels must not become topics
    assert "เกี่ยวกับเรา" not in prof.topics
    assert "บริการ" not in prof.topics
    # something about the actual subject should be there
    assert any("หนี้" in t or "ดอกเบี้ย" in t or "สินเชื่อ" in t
               for t in prof.topics), prof.topics


def test_local_business_prioritises_citations():
    f = FakeFetcher({"http://payofflogic.test": HOME_TH})
    prof = build_profile("http://payofflogic.test", f, max_pages=1)
    assert prof.is_local_business is True
    assert prof.categories[0] in ("local_citation", "business_listing")


def test_profiles_english_site():
    f = FakeFetcher({"http://brewjournal.test": HOME_EN})
    prof = build_profile("http://brewjournal.test", f, max_pages=1)
    assert prof.language == "en"
    assert any("coffee" in t or "espresso" in t or "brewing" in t
               for t in prof.topics), prof.topics
    assert prof.seed_keywords


def test_unreachable_site_still_returns_something():
    f = FakeFetcher({})
    prof = build_profile("http://nothing.test", f, max_pages=2)
    assert prof.domain == "nothing.test"
    assert prof.notes                      # explains the failure
    assert prof.categories                 # still searchable
    assert prof.brand
    # These drive the CLI's language line and the drafter's fallback; blank
    # values printed an empty "drafts will use:" line.
    assert prof.language
    assert prof.languages


def test_own_site_is_read_despite_robots_txt():
    """Your own robots.txt must not stop the tool from reading your own site —
    this broke `blf profile` for any site behind a WAF or a blanket Disallow."""
    f = FakeFetcher({"http://payofflogic.test": HOME_TH}, robots_blocks=True)
    prof = build_profile("http://payofflogic.test", f, max_pages=1)
    assert prof.language == "th"
    assert prof.topics, "profile came back empty — robots.txt was still applied"
    assert all(f.ignored_robots), "every own-site fetch must bypass robots.txt"


CALCULATOR_SITE = """
<!doctype html><html lang="en"><head>
<title>Free Financial Calculators — Mortgage, Loan &amp; Debt Payoff | Payoff Logic</title>
<meta name="description" content="Free financial calculators for mortgage payments, loan amortization and debt payoff planning.">
</head><body>
<h1>Free Financial Calculators</h1>
<h2>Mortgage Calculator</h2><h2>Debt Payoff Calculator</h2><h2>Loan Calculator</h2>
<h3>Mortgage payment breakdown</h3><h3>Loan amortization schedule</h3>
<p>Use our free mortgage calculator to estimate monthly payments. Our debt payoff
calculator compares methods. Every loan calculator shows the loan amortization
schedule and total interest costs.</p>
</body></html>
"""


def _seeds_for(html):
    f = FakeFetcher({"http://calc.test": html})
    return build_profile("http://calc.test", f, max_pages=1).seed_keywords


def test_seed_keywords_prefer_specific_phrases_over_broad_words():
    """`"calculator" "write for us"` matches most of the web and none of the
    niche. The seeds have to name a topic, not a category of noun."""
    seeds = _seeds_for(CALCULATOR_SITE)
    multi = [s for s in seeds if len(s.split()) > 1]
    assert len(multi) >= 3, f"expected specific phrases, got {seeds}"
    assert any("mortgage" in s and len(s.split()) > 1 for s in seeds), seeds


def test_seed_keywords_drop_the_word_covered_by_a_kept_phrase():
    """Keeping both 'mortgage' and 'mortgage payment' wastes a slot on the
    broader term, which returns a superset of the same pages."""
    seeds = _seeds_for(CALCULATOR_SITE)
    for broad in ("mortgage", "loan", "calculator", "payoff"):
        if any(broad in s.split() and len(s.split()) > 1 for s in seeds):
            assert broad not in seeds, f"'{broad}' kept alongside a phrase using it"


def test_marketing_filler_is_not_a_keyword():
    seeds = _seeds_for(CALCULATOR_SITE)
    for junk in ("free", "every", "best", "top", "total"):
        assert junk not in seeds, f"'{junk}' is filler, not a topic"
        assert not any(s.startswith(junk + " ") for s in seeds), seeds


def test_navigation_labels_are_not_keywords():
    seeds = _seeds_for(CALCULATOR_SITE)
    for nav in ("guides", "tools", "resources", "about", "contact"):
        assert nav not in seeds, f"'{nav}' is navigation, not a topic"


def test_singular_plural_fold():
    assert _singular("calculators") == "calculator"
    assert _singular("categories") == "category"
    assert _singular("class") == "class"          # not a plural
    assert _singular("is") == "is"                # too short to strip


def test_same_ground_detects_overlap():
    assert _same_ground("mortgage", "mortgage payment", False)
    assert _same_ground("calculator", "financial calculators", False)
    assert not _same_ground("mortgage payment", "debt payoff", False)
    # Thai/CJK falls back to substring, having no word boundaries
    assert _same_ground("ชำระหนี้", "วางแผนชำระหนี้", True)


def test_thai_seeds_still_work_after_the_change():
    f = FakeFetcher({"http://payofflogic.test": HOME_TH, "/about/": ABOUT_TH})
    prof = build_profile("http://payofflogic.test", f, max_pages=3)
    assert prof.seed_keywords
    for kw in prof.seed_keywords:
        assert 4 <= len(kw) <= 26, kw


def test_seed_keywords_are_searchable_length():
    f = FakeFetcher({"http://payofflogic.test": HOME_TH, "/about/": ABOUT_TH})
    prof = build_profile("http://payofflogic.test", f, max_pages=3)
    for kw in prof.seed_keywords:
        assert 4 <= len(kw) <= 26, kw     # Thai: char-capped, whole phrases


def test_profile_roundtrip(tmp_path):
    p = SiteProfile(url="https://x.test", domain="x.test", brand="X",
                    topics=["a", "b"], keyphrases=[("a", 1.0)], language="en")
    path = tmp_path / "prof.json"
    p.save(str(path))
    back = SiteProfile.load(str(path))
    assert back.domain == "x.test"
    assert back.topics == ["a", "b"]
    assert back.keyphrases == [("a", 1.0)]


def test_brand_guessing():
    assert _guess_brand("Some Article — BrandName", "site.com") == "BrandName"
    assert _guess_brand("", "payofflogic.com") == "Payofflogic"


def test_country_from_cctld_and_language():
    assert _guess_country("example.co.th", "", "en") == "TH"
    assert _guess_country("example.com", "", "th") == "TH"
    assert _guess_country("example.com", "", "en") is None


def test_looks_local_needs_real_signals():
    assert _looks_local("ที่อยู่ 99 ถนนสุขุมวิท เวลาทำการ 9-18") is True
    assert _looks_local("we build software in the cloud") is False
