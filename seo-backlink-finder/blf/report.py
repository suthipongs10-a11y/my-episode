"""Export prospects to CSV, Markdown, or a self-contained HTML report.

The HTML report is the day-to-day deliverable: one file, no external assets,
sortable columns, tier colouring, a quality/ease scatter feel via the two
score columns, and a filter box. Open it in any browser.
"""
from __future__ import annotations

import csv
import html
import json
from typing import Iterable

from .language import name as lang_name
from .models import Prospect

_COLUMNS = [
    ("tier", "Tier"),
    ("priority", "Priority"),
    ("quality", "Quality"),
    ("match", "Match"),
    ("ease", "Ease"),
    ("authority", "Authority"),
    ("opportunity_type", "Type"),
    ("link_attribute", "Link"),
    ("content_lang", "Lang"),
    ("status", "Status"),
    ("domain", "Domain"),
    ("url", "URL"),
]


def _row_values(p: Prospect) -> dict:
    return {
        "tier": p.scores.tier,
        "priority": p.scores.priority,
        "quality": p.scores.quality,
        "match": p.scores.match,
        "ease": p.scores.ease,
        "authority": "" if p.metrics.authority is None else p.metrics.authority,
        "opportunity_type": p.opportunity_type.label,
        "link_attribute": p.analysis.link_attribute.value,
        "content_lang": p.analysis.content_lang or "",
        "status": p.status.value,
        "domain": p.domain,
        "url": p.url,
        "contact_email": p.analysis.contact_email or "",
        "source_query": p.source_query or "",
    }


def export_csv(prospects: Iterable[Prospect], path: str) -> int:
    prospects = list(prospects)
    fields = [c[0] for c in _COLUMNS] + ["contact_email", "source_query"]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        for p in prospects:
            w.writerow(_row_values(p))
    return len(prospects)


def export_markdown(prospects: Iterable[Prospect], path: str) -> int:
    prospects = list(prospects)
    headers = [label for _, label in _COLUMNS]
    lines = ["| " + " | ".join(headers) + " |",
             "|" + "|".join("---" for _ in headers) + "|"]
    for p in prospects:
        v = _row_values(p)
        cells = [str(v[key]) for key, _ in _COLUMNS]
        lines.append("| " + " | ".join(cells) + " |")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    return len(prospects)


_TIER_COLORS = {"A": "#1a7f37", "B": "#3b82f6", "C": "#d97706", "D": "#9ca3af"}


def export_html(prospects: Iterable[Prospect], path: str, title: str = "Backlink prospects") -> int:
    prospects = list(prospects)
    prospects.sort(key=lambda p: p.scores.priority, reverse=True)

    # summary
    tiers: dict[str, int] = {}
    for p in prospects:
        tiers[p.scores.tier] = tiers.get(p.scores.tier, 0) + 1
    summary = " · ".join(f"{t}: {tiers.get(t, 0)}" for t in ["A", "B", "C", "D"])

    rows = []
    for p in prospects:
        v = _row_values(p)
        tier = v["tier"]
        color = _TIER_COLORS.get(tier, "#9ca3af")
        warn = ""
        if p.analysis.link_attribute.value in ("nofollow", "ugc", "sponsored"):
            warn = ' title="link likely does not pass ranking value"'
        match = v["match"]
        mcolor = "#1a7f37" if match >= 60 else ("#d97706" if match >= 30 else "#9ca3af")
        cells = [
            f'<td><span class="tier" style="background:{color}">{tier}</span></td>',
            f'<td class="num">{v["priority"]}</td>',
            f'<td class="num">{v["quality"]}</td>',
            f'<td class="num" style="color:{mcolor};font-weight:600" '
            f'title="how well this site matches yours">{match}</td>',
            f'<td class="num">{v["ease"]}</td>',
            f'<td class="num">{v["authority"]}</td>',
            f'<td>{html.escape(str(v["opportunity_type"]))}</td>',
            f'<td{warn}>{html.escape(v["link_attribute"])}</td>',
            f'<td>{html.escape(lang_name(v["content_lang"]) if v["content_lang"] else "")}</td>',
            f'<td>{html.escape(v["status"])}</td>',
            f'<td>{html.escape(v["domain"])}</td>',
            f'<td class="url"><a href="{html.escape(v["url"])}" target="_blank" rel="noopener">{html.escape(v["url"][:70])}</a></td>',
        ]
        rows.append("<tr>" + "".join(cells) + "</tr>")

    doc = _HTML_TEMPLATE.format(
        title=html.escape(title),
        count=len(prospects),
        summary=html.escape(summary),
        headers="".join(f"<th>{html.escape(lbl)}</th>" for _, lbl in _COLUMNS),
        rows="\n".join(rows),
    )
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(doc)
    return len(prospects)


_HTML_TEMPLATE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{ font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         margin: 0; padding: 1.5rem; background: Canvas; color: CanvasText; }}
  h1 {{ font-size: 1.3rem; margin: 0 0 .25rem; }}
  .meta {{ color: #6b7280; margin-bottom: 1rem; font-size: .9rem; }}
  .controls {{ margin-bottom: .75rem; }}
  input[type=search] {{ padding: .45rem .6rem; width: min(360px, 100%);
         border: 1px solid #9ca3af; border-radius: 6px; font-size: .95rem;
         background: Canvas; color: CanvasText; }}
  .wrap {{ overflow-x: auto; border: 1px solid #e5e7eb44; border-radius: 8px; }}
  table {{ border-collapse: collapse; width: 100%; font-size: .88rem; }}
  th, td {{ padding: .5rem .6rem; text-align: left; white-space: nowrap;
           border-bottom: 1px solid #e5e7eb33; }}
  th {{ position: sticky; top: 0; background: Canvas; cursor: pointer;
       user-select: none; }}
  th:hover {{ color: #3b82f6; }}
  td.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  td.url {{ max-width: 380px; overflow: hidden; text-overflow: ellipsis; }}
  .tier {{ display: inline-block; min-width: 1.4em; text-align: center;
          padding: .1em .4em; border-radius: 4px; color: #fff; font-weight: 600; }}
  tr:hover td {{ background: #3b82f611; }}
  a {{ color: #3b82f6; text-decoration: none; }}
</style></head><body>
<h1>{title}</h1>
<div class="meta">{count} prospects · Tiers — {summary} · click a header to sort · quality-ranked</div>
<div class="controls">
  <input type="search" id="q" placeholder="filter by domain, type, language…">
</div>
<div class="wrap"><table id="t">
  <thead><tr>{headers}</tr></thead>
  <tbody>
{rows}
  </tbody>
</table></div>
<script>
const t = document.getElementById('t');
document.getElementById('q').addEventListener('input', e => {{
  const q = e.target.value.toLowerCase();
  for (const tr of t.tBodies[0].rows)
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
}});
t.tHead.addEventListener('click', e => {{
  const th = e.target.closest('th'); if (!th) return;
  const idx = [...th.parentNode.children].indexOf(th);
  const rows = [...t.tBodies[0].rows];
  const num = rows.every(r => r.cells[idx].textContent.trim() === '' ||
                              !isNaN(parseFloat(r.cells[idx].textContent)));
  const dir = th.dataset.dir = th.dataset.dir === 'asc' ? 'desc' : 'asc';
  rows.sort((a, b) => {{
    let x = a.cells[idx].textContent.trim(), y = b.cells[idx].textContent.trim();
    if (num) {{ x = parseFloat(x) || 0; y = parseFloat(y) || 0; return dir==='asc'?x-y:y-x; }}
    return dir==='asc' ? x.localeCompare(y) : y.localeCompare(x);
  }});
  rows.forEach(r => t.tBodies[0].appendChild(r));
}});
</script>
</body></html>
"""
