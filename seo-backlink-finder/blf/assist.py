"""Drafting help that keeps a human in the loop.

What this does: given a prospect you have already analysed, it drafts an
on-topic, language-matched comment scaffold or an outreach email, in the
target site's own language when possible, and tells you honestly whether the
link would even count.

What this does NOT do: post anything. It never submits to a third-party site,
and template mode deliberately leaves a placeholder for a real, specific
thought instead of emitting generic filler. The reasons are in the README
("Why not bulk auto-posting"); the short version is that mass identical
comments are spam, they get removed or nofollowed, and Google penalises the
site being promoted — the opposite of the quality-first goal.
"""
from __future__ import annotations

import json
import textwrap
import urllib.request
from dataclasses import dataclass, field
from typing import Optional

from . import language
from .models import LinkAttribute, OpportunityType, Prospect

try:
    import requests  # type: ignore
except Exception:  # pragma: no cover
    requests = None


@dataclass
class Draft:
    kind: str                       # comment | outreach | directory
    language: str
    body: str
    subject: Optional[str] = None
    fields: dict = field(default_factory=dict)   # for directory submissions
    warnings: list[str] = field(default_factory=list)
    checklist: list[str] = field(default_factory=list)
    generated_by: str = "template"  # template | llm
    requires_review: bool = True


# ---------------------------------------------------------------------------
# Localised fragments. Add a language by adding a key here; unknown languages
# fall back to English with a note (or the LLM if enabled).
# ---------------------------------------------------------------------------
_COMMENT_SCAFFOLD = {
    "en": (
        "Thanks for this — the part about {topic} is what stood out to me.\n\n"
        "[Write ONE specific, genuine reaction here: something you learned, a "
        "point you'd add, or a real question about the article. 1-3 sentences. "
        "This is the part that makes the comment worth approving.]\n"
        "{resource_line}"
    ),
    "th": (
        "ขอบคุณสำหรับบทความครับ/ค่ะ ส่วนที่พูดถึง {topic} น่าสนใจมากเป็นพิเศษ\n\n"
        "[เขียนความเห็นจริง ๆ ตรงนี้หนึ่งประเด็น: สิ่งที่ได้เรียนรู้ ประเด็นที่อยากเสริม "
        "หรือคำถามจริงเกี่ยวกับบทความ 1-3 ประโยค ส่วนนี้แหละที่ทำให้คอมเมนต์ผ่านการอนุมัติ]\n"
        "{resource_line}"
    ),
}

_RESOURCE_LINE = {
    "en": ("\nIf it's useful to other readers, I put together a related piece on "
           "{my_topic}: {my_url} — only if it fits, feel free to remove."),
    "th": ("\nถ้าเป็นประโยชน์กับผู้อ่านท่านอื่น ผมได้เขียนบทความที่เกี่ยวข้องเรื่อง "
           "{my_topic} ไว้ที่ {my_url} — หากไม่เหมาะสมลบได้เลยครับ"),
}

_OUTREACH = {
    "en": {
        "subject": "Guest article idea for {domain}",
        "body": (
            "Hi{author},\n\n"
            "I've been reading {domain} — {ref}. I write about {my_topics}, and "
            "I'd love to contribute a genuinely useful piece for your readers.\n\n"
            "A couple of angles I could cover:\n{ideas}\n\n"
            "Everything would be original, on-topic, and written to your "
            "guidelines. If that's of interest I'll send a full outline first.\n\n"
            "Thanks for considering it,\n{my_name}\n{my_url}"
        ),
    },
    "th": {
        "subject": "เสนอเขียนบทความให้ {domain}",
        "body": (
            "สวัสดีครับ{author}\n\n"
            "ผมติดตามเว็บ {domain} อยู่ — {ref} ผมเขียนเนื้อหาเกี่ยวกับ {my_topics} "
            "และอยากเสนอเขียนบทความที่เป็นประโยชน์กับผู้อ่านของคุณจริง ๆ ครับ\n\n"
            "หัวข้อที่พอจะเขียนได้ เช่น:\n{ideas}\n\n"
            "เนื้อหาเป็นต้นฉบับใหม่ทั้งหมด ตรงกับแนวเว็บ และเขียนตามแนวทางของคุณ "
            "ถ้าสนใจ ผมยินดีส่งโครงเรื่องให้พิจารณาก่อนครับ\n\n"
            "ขอบคุณครับ\n{my_name}\n{my_url}"
        ),
    },
}

_RESOURCE_PITCH = {
    "en": {
        "subject": "A resource suggestion for your {topic} page",
        "body": (
            "Hi{author},\n\n"
            "I came across your resources page on {topic} — it's a genuinely "
            "helpful list. I maintain a related resource on {my_topic} that your "
            "readers might find useful: {my_url}.\n\n"
            "No pressure at all — only if you think it adds value. Thanks for "
            "putting the list together.\n\n{my_name}"
        ),
    },
    "th": {
        "subject": "ขอแนะนำแหล่งข้อมูลสำหรับหน้ารวมลิงก์เรื่อง {topic}",
        "body": (
            "สวัสดีครับ{author}\n\n"
            "ผมเจอหน้ารวมแหล่งข้อมูลเรื่อง {topic} ของคุณ เป็นลิสต์ที่มีประโยชน์มากครับ "
            "ผมดูแลแหล่งข้อมูลที่เกี่ยวข้องเรื่อง {my_topic} ที่ผู้อ่านของคุณอาจได้ประโยชน์: "
            "{my_url}\n\nไม่กดดันนะครับ แนะนำเฉพาะถ้าคิดว่ามีประโยชน์จริง ๆ "
            "ขอบคุณที่ทำลิสต์นี้ขึ้นมาครับ\n\n{my_name}"
        ),
    },
}


# Languages we can produce natively (all template packs cover this set).
SUPPORTED_LANGS = set(_COMMENT_SCAFFOLD)


def _target_lang(prospect: Prospect, cfg) -> tuple[str, str, bool]:
    """Return (write_lang, site_lang, native).

    * site_lang  - the language the page is actually in.
    * write_lang - the language we will produce the draft in.
    * native     - True if we have a template for write_lang (vs a fallback).

    We prefer to write in the site's own language. If we have no template for it
    and the LLM is off, we fall back to a language we do support and flag it so
    you know to translate.
    """
    site_lang = language._normalise_lang(prospect.analysis.content_lang) or "en"
    if site_lang in SUPPORTED_LANGS:
        return site_lang, site_lang, True
    # Fall back to the first of the operator's languages that we can template.
    my_langs = [l.lower() for l in (cfg.get("site.languages", ["en"]) or ["en"])]
    for l in my_langs:
        if l in SUPPORTED_LANGS:
            return l, site_lang, True
    return "en", site_lang, True


def _link_warnings(prospect: Prospect) -> list[str]:
    w = []
    attr = prospect.analysis.link_attribute
    if attr in (LinkAttribute.NOFOLLOW, LinkAttribute.UGC):
        w.append("Links here are likely nofollow/ugc: no direct ranking value. "
                 "Worth it only for referral traffic or a real relationship.")
    if attr == LinkAttribute.SPONSORED:
        w.append("Links here are marked sponsored: they pass no ranking value.")
    if prospect.analysis.comment_system in ("disqus", "facebook"):
        w.append(f"Comments run on {prospect.analysis.comment_system}: any URL "
                 "in the body is typically nofollowed or stripped.")
    return w


def _comment_checklist(lang: str) -> list[str]:
    return [
        "Replace the [bracketed] part with a real, specific thought — do not post the scaffold as-is.",
        "Read the article first; reference something actually in it.",
        "Use your real name/handle, not the brand as the name.",
        "Include the link only if it genuinely helps readers of THIS article.",
        "Never reuse this text on another site. One article, one unique comment.",
    ]


def draft_comment(prospect: Prospect, cfg, include_link: bool = False) -> Draft:
    """Draft a comment scaffold in the site's language. `include_link` adds a
    natural, optional resource line — off by default, and gated by relevance."""
    lang, site_lang, native = _target_lang(prospect, cfg)
    topic = _topic_of(prospect, cfg)
    my_url = cfg.get("site.url", "")
    my_topic = (cfg.get("site.topics", []) or ["our topic"])[0]

    resource_line = ""
    if include_link:
        tmpl = _RESOURCE_LINE.get(lang, _RESOURCE_LINE["en"])
        resource_line = tmpl.format(my_topic=my_topic, my_url=my_url)

    scaffold = _COMMENT_SCAFFOLD.get(lang, _COMMENT_SCAFFOLD["en"])
    body = scaffold.format(topic=topic, resource_line=resource_line)

    draft = Draft(kind="comment", language=lang, body=body,
                  warnings=_link_warnings(prospect),
                  checklist=_comment_checklist(lang))

    # The LLM can write directly in the site's own language when we can't.
    llm_ok = False
    if cfg.get("assist.llm") and cfg.secret("anthropic"):
        llm = _llm_comment(prospect, cfg, site_lang, topic, include_link)
        if llm:
            draft.body = llm
            draft.language = site_lang
            draft.generated_by = "llm"
            llm_ok = True

    if not llm_ok and site_lang != draft.language:
        draft.warnings.append(
            f"Site appears to be in {language.name(site_lang)}, but there is no "
            f"native template for it — drafted in {language.name(draft.language)}. "
            f"Translate before posting, or set assist.llm: true.")
    return draft


def draft_outreach(prospect: Prospect, cfg) -> Draft:
    """Guest-post or resource-page pitch email in the site's language."""
    lang, _site_lang, _native = _target_lang(prospect, cfg)
    domain = prospect.domain
    topic = _topic_of(prospect, cfg)
    my_name = cfg.get("site.name", "")
    my_url = cfg.get("site.url", "")
    my_topics = ", ".join(cfg.get("site.topics", []) or ["our topics"])
    my_topic = (cfg.get("site.topics", []) or ["our topic"])[0]
    author = ""  # left blank; the user fills the editor's name if known

    is_resource = prospect.opportunity_type == OpportunityType.RESOURCE_PAGE
    pack = (_RESOURCE_PITCH if is_resource else _OUTREACH)
    frag = pack.get(lang, pack["en"])

    if is_resource:
        body = frag["body"].format(author=author, topic=topic,
                                   my_topic=my_topic, my_url=my_url,
                                   my_name=my_name)
        subject = frag["subject"].format(topic=topic)
    else:
        ideas = _idea_lines(cfg, lang)
        ref = (prospect.analysis.title or f"your work on {topic}")
        body = frag["body"].format(author=author, domain=domain, ref=ref,
                                   my_topics=my_topics, ideas=ideas,
                                   my_name=my_name, my_url=my_url)
        subject = frag["subject"].format(domain=domain)

    warnings = []
    if not prospect.analysis.contact_email:
        warnings.append("No contact email found on the page — check an About/"
                        "Contact page or the site's socials before sending.")
    checklist = [
        "Personalise the greeting with the editor's actual name.",
        "Make sure the topic ideas fit THIS site, not a generic list.",
        "Send from a real address; follow up once after ~1 week, then stop.",
    ]
    draft = Draft(kind="outreach", language=lang, subject=subject, body=body,
                  warnings=warnings, checklist=checklist)

    if cfg.get("assist.llm") and cfg.secret("anthropic"):
        llm = _llm_outreach(prospect, cfg, lang)
        if llm:
            draft.body = llm
            draft.generated_by = "llm"
    return draft


def draft_directory_submission(prospect: Prospect, cfg) -> Draft:
    """The field values to paste into a directory/listing form, in its language."""
    lang, _site_lang, _native = _target_lang(prospect, cfg)
    my_name = cfg.get("site.name", "")
    my_url = cfg.get("site.url", "")
    topics = cfg.get("site.topics", []) or []
    desc_en = f"{my_name} — {', '.join(topics)}." if topics else my_name
    desc_th = f"{my_name} — {', '.join(topics)}" if topics else my_name
    fields = {
        "site_name": my_name,
        "url": my_url,
        "description": desc_th if lang == "th" else desc_en,
        "keywords": ", ".join(topics),
        "category_hint": prospect.category or prospect.opportunity_type.value,
    }
    body = "\n".join(f"{k}: {v}" for k, v in fields.items())
    checklist = [
        "Pick the most specific category the directory offers.",
        "Write the description to read naturally, not keyword-stuffed.",
        "Use a consistent NAP (name/address/phone) across all listings.",
    ]
    return Draft(kind="directory", language=lang, body=body, fields=fields,
                 checklist=checklist)


# --- helpers ---------------------------------------------------------------
def _topic_of(prospect: Prospect, cfg) -> str:
    title = prospect.analysis.title
    if title:
        return title[:80]
    topics = cfg.get("site.topics", []) or []
    return topics[0] if topics else "this topic"


def _idea_lines(cfg, lang: str) -> str:
    topics = cfg.get("site.topics", []) or []
    if not topics:
        return "  - [your topic idea 1]\n  - [your topic idea 2]"
    verbs = {"th": "แนวทาง", "en": "A practical guide to"}
    v = verbs.get(lang, verbs["en"])
    lines = [f"  - {v} {t}" for t in topics[:3]]
    return "\n".join(lines)


# --- optional LLM drafting -------------------------------------------------
def _llm_comment(prospect, cfg, lang, topic, include_link) -> Optional[str]:
    link_clause = ""
    if include_link:
        link_clause = (f" If and only if it genuinely helps readers, you may "
                       f"weave in one natural mention of {cfg.get('site.url')}.")
    prompt = textwrap.dedent(f"""
        You are helping write a single, genuine blog comment for a human to
        review and post. The article is titled "{topic}". Write in
        {language.name(lang)}. Make ONE specific, substantive point that shows
        the article was actually read. 2-4 sentences. No greeting fluff, no
        keyword stuffing, no marketing tone.{link_clause}
        Return only the comment text.
    """).strip()
    return _llm_generate(prompt, cfg)


def _llm_outreach(prospect, cfg, lang) -> Optional[str]:
    prompt = textwrap.dedent(f"""
        Write a concise, respectful outreach email in {language.name(lang)} to
        the editor of {prospect.domain} proposing a guest article. My site is
        {cfg.get('site.name')} ({cfg.get('site.url')}), topics:
        {', '.join(cfg.get('site.topics', []) or [])}. Reference their site
        specifically ("{prospect.analysis.title or ''}"). Offer 2-3 concrete,
        on-topic article ideas. Keep it under 150 words. Return only the email
        body.
    """).strip()
    return _llm_generate(prompt, cfg)


def _llm_generate(prompt: str, cfg) -> Optional[str]:
    key = cfg.secret("anthropic")
    if not key:
        return None
    model = cfg.get("assist.llm_model", "claude-fable-5")
    payload = json.dumps({
        "model": model,
        "max_tokens": 500,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")
    headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    url = "https://api.anthropic.com/v1/messages"
    try:
        if requests is not None:
            r = requests.post(url, data=payload, headers=headers, timeout=40)
            r.raise_for_status()
            data = r.json()
        else:
            req = urllib.request.Request(url, data=payload, headers=headers)
            with urllib.request.urlopen(req, timeout=40) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        parts = data.get("content", [])
        text = "".join(p.get("text", "") for p in parts if p.get("type") == "text")
        return text.strip() or None
    except Exception:
        return None
