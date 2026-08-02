from blf import language


def test_thai():
    lang, conf = language.detect(
        "สวัสดีครับ นี่คือเนื้อหาภาษาไทยสำหรับทดสอบระบบตรวจจับภาษาให้แม่นยำ")
    assert lang == "th"
    assert conf > 0.5


def test_english():
    lang, _ = language.detect(
        "This is an English article about the topic and how you can use it for your site.")
    assert lang == "en"


def test_japanese():
    lang, _ = language.detect(
        "これはテストです。ひらがなとカタカナを含む日本語の文章を用意しました。")
    assert lang == "ja"


def test_russian():
    lang, _ = language.detect(
        "Это пример текста на русском языке для проверки определения языка сайта.")
    assert lang == "ru"


def test_spanish():
    lang, _ = language.detect(
        "Este es un artículo en español que explica cómo puedes usar esto para tu sitio web.")
    assert lang == "es"


def test_declared_prior_on_empty():
    lang, _ = language.detect("", declared="th-TH")
    assert lang == "th"


def test_normalise_and_name():
    assert language._normalise_lang("en-US") == "en"
    assert language.name("th") == "Thai"
