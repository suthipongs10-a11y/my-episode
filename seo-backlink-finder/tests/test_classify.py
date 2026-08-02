from blf.classify import classify
from blf.models import Analysis, OpportunityType, Prospect


def _p(otype=OpportunityType.UNKNOWN, **analysis):
    p = Prospect(url="https://x.com/y", domain="x.com", opportunity_type=otype)
    p.analysis = Analysis(fetched=True, **analysis)
    return p


def test_forum_platform_becomes_forum():
    assert classify(_p(platform="phpBB")) == OpportunityType.FORUM


def test_mediawiki_becomes_wiki():
    assert classify(_p(platform="MediaWiki")) == OpportunityType.WIKI


def test_comment_form_when_unknown():
    p = _p(OpportunityType.UNKNOWN, has_comment_form=True, comment_system="native")
    assert classify(p) == OpportunityType.BLOG_COMMENT


def test_submit_form_when_unknown():
    assert classify(_p(OpportunityType.UNKNOWN, has_submit_form=True)) == \
        OpportunityType.GUEST_POST


def test_keeps_category_type_when_no_evidence():
    assert classify(_p(OpportunityType.RESOURCE_PAGE)) == \
        OpportunityType.RESOURCE_PAGE
