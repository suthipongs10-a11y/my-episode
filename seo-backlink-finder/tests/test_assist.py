import copy

from blf import assist
from blf.config import Config, DEFAULTS
from blf.models import (Analysis, LinkAttribute, OpportunityType, Prospect)


def _cfg():
    data = copy.deepcopy(DEFAULTS)
    data["site"].update({
        "url": "https://mysite.com",
        "name": "MySite",
        "topics": ["coffee brewing", "espresso"],
        "languages": ["en", "th"],
    })
    data["assist"]["llm"] = False   # force template mode in tests
    return Config(data)


def _prospect(lang="en", attr=LinkAttribute.NOFOLLOW,
              otype=OpportunityType.BLOG_COMMENT, comment_system="native"):
    p = Prospect(url="https://blog.com/post", domain="blog.com",
                 opportunity_type=otype)
    p.analysis = Analysis(fetched=True, content_lang=lang,
                          link_attribute=attr, comment_system=comment_system,
                          has_comment_form=True, title="A post about coffee")
    return p


def test_comment_language_follows_site_thai():
    d = assist.draft_comment(_prospect(lang="th"), _cfg())
    assert d.language == "th"
    assert "ขอบคุณ" in d.body               # Thai scaffold used
    assert d.requires_review is True


def test_comment_language_english():
    d = assist.draft_comment(_prospect(lang="en"), _cfg())
    assert d.language == "en"
    assert "Thanks for this" in d.body


def test_comment_warns_on_nofollow():
    d = assist.draft_comment(_prospect(attr=LinkAttribute.NOFOLLOW), _cfg())
    assert any("nofollow" in w.lower() for w in d.warnings)


def test_comment_has_review_checklist():
    d = assist.draft_comment(_prospect(), _cfg())
    assert d.checklist
    assert any("unique" in c.lower() or "reuse" in c.lower() for c in d.checklist)


def test_comment_link_off_by_default():
    d = assist.draft_comment(_prospect(lang="en"), _cfg())
    assert "https://mysite.com" not in d.body
    d2 = assist.draft_comment(_prospect(lang="en"), _cfg(), include_link=True)
    assert "https://mysite.com" in d2.body


def test_outreach_has_subject_and_body():
    p = _prospect(otype=OpportunityType.GUEST_POST)
    d = assist.draft_outreach(p, _cfg())
    assert d.kind == "outreach"
    assert d.subject
    assert "MySite" in d.body


def test_directory_fields():
    p = _prospect(otype=OpportunityType.DIRECTORY)
    d = assist.draft_directory_submission(p, _cfg())
    assert d.fields["url"] == "https://mysite.com"
    assert d.fields["site_name"] == "MySite"


def test_unsupported_language_falls_back_with_warning():
    # French content, but site languages are en/th -> falls back, warns.
    d = assist.draft_comment(_prospect(lang="fr"), _cfg())
    assert d.language == "en"
    assert any("template" in w.lower() for w in d.warnings)
