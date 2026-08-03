"""Command-line interface.

    blf init                          scaffold config.yaml + db
    blf footprints --keyword KW       print search queries to run
    blf discover  --keyword KW        gather prospect URLs (needs a provider)
    blf add URL                       add one prospect by hand
    blf import --input urls.txt       bulk-add pasted URLs
    blf analyze                       fetch + score every unanalysed prospect
    blf rank                          list prospects, quality-first
    blf show REF                      full detail for one prospect (URL or #id)
    blf draft REF                     draft a comment / outreach / listing
    blf status REF STATE              move a prospect along the pipeline
    blf export --format html          write a report
    blf stats                         pipeline summary
"""
from __future__ import annotations

import argparse
import os
import sys
from typing import Optional

from . import __version__, footprints
from .config import Config
from .discover import discover, prospects_from_urls
from .fetcher import Fetcher
from .metrics import MetricsProvider
from .models import Prospect, Status
from .search_providers import get_provider, load_urls_from_file
from .store import Store

try:
    from rich.console import Console
    from rich.table import Table
    _console = Console()
except Exception:  # pragma: no cover
    _console = None


# --- small output helpers ---------------------------------------------------
def out(msg: str = "") -> None:
    if _console:
        _console.print(msg)
    else:
        print(_strip_markup(msg))


def out_plain(msg: str = "") -> None:
    """Print content that may contain '[...]' (page titles, draft scaffolds)
    without rich interpreting it as markup."""
    if _console:
        _console.print(msg, markup=False, highlight=False)
    else:
        print(msg)


def esc(s) -> str:
    """Escape dynamic text so rich won't eat its square brackets."""
    if s is None:
        return ""
    if _console:
        try:
            from rich.markup import escape
            return escape(str(s))
        except Exception:
            return str(s)
    return str(s)


def _strip_markup(s: str) -> str:
    import re
    return re.sub(r"\[/?[a-zA-Z0-9 #]+\]", "", s)


def err(msg: str) -> None:
    print(msg, file=sys.stderr)


# --- config / store plumbing ------------------------------------------------
def _load(args) -> Config:
    cfg = Config.load(getattr(args, "config", None))
    if getattr(args, "db", None):
        cfg.data.setdefault("storage", {})["db_path"] = args.db
    return cfg


def _store(cfg: Config) -> Store:
    return Store(cfg.get("storage.db_path", "backlinks.db"))


def _fetcher(cfg: Config) -> Fetcher:
    return Fetcher(
        user_agent=cfg.get("fetch.user_agent", "seo-backlink-finder/0.1"),
        timeout=cfg.get("fetch.timeout_seconds", 15),
        respect_robots=cfg.get("fetch.respect_robots_txt", True),
        delay=cfg.get("fetch.delay_seconds", 1.0),
        max_bytes=cfg.get("fetch.max_bytes", 3_000_000),
    )


def _metrics(cfg: Config) -> Optional[MetricsProvider]:
    use_opr = cfg.get("metrics.open_pagerank", True)
    use_rdap = cfg.get("metrics.rdap_domain_age", True)
    if not use_opr and not use_rdap:
        return None
    return MetricsProvider(
        openpagerank_key=cfg.secret("openpagerank") if use_opr else None,
        use_rdap=use_rdap,
        timeout=cfg.get("fetch.timeout_seconds", 15),
    )


def _saved_profile(cfg):
    """The site profile from the last `blf start`, if there is one.

    Guides and drafts read better with it (right language, right topics), and
    it costs one small query — but everything still works when it is absent."""
    try:
        store = Store(cfg.get("storage.db_path", "backlinks.db"))
        try:
            data = store.get_meta("site_profile")
        finally:
            store.close()
        if not data:
            return None
        from .profile import SiteProfile
        return SiteProfile.from_dict(data)
    except Exception:
        return None


def _resolve(store: Store, ref: str) -> Optional[Prospect]:
    """A prospect reference is a URL or '#<rowid>'."""
    if ref.startswith("#"):
        try:
            return store.get_by_id(int(ref[1:]))
        except ValueError:
            return None
    p = store.get(ref)
    if p:
        return p
    # URLs are stored normalised (no trailing slash, no tracking params), so
    # try the normalised form of whatever the user typed.
    from .discover import normalise_url
    norm = normalise_url(ref if ref.startswith(("http://", "https://"))
                         else "https://" + ref)
    if norm:
        p = store.get(norm)
        if p:
            return p
    # tolerate a URL missing its scheme
    if not ref.startswith(("http://", "https://")):
        return store.get("https://" + ref) or store.get("http://" + ref)
    return None


# --- commands ---------------------------------------------------------------
def cmd_init(args) -> int:
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    example = os.path.join(here, "config.example.yaml")
    target = args.config or "config.yaml"
    if os.path.exists(target) and not args.force:
        err(f"{target} already exists (use --force to overwrite)")
        return 1
    if os.path.exists(example):
        with open(example, encoding="utf-8") as fh:
            content = fh.read()
        with open(target, "w", encoding="utf-8") as fh:
            fh.write(content)
        out(f"Wrote {target}.")
    else:
        err("config.example.yaml not found next to the package; writing minimal config")
        with open(target, "w", encoding="utf-8") as fh:
            fh.write("site:\n  url: https://example.com\n  topics: []\n  languages: [en]\n")
    cfg = _load(args)
    _store(cfg).close()  # create the db
    out(f"Initialised database at {cfg.get('storage.db_path')}\n")
    out("[b]Next:[/b] you do not have to edit anything to begin — "
        "the site profile is read from your URL.")
    out("  [cyan]blf start https://yoursite.com[/cyan]    one command, end to end")
    out("  [cyan]blf serve[/cyan]                          web UI on http://127.0.0.1:8080")
    out("  [cyan]blf profile https://yoursite.com[/cyan]  check what it thinks your site is about")
    if not cfg.secret("serpapi") and not cfg.secret("google_cse_key"):
        out("\n[yellow]No search API key set.[/yellow] It will still run, using the "
            "built-in platform catalog.\n  For niche targets, add GOOGLE_CSE_KEY + "
            "GOOGLE_CSE_CX (free tier) — see config.example.env.")
    return 0


def cmd_footprints(args) -> int:
    cfg = _load(args)
    if args.list:
        out("[b]Available categories:[/b]")
        for key in footprints.all_keys():
            c = footprints.category(key)
            out(f"  [cyan]{key:16}[/cyan] {c.description}")
        return 0
    keyword = args.keyword or (cfg.get("site.topics") or ["your keyword"])[0]
    cats = _categories(args, cfg)
    langs = cfg.get("site.languages", ["en"])
    pairs = footprints.render_queries(keyword, cats, langs)
    out(f"[b]{len(pairs)} search queries for '{keyword}'[/b] "
        f"(paste into Google, collect the result URLs):\n")
    current = None
    for cat, q in pairs:
        if cat != current:
            out(f"[yellow]# {cat}[/yellow]")
            current = cat
        out(f"  {q}")
    out("\nThen: run them, save the URLs to a file, and "
        "`blf import --input urls.txt` (or use a search provider with `blf discover`).")
    return 0


def cmd_discover(args) -> int:
    cfg = _load(args)
    from .search_providers import resolve_provider_name
    requested = args.provider or cfg.get("discovery.provider", "auto")
    # An explicit --provider manual with an --input file must stay manual.
    provider_name = (requested if (requested == "manual" and args.input)
                     else resolve_provider_name(requested, cfg))
    provider = get_provider(provider_name, cfg, args.input)
    if not provider.available():
        err(f"provider '{provider_name}' is not configured (missing API key?). "
            f"See config.example.env, or use --provider manual --input urls.txt")
        return 1
    keyword = args.keyword or (cfg.get("site.topics") or [None])[0]
    if not keyword and provider_name != "manual":
        err("--keyword is required (or set site.topics in config)")
        return 1
    cats = _categories(args, cfg)
    langs = cfg.get("site.languages", ["en"])
    rpq = args.limit or cfg.get("discovery.results_per_query", 20)
    own = _own_domain(cfg)

    store = _store(cfg)
    known = store.known_urls()

    def progress(cat, query, found):
        if found:
            out(f"  [green]+{found}[/green] {cat}: {query}")

    new = discover(provider, keyword, cats, langs, results_per_query=rpq,
                   known_urls=known, own_domain=own, on_query=progress)
    store.upsert_many(new)
    store.close()
    out(f"\n[b]Discovered {len(new)} new prospects.[/b] Next: [cyan]blf analyze[/cyan]")
    return 0


def cmd_add(args) -> int:
    cfg = _load(args)
    store = _store(cfg)
    new = prospects_from_urls([args.url], category=args.category,
                              known_urls=store.known_urls(),
                              own_domain=_own_domain(cfg))
    if not new:
        err("URL was invalid, a duplicate, or blocklisted.")
        store.close()
        return 1
    store.upsert_many(new)
    store.close()
    out(f"Added {new[0].url}. Next: [cyan]blf analyze[/cyan]")
    return 0


def cmd_import(args) -> int:
    cfg = _load(args)
    if not args.input or not os.path.isfile(args.input):
        err("--input FILE is required and must exist")
        return 1
    urls = load_urls_from_file(args.input)
    store = _store(cfg)
    new = prospects_from_urls(urls, category=args.category,
                              known_urls=store.known_urls(),
                              own_domain=_own_domain(cfg))
    store.upsert_many(new)
    store.close()
    out(f"Imported {len(new)} new prospects from {args.input} "
        f"({len(urls)} lines read). Next: [cyan]blf analyze[/cyan]")
    return 0


def cmd_analyze(args) -> int:
    cfg = _load(args)
    from . import pipeline
    store = _store(cfg)
    targets = store.all(only_unanalyzed=not args.all,
                        limit=args.limit or None)
    if not targets:
        out("Nothing to analyze. Discover or add prospects first.")
        store.close()
        return 0
    fetcher = _fetcher(cfg)
    mp = _metrics(cfg)

    # Batch authority lookups once for all domains.
    authority_cache = {}
    if mp and cfg.secret("openpagerank"):
        domains = sorted({p.domain for p in targets})
        out(f"Fetching domain authority for {len(domains)} domains…")
        authority_cache = mp.authority_batch(domains)

    out(f"Analyzing {len(targets)} prospects…")
    for i, p in enumerate(targets, 1):
        pipeline.analyze_prospect(p, fetcher, mp, cfg, authority_cache)
        store.upsert(p)
        badge = p.scores.tier
        note = p.analysis.error or f"Q{p.scores.quality} E{p.scores.ease}"
        out(f"  [{i}/{len(targets)}] [b]{badge}[/b] {p.domain} — {note}")
    store.close()
    out(f"\nDone. Next: [cyan]blf rank[/cyan] or [cyan]blf export --format html[/cyan]")
    return 0


def cmd_start(args) -> int:
    """The one-command flow: a URL in, ranked targets out."""
    cfg = _load(args)
    from .run import Campaign, run_campaign

    site = args.url or cfg.get("site.url")
    if not site or "example.com" in site:
        err("Give me your site: blf start https://yoursite.com")
        return 1

    campaign = Campaign()
    out(f"[b]Starting campaign for {site}[/b]\n")
    result = run_campaign(
        site, cfg, campaign=campaign,
        max_targets=args.limit or 60,
        categories=[c.strip() for c in args.categories.split(",")] if args.categories else None,
        use_seeds=not args.no_seeds,
        on_event=lambda m: out_plain(m),
    )
    if result.get("error"):
        err(f"campaign failed: {result['error']}")
        return 1

    prof = result.get("profile") or {}
    out(f"\n[b]Site profile[/b]")
    out_plain(f"  brand    : {prof.get('brand')}")
    out_plain(f"  language : {prof.get('language')}"
              + (f"  country: {prof.get('country')}" if prof.get("country") else ""))
    out_plain(f"  topics   : {', '.join(prof.get('topics') or [])}")
    out_plain(f"  keywords : {', '.join(prof.get('seed_keywords') or [])}")

    store = _store(cfg)
    rows = store.all(order_by="priority", limit=args.show or 20)
    store.close()
    if rows:
        out(f"\n[b]Top targets[/b]")
        _print_table(rows)
    out(f"\nNext: [cyan]blf rank --min-tier B[/cyan] · "
        f"[cyan]blf draft \"#1\"[/cyan] · [cyan]blf export --format html[/cyan]")
    return 0


def cmd_profile(args) -> int:
    """Inspect what the tool thinks your site is about."""
    cfg = _load(args)
    from .profile import build_profile

    site = args.url or cfg.get("site.url")
    if not site:
        err("give a URL: blf profile https://yoursite.com")
        return 1
    prof = build_profile(site, _fetcher(cfg), max_pages=args.pages,
                         on_progress=lambda m: out_plain(f"  {m}"))
    out(f"\n[b]{prof.domain}[/b]")
    out_plain(f"  brand      : {prof.brand}")
    out_plain(f"  title      : {prof.title}")
    out_plain(f"  language   : {prof.language}  (drafts will use: {', '.join(prof.languages)})")
    out_plain(f"  country    : {prof.country or '—'}"
              + ("   [local business]" if prof.is_local_business else ""))
    out_plain(f"  pages read : {len(prof.pages_read)}")
    out("\n  [b]topics[/b]")
    for phrase, sc in prof.keyphrases[:12]:
        out_plain(f"    {sc:8.1f}  {phrase}")
    out("\n  [b]search keywords[/b]")
    for kw in prof.seed_keywords:
        out_plain(f"    - {kw}")
    out("\n  [b]categories to search[/b]")
    out_plain(f"    {', '.join(prof.categories)}")
    for note in prof.notes:
        out_plain(f"  note: {note}")
    if args.save:
        prof.save(args.save)
        out(f"\nSaved profile to {args.save}")
    return 0


def cmd_serve(args) -> int:
    """Run the web UI."""
    cfg = _load(args)
    from .webui import serve
    serve(cfg, host=args.host, port=args.port)
    return 0


def cmd_rank(args) -> int:
    cfg = _load(args)
    store = _store(cfg)
    rows = store.all(status=args.status, min_tier=args.min_tier,
                     opportunity_type=args.type, order_by=args.order,
                     limit=args.limit or None,
                     min_match=args.min_match)
    store.close()
    if not rows:
        out("No prospects match. Try 'blf analyze' first, or loosen the filters.")
        return 0
    _print_table(rows, store_for_ids=cfg)
    return 0


def cmd_show(args) -> int:
    cfg = _load(args)
    store = _store(cfg)
    p = _resolve(store, args.ref)
    store.close()
    if not p:
        err(f"not found: {args.ref}")
        return 1
    a, m, s = p.analysis, p.metrics, p.scores
    out(f"[b]{p.url}[/b]")
    out(f"  domain      : {p.domain}")
    out(f"  type        : {p.opportunity_type.label}  (category: {p.category})")
    out(f"  status      : {p.status.value}")
    out(f"  tier        : [b]{s.tier}[/b]   quality {s.quality}  ease {s.ease}  priority {s.priority}")
    out(f"  authority   : {m.authority}  ({m.authority_source or 'n/a'})")
    out(f"  domain age  : {m.domain_age_days} days" + (f"  (since {m.domain_created})" if m.domain_created else ""))
    out(f"  language    : {a.content_lang} (declared {a.declared_lang}, conf {a.lang_confidence})")
    out(f"  platform    : {a.platform}   comments: {a.comment_system}   comment form: {a.has_comment_form}")
    out(f"  link attr   : {a.link_attribute.value}   external links: {a.external_links} ({a.external_dofollow} dofollow)")
    out(f"  contact     : {a.contact_email or a.contact_url or '—'}")
    if a.title:
        out_plain(f"  title       : {a.title}")
    if s.breakdown:
        out(f"  score parts : { {k: v for k, v in s.breakdown.items() if not k.startswith('_')} }")
    if a.signals:
        out("  signals     :")
        for sig in a.signals:
            out_plain(f"    - {sig}")
    if a.error:
        out(f"  [red]error       : {a.error}[/red]")
    return 0


def cmd_draft(args) -> int:
    cfg = _load(args)
    from . import assist
    store = _store(cfg)
    p = _resolve(store, args.ref)
    store.close()
    if not p:
        err(f"not found: {args.ref}")
        return 1
    if not p.analysis.fetched:
        err("This prospect hasn't been analyzed yet. Run 'blf analyze' first "
            "so the draft matches the site's language and link rules.")
        return 1

    kind = args.kind
    if kind == "auto":
        kind = _default_kind(p)
    if kind == "comment":
        d = assist.draft_comment(p, cfg, include_link=args.link)
    elif kind == "outreach":
        d = assist.draft_outreach(p, cfg)
    elif kind == "directory":
        d = assist.draft_directory_submission(p, cfg)
    else:
        err(f"unknown --kind {kind}")
        return 1

    out(f"[b]{d.kind.upper()} draft[/b] · language: {d.language} · by: {d.generated_by}")
    if d.subject:
        out(f"[b]Subject:[/b] {esc(d.subject)}")
    out("[dim]" + "-" * 60 + "[/dim]")
    out_plain(d.body)
    out("[dim]" + "-" * 60 + "[/dim]")
    if d.warnings:
        out("[yellow]Warnings:[/yellow]")
        for w in d.warnings:
            out_plain(f"  ⚠ {w}")
    out("[b]Before you post (human review required):[/b]")
    for c in d.checklist:
        out_plain(f"  ☐ {c}")
    return 0


def cmd_guide(args) -> int:
    """Step-by-step: how to actually get a link from this site."""
    cfg = _load(args)
    from .models import APPROVAL_LABELS_TH
    from .playbook import guide_for

    store = _store(cfg)
    p = _resolve(store, args.ref)
    store.close()
    if not p:
        err(f"not found: {args.ref}")
        return 1

    g = guide_for(p, cfg, profile=_saved_profile(cfg))
    is_th = g.language == "th"
    approval_text = (APPROVAL_LABELS_TH.get(g.approval, g.approval.value)
                     if is_th else g.approval.label)
    colour = {"instant": "green", "moderated": "yellow", "editorial": "cyan",
              "verification": "magenta", "paid": "red"}.get(g.approval.value, "white")

    out(f"[b]{p.domain}[/b]  ·  {p.opportunity_type.label}")
    out(f"[{colour}]● {approval_text}[/{colour}]"
        + (f"   ⏱ {esc(g.effort)}" if g.effort else ""))
    if g.summary:
        out_plain(f"\n{g.summary}")

    def section(title: str, items: list, bullet: str = "•") -> None:
        if not items:
            return
        out(f"\n[b]{title}[/b]")
        for i, item in enumerate(items, 1):
            mark = f"{i}." if bullet == "#" else bullet
            out_plain(f"  {mark} {item}")

    label = {
        True: ("สิ่งที่พบในหน้านี้", "เตรียมให้พร้อมก่อน", "ขั้นตอน",
               "ข้อผิดพลาดที่ทำให้ไม่ผ่าน", "ตรวจว่าสำเร็จแล้วหรือยัง"),
        False: ("What we found on this page", "Prepare first", "Steps",
                "Why submissions get rejected", "Confirm it worked"),
    }[is_th]

    section(label[0], g.facts)
    section(label[1], g.prep)
    section(label[2], g.steps, bullet="#")
    section(label[3], g.pitfalls, bullet="⚠")
    section(label[4], g.verify, bullet="☐")

    out("\n" + ("[dim]เมื่อทำแล้ว: blf status \"%s\" contacted[/dim]" % p.url
                if is_th else
                "[dim]When done: blf status \"%s\" contacted[/dim]" % p.url))
    return 0


def cmd_status(args) -> int:
    cfg = _load(args)
    store = _store(cfg)
    p = _resolve(store, args.ref)
    if not p:
        err(f"not found: {args.ref}")
        store.close()
        return 1
    try:
        new_status = Status(args.state)
    except ValueError:
        err(f"invalid status '{args.state}'. One of: "
            + ", ".join(s.value for s in Status))
        store.close()
        return 1
    store.set_status(p.url, new_status, note=args.note)
    store.close()
    out(f"{p.url} -> {new_status.value}")
    return 0


def cmd_export(args) -> int:
    cfg = _load(args)
    from . import report
    store = _store(cfg)
    rows = store.all(min_tier=args.min_tier, opportunity_type=args.type,
                     status=args.status, order_by="priority")
    store.close()
    fmt = args.format
    default_out = {"html": "backlinks.html", "csv": "backlinks.csv",
                   "md": "backlinks.md"}[fmt]
    path = args.out or default_out
    if fmt == "html":
        n = report.export_html(rows, path, title=f"Backlink prospects — {cfg.get('site.name','')}")
    elif fmt == "csv":
        n = report.export_csv(rows, path)
    else:
        n = report.export_markdown(rows, path)
    out(f"Wrote {n} prospects to {path}")
    return 0


def cmd_stats(args) -> int:
    cfg = _load(args)
    store = _store(cfg)
    st = store.stats()
    store.close()
    out(f"[b]Total prospects:[/b] {st['total']}")
    out(f"  by tier   : {st['by_tier']}")
    out(f"  by status : {st['by_status']}")
    out(f"  by type   : {st['by_type']}")
    return 0


# --- shared bits ------------------------------------------------------------
def _categories(args, cfg) -> list[str]:
    if getattr(args, "categories", None):
        return [c.strip() for c in args.categories.split(",") if c.strip()]
    return cfg.get("discovery.categories", footprints.all_keys())


def _own_domain(cfg) -> Optional[str]:
    from .analyze import registrable_domain
    site = cfg.get("site.url")
    return registrable_domain(site) if site else None


def _default_kind(p: Prospect) -> str:
    from .models import OpportunityType
    if p.opportunity_type in (OpportunityType.GUEST_POST,
                              OpportunityType.RESOURCE_PAGE,
                              OpportunityType.EDITORIAL_MENTION):
        return "outreach"
    if p.opportunity_type in (OpportunityType.DIRECTORY,
                              OpportunityType.BUSINESS_LISTING,
                              OpportunityType.PROFILE):
        return "directory"
    return "comment"


def _print_table(rows: list[Prospect], store_for_ids=None) -> None:
    if _console:
        table = Table(show_lines=False, header_style="bold")
        for col in ("Tier", "Prio", "Qual", "Match", "Ease", "Auth", "Type",
                    "Link", "Lang", "Status", "Domain"):
            table.add_column(col)
        tier_color = {"A": "green", "B": "cyan", "C": "yellow", "D": "dim"}
        for p in rows:
            tc = tier_color.get(p.scores.tier, "white")
            match = p.scores.match
            mc = "green" if match >= 60 else ("yellow" if match >= 30 else "dim")
            table.add_row(
                f"[{tc}]{p.scores.tier}[/{tc}]",
                str(p.scores.priority), str(p.scores.quality),
                f"[{mc}]{match}[/{mc}]", str(p.scores.ease),
                "" if p.metrics.authority is None else str(p.metrics.authority),
                p.opportunity_type.label, p.analysis.link_attribute.value,
                p.analysis.content_lang or "", p.status.value, p.domain,
            )
        _console.print(table)
    else:
        print(f"{'Tier':4} {'Prio':5} {'Qual':5} {'Match':6} {'Ease':5} "
              f"{'Type':16} {'Link':9} {'Domain'}")
        for p in rows:
            print(f"{p.scores.tier:4} {p.scores.priority:<5} {p.scores.quality:<5} "
                  f"{p.scores.match:<6} {p.scores.ease:<5} "
                  f"{p.opportunity_type.value:16} "
                  f"{p.analysis.link_attribute.value:9} {p.domain}")


# --- parser -----------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="blf", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--version", action="version", version=f"seo-backlink-finder {__version__}")
    p.add_argument("--config", help="path to config.yaml")
    p.add_argument("--db", help="override storage.db_path")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("init", help="create config.yaml and the database")
    sp.add_argument("--force", action="store_true")
    sp.set_defaults(func=cmd_init)

    sp = sub.add_parser("start", help="one command: profile your site, then "
                                      "find and rank backlink targets for it")
    sp.add_argument("url", nargs="?", help="your website (defaults to site.url)")
    sp.add_argument("--limit", type=int, help="max targets to analyze (default 60)")
    sp.add_argument("--show", type=int, help="how many rows to print at the end")
    sp.add_argument("--categories", help="comma-separated category keys")
    sp.add_argument("--no-seeds", action="store_true",
                    help="skip the built-in platform catalog")
    sp.set_defaults(func=cmd_start)

    sp = sub.add_parser("profile", help="show what the tool thinks your site is about")
    sp.add_argument("url", nargs="?")
    sp.add_argument("--pages", type=int, default=6, help="how many pages to read")
    sp.add_argument("--save", help="write the profile to a JSON file")
    sp.set_defaults(func=cmd_profile)

    sp = sub.add_parser("serve", help="run the web UI (paste a URL, press Start)")
    sp.add_argument("--host", default="127.0.0.1")
    sp.add_argument("--port", type=int, default=8080)
    sp.set_defaults(func=cmd_serve)

    sp = sub.add_parser("footprints", help="print search queries to run by hand")
    sp.add_argument("--keyword", help="niche keyword (defaults to first topic)")
    sp.add_argument("--categories", help="comma-separated category keys")
    sp.add_argument("--list", action="store_true", help="list categories and exit")
    sp.set_defaults(func=cmd_footprints)

    sp = sub.add_parser("discover", help="gather prospect URLs via a search provider")
    sp.add_argument("--keyword")
    sp.add_argument("--categories")
    sp.add_argument("--provider",
                    choices=["auto", "serpapi", "google_cse", "manual", "none"])
    sp.add_argument("--input", help="URL file for --provider manual")
    sp.add_argument("--limit", type=int, help="results per query")
    sp.set_defaults(func=cmd_discover)

    sp = sub.add_parser("add", help="add one prospect URL")
    sp.add_argument("url")
    sp.add_argument("--category")
    sp.set_defaults(func=cmd_add)

    sp = sub.add_parser("import", help="bulk-add URLs from a file")
    sp.add_argument("--input", required=True)
    sp.add_argument("--category")
    sp.set_defaults(func=cmd_import)

    sp = sub.add_parser("analyze", help="fetch, score and classify prospects")
    sp.add_argument("--limit", type=int)
    sp.add_argument("--all", action="store_true", help="re-analyze everything")
    sp.set_defaults(func=cmd_analyze)

    sp = sub.add_parser("rank", help="list prospects, quality-first")
    sp.add_argument("--min-tier", dest="min_tier", choices=["A", "B", "C", "D"])
    sp.add_argument("--type")
    sp.add_argument("--status")
    sp.add_argument("--order", default="priority",
                    choices=["priority", "quality", "match", "ease",
                             "authority", "domain"])
    sp.add_argument("--min-match", dest="min_match", type=float,
                    help="only show targets matching your site at least this "
                         "well (0-100)")
    sp.add_argument("--limit", type=int)
    sp.set_defaults(func=cmd_rank)

    sp = sub.add_parser("show", help="full detail for one prospect")
    sp.add_argument("ref", help="URL or #rowid")
    sp.set_defaults(func=cmd_show)

    sp = sub.add_parser("draft", help="draft a comment / outreach / listing")
    sp.add_argument("ref", help="URL or #rowid")
    sp.add_argument("--kind", default="auto",
                    choices=["auto", "comment", "outreach", "directory"])
    sp.add_argument("--link", action="store_true",
                    help="for comments: include an optional resource link line")
    sp.set_defaults(func=cmd_draft)

    sp = sub.add_parser("guide", help="how to actually get a link from this site")
    sp.add_argument("ref", help="URL or #rowid")
    sp.set_defaults(func=cmd_guide)

    sp = sub.add_parser("status", help="update a prospect's pipeline status")
    sp.add_argument("ref", help="URL or #rowid")
    sp.add_argument("state", help="new status: " + ", ".join(s.value for s in Status))
    sp.add_argument("--note")
    sp.set_defaults(func=cmd_status)

    sp = sub.add_parser("export", help="write a CSV / Markdown / HTML report")
    sp.add_argument("--format", default="html", choices=["html", "csv", "md"])
    sp.add_argument("--out")
    sp.add_argument("--min-tier", dest="min_tier", choices=["A", "B", "C", "D"])
    sp.add_argument("--type")
    sp.add_argument("--status")
    sp.set_defaults(func=cmd_export)

    sp = sub.add_parser("stats", help="pipeline summary")
    sp.set_defaults(func=cmd_stats)

    return p


def main(argv: Optional[list] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except KeyboardInterrupt:
        err("\ninterrupted")
        return 130
    except BrokenPipeError:  # pragma: no cover
        return 0


if __name__ == "__main__":
    sys.exit(main())
