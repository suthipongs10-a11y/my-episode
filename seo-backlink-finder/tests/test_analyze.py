from blf.analyze import analyze_html, registrable_domain
from blf.models import LinkAttribute, OpportunityType

WP_COMMENT_PAGE = """
<!doctype html><html lang="en"><head>
<title>How to grow tomatoes — Garden Blog</title>
<meta name="description" content="A practical guide to growing tomatoes at home.">
<link rel="stylesheet" href="/wp-content/themes/x/style.css">
</head><body>
<article>This is an English article about growing tomatoes in your garden and how
to get a great harvest every season with simple methods.</article>
<div id="respond"><h3>Leave a Reply</h3>
<form><textarea name="comment"></textarea></form></div>
<a href="https://external-one.com/a">one</a>
<a href="https://external-two.com/b" rel="nofollow ugc">two</a>
<a href="/contact">contact us</a>
<a href="mailto:editor@gardenblog.com">email</a>
</body></html>
"""


def test_registrable_domain():
    assert registrable_domain("https://www.example.co.uk/path") == "example.co.uk"
    assert registrable_domain("http://sub.blog.example.com/") == "example.com"


def test_wordpress_and_comments():
    a = analyze_html("https://gardenblog.com/tomatoes", WP_COMMENT_PAGE)
    assert a.platform == "WordPress"
    assert a.has_comment_form is True
    assert a.comment_system == "native"
    assert a.https is True
    assert a.content_lang == "en"
    assert a.title.startswith("How to grow tomatoes")
    assert a.meta_description


def test_contact_and_links():
    a = analyze_html("https://gardenblog.com/tomatoes", WP_COMMENT_PAGE)
    assert a.contact_email == "editor@gardenblog.com"
    # two distinct external domains
    assert a.external_links == 2
    # one link has no rel (dofollow), one has nofollow
    assert a.external_dofollow == 1


def test_link_attribute_hint_comment():
    a = analyze_html("https://gardenblog.com/tomatoes", WP_COMMENT_PAGE,
                     type_hint=OpportunityType.BLOG_COMMENT)
    # comment links on modern WP are nofollow/ugc
    assert a.link_attribute in (LinkAttribute.NOFOLLOW, LinkAttribute.UGC)


def test_disqus_is_nofollow():
    html = """<html lang="en"><head><title>x</title></head><body>
    <div id="disqus_thread"></div>
    <script src="https://example.disqus.com/embed.js"></script>
    <a href="https://foo.com">f</a></body></html>"""
    a = analyze_html("https://site.com/post", html)
    assert a.comment_system == "disqus"
    assert a.link_attribute == LinkAttribute.NOFOLLOW


def test_resource_page_dofollow():
    html = """<html lang="en"><head><title>Resources</title></head><body>
    <h1>Useful links</h1>
    <a href="https://a.com">a</a><a href="https://b.com">b</a>
    <a href="https://c.com">c</a></body></html>"""
    a = analyze_html("https://site.com/resources", html,
                     type_hint=OpportunityType.RESOURCE_PAGE)
    assert a.link_attribute == LinkAttribute.DOFOLLOW
