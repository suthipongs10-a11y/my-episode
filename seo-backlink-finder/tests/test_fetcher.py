from blf.fetcher import _decode, _header_charset, _sniff_charset

THAI = "วิธีชงกาแฟดริปให้อร่อย"


def test_header_charset_parsing():
    assert _header_charset("text/html; charset=UTF-8") == "utf-8"
    assert _header_charset("text/html") is None
    assert _header_charset(None) is None


def test_sniff_meta_charset():
    raw = b'<html><head><meta charset="tis-620"></head>'
    assert _sniff_charset(raw) == "tis-620"


def test_sniff_bom():
    assert _sniff_charset(b"\xef\xbb\xbfhello") == "utf-8"


def test_decode_utf8_without_header_charset():
    # A server that sends text/html with NO charset must still decode UTF-8,
    # not mangle it as ISO-8859-1 (the bug that made Thai look like Vietnamese).
    raw = THAI.encode("utf-8")
    assert _decode(raw, None) == THAI


def test_decode_respects_meta_when_no_header():
    raw = ('<meta charset="utf-8">' + THAI).encode("utf-8")
    assert THAI in _decode(raw, None)


def test_decode_header_charset_wins():
    raw = THAI.encode("utf-8")
    assert _decode(raw, "utf-8") == THAI
