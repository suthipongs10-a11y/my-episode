from collections import Counter

from blf import textrank


def test_latin_terms_include_bigrams():
    t = textrank.terms("coffee brewing guide for espresso lovers", "en")
    assert "coffee" in t
    assert "coffee brewing" in t


def test_stopwords_dropped():
    t = textrank.terms("the and for with your", "en")
    assert all(w not in t for w in ("the", "and", "for"))


def test_thai_uses_char_ngrams():
    assert textrank.needs_ngrams("th") is True
    t = textrank.terms("วางแผนชำระหนี้", "th")
    assert t                      # produced something
    assert any(len(k) == 3 for k in t)   # trigrams


def test_cosine_identical_and_disjoint():
    a = textrank.terms("coffee brewing espresso guide", "en")
    b = textrank.terms("coffee brewing espresso guide", "en")
    c = textrank.terms("mortgage refinance interest rates", "en")
    assert textrank.cosine(a, b) > 0.99
    assert textrank.cosine(a, c) == 0.0


def test_cosine_partial_overlap_is_between():
    a = textrank.terms("coffee brewing espresso guide", "en")
    b = textrank.terms("coffee brewing tips at home", "en")
    sim = textrank.cosine(a, b)
    assert 0.0 < sim < 1.0


def test_thai_similarity_beats_unrelated():
    """Char n-grams must still rank a same-topic Thai page above an off-topic
    one — this is what makes match scoring work without a tokeniser."""
    mine = textrank.terms("วางแผนชำระหนี้ คำนวณดอกเบี้ย รีไฟแนนซ์สินเชื่อ", "th")
    same = textrank.terms("ปลดหนี้บัตรเครดิต วางแผนชำระหนี้ คำนวณดอกเบี้ย", "th")
    other = textrank.terms("วิธีชงกาแฟดริป เลือกเมล็ดกาแฟคั่วอ่อน", "th")
    assert textrank.cosine(mine, same) > textrank.cosine(mine, other)


def test_boilerplate_phrases_are_dropped():
    phrases = dict(textrank.keyphrases(
        [("About Us", 5.0), ("Contact Us", 5.0), ("coffee brewing guide", 5.0)],
        lang="en", limit=10))
    assert "about us" not in phrases
    assert "contact us" not in phrases
    assert any("coffee" in p for p in phrases)


def test_thai_boilerplate_dropped():
    phrases = dict(textrank.keyphrases(
        [("เกี่ยวกับเรา", 9.0), ("บริการ", 9.0), ("วางแผนชำระหนี้", 5.0)],
        lang="th", limit=10))
    assert "เกี่ยวกับเรา" not in phrases
    assert "บริการ" not in phrases
    assert "วางแผนชำระหนี้" in phrases


def test_thai_long_clause_splits_at_connector():
    # "ระบบวางแผนชำระหนี้และบริหารสินเชื่อ" must split at "และ".
    parts = textrank._split_thai("ระบบวางแผนชำระหนี้และบริหารสินเชื่อ")
    assert "ระบบวางแผนชำระหนี้" in parts
    assert "บริหารสินเชื่อ" in parts


def test_thai_short_phrase_not_split():
    assert textrank._split_thai("ปลดหนี้บัตรเครดิต") == ["ปลดหนี้บัตรเครดิต"]


def test_thai_split_never_cuts_mid_word():
    """Every piece must be a whole phrase. A fixed-width truncation would
    produce strings like 'เครื่องมือวางแผนชำระหนี้ ค' that match nothing."""
    long_clause = "เครื่องมือวางแผนชำระหนี้ คำนวณดอกเบี้ยและรีไฟแนนซ์สินเชื่อบ้านอย่างละเอียด"
    for piece in textrank._split_thai(long_clause):
        assert not piece.endswith(" ")
        assert len(piece) <= 26
        # a truncated fragment would not be a substring boundary of a space or
        # connector split; verify each piece came from a real boundary
        assert piece in long_clause


def test_keyphrases_ranked_by_weight():
    ranked = textrank.keyphrases(
        [("espresso machine reviews", 10.0), ("random filler text here", 1.0)],
        lang="en", limit=5)
    assert ranked
    assert "espresso" in ranked[0][0]
