"""The web UI: paste your URL, press Start, watch it work.

Deliberately built on `http.server` from the standard library. It has no
build step, no framework, and no npm tree, which means it runs anywhere Python
runs — your laptop, a VPS, or a container — and it is the same code in all
three. The page is served as one self-contained HTML string; the browser polls
a small JSON API for progress.

Endpoints:
    GET  /                 the page
    POST /api/start        {"url": "..."} -> begins a campaign in a worker thread
    POST /api/stop         asks the running campaign to stop
    GET  /api/status       progress snapshot
    GET  /api/results      ranked prospects
    GET  /api/draft?url=   a drafted comment / outreach for one prospect
    POST /api/status-set   {"url":..., "state":...} move a prospect's pipeline state
"""
from __future__ import annotations

import html
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Optional
from urllib.parse import parse_qs, urlparse

from .config import Config
from .models import Status
from .run import Campaign, run_campaign
from .store import Store


class _State:
    """Server-wide state: at most one campaign runs at a time."""

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.campaign: Optional[Campaign] = None
        self.thread: Optional[threading.Thread] = None
        self.last_result: Optional[dict] = None
        self.lock = threading.Lock()

    def running(self) -> bool:
        return bool(self.thread and self.thread.is_alive())

    def start(self, url: str, limit: int, use_seeds: bool) -> tuple[bool, str]:
        with self.lock:
            if self.running():
                return False, "a campaign is already running"
            campaign = Campaign()
            self.campaign = campaign

            def work():
                try:
                    self.last_result = run_campaign(
                        url, self.cfg, campaign=campaign,
                        max_targets=limit, use_seeds=use_seeds,
                    )
                except Exception as exc:  # surfaced through the status endpoint
                    campaign.emit(f"Error: {exc}", phase="error", error=str(exc))

            self.thread = threading.Thread(target=work, daemon=True)
            self.thread.start()
            return True, "started"


def _handler_factory(state: _State):

    class Handler(BaseHTTPRequestHandler):
        server_version = "blf-webui"

        # keep the console readable; progress is visible in the UI
        def log_message(self, fmt, *args):
            pass

        # -- helpers ----------------------------------------------------
        def _send(self, code: int, body: bytes, ctype: str) -> None:
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            try:
                self.wfile.write(body)
            except BrokenPipeError:
                pass

        def _json(self, obj, code: int = 200) -> None:
            self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"),
                       "application/json; charset=utf-8")

        def _body(self) -> dict:
            try:
                n = int(self.headers.get("Content-Length") or 0)
                if not n:
                    return {}
                return json.loads(self.rfile.read(n).decode("utf-8"))
            except Exception:
                return {}

        # -- routes -----------------------------------------------------
        def do_GET(self):
            path = urlparse(self.path).path
            query = parse_qs(urlparse(self.path).query)

            if path == "/":
                self._send(200, PAGE.encode("utf-8"), "text/html; charset=utf-8")
            elif path == "/api/status":
                snap = state.campaign.snapshot() if state.campaign else {"phase": "idle"}
                snap["running"] = state.running()
                self._json(snap)
            elif path == "/api/results":
                self._json(self._results(query))
            elif path == "/api/draft":
                self._json(self._draft(query))
            elif path == "/api/guide":
                self._json(self._guide(query))
            else:
                self._json({"error": "not found"}, 404)

        def do_POST(self):
            path = urlparse(self.path).path
            data = self._body()

            if path == "/api/start":
                url = (data.get("url") or "").strip()
                if not url:
                    return self._json({"error": "url is required"}, 400)
                limit = int(data.get("limit") or 60)
                ok, msg = state.start(url, limit, bool(data.get("seeds", True)))
                self._json({"ok": ok, "message": msg}, 200 if ok else 409)
            elif path == "/api/stop":
                if state.campaign:
                    state.campaign.stop()
                self._json({"ok": True})
            elif path == "/api/status-set":
                self._json(self._set_status(data))
            else:
                self._json({"error": "not found"}, 404)

        # -- data -------------------------------------------------------
        def _profile(self):
            """The saved site profile, so guides and drafts match your site."""
            store = Store(state.cfg.get("storage.db_path", "backlinks.db"))
            try:
                data = store.get_meta("site_profile")
            finally:
                store.close()
            if not data:
                return None
            from .profile import SiteProfile
            return SiteProfile.from_dict(data)

        def _guide(self, query) -> dict:
            from .models import APPROVAL_LABELS_TH
            from .playbook import guide_for
            url = (query.get("url") or [""])[0]
            store = Store(state.cfg.get("storage.db_path", "backlinks.db"))
            try:
                p = store.get(url)
            finally:
                store.close()
            if not p:
                return {"error": "prospect not found"}
            g = guide_for(p, state.cfg, profile=self._profile())
            d = g.to_dict()
            d["approval_label"] = (APPROVAL_LABELS_TH.get(g.approval, g.approval.value)
                                   if g.language == "th" else g.approval.label)
            d["domain"] = p.domain
            d["url"] = p.url
            d["type"] = p.opportunity_type.label
            return d

        def _results(self, query) -> dict:
            store = Store(state.cfg.get("storage.db_path", "backlinks.db"))
            try:
                order = (query.get("order") or ["priority"])[0]
                min_tier = (query.get("min_tier") or [None])[0]
                min_match = (query.get("min_match") or [None])[0]
                otype = (query.get("type") or [None])[0]
                rows = store.all(
                    order_by=order, min_tier=min_tier, opportunity_type=otype,
                    min_match=float(min_match) if min_match else None,
                    limit=int((query.get("limit") or [300])[0]),
                )
                stats = store.stats()
            finally:
                store.close()
            from .models import APPROVAL_LABELS_TH
            from .playbook import approval_for
            th = (state.cfg.get("assist.guide_language") or "").lower().startswith("th")

            def approval(p):
                a = approval_for(p)
                return {
                    "key": a.value,
                    "label": APPROVAL_LABELS_TH.get(a, a.value) if th else a.label,
                }

            return {
                "stats": stats,
                "rows": [{
                    "url": p.url,
                    "domain": p.domain,
                    "type": p.opportunity_type.label,
                    "type_key": p.opportunity_type.value,
                    "approval": approval(p)["key"],
                    "approval_label": approval(p)["label"],
                    "tier": p.scores.tier,
                    "priority": p.scores.priority,
                    "quality": p.scores.quality,
                    "match": p.scores.match,
                    "ease": p.scores.ease,
                    "authority": p.metrics.authority,
                    "link": p.analysis.link_attribute.value,
                    "lang": p.analysis.content_lang or "",
                    "status": p.status.value,
                    "email": p.analysis.contact_email or "",
                    "note": p.notes or "",
                } for p in rows],
            }

        def _draft(self, query) -> dict:
            from . import assist
            url = (query.get("url") or [""])[0]
            kind = (query.get("kind") or ["auto"])[0]
            include_link = (query.get("link") or ["0"])[0] == "1"
            store = Store(state.cfg.get("storage.db_path", "backlinks.db"))
            try:
                p = store.get(url)
            finally:
                store.close()
            if not p:
                return {"error": "prospect not found"}
            if not p.analysis.fetched:
                return {"error": "not analyzed yet"}
            if kind == "auto":
                from .cli import _default_kind
                kind = _default_kind(p)
            if kind == "comment":
                d = assist.draft_comment(p, state.cfg, include_link=include_link)
            elif kind == "outreach":
                d = assist.draft_outreach(p, state.cfg)
            else:
                d = assist.draft_directory_submission(p, state.cfg)
            return {
                "kind": d.kind, "language": d.language, "subject": d.subject,
                "body": d.body, "warnings": d.warnings, "checklist": d.checklist,
                "generated_by": d.generated_by,
            }

        def _set_status(self, data) -> dict:
            url = (data.get("url") or "").strip()
            state_name = (data.get("state") or "").strip()
            try:
                new = Status(state_name)
            except ValueError:
                return {"error": f"bad status {state_name}"}
            store = Store(state.cfg.get("storage.db_path", "backlinks.db"))
            try:
                ok = store.set_status(url, new, note=data.get("note"))
            finally:
                store.close()
            return {"ok": ok}

    return Handler


def serve(cfg: Config, host: str = "127.0.0.1", port: int = 8080) -> None:
    state = _State(cfg)
    httpd = ThreadingHTTPServer((host, port), _handler_factory(state))
    print(f"blf web UI on http://{host}:{port}  (Ctrl-C to stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopping…")
    finally:
        httpd.server_close()


# ---------------------------------------------------------------------------
# The page. One file, no external requests, works offline.
# ---------------------------------------------------------------------------
PAGE = r"""<!doctype html>
<html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Backlink Finder</title>
<style>
  :root{color-scheme:light dark;--bd:#8883;--mut:#6b7280;--acc:#3b82f6}
  *{box-sizing:border-box}
  body{margin:0;padding:1.25rem;font-family:system-ui,-apple-system,"Segoe UI",
       Roboto,"Noto Sans Thai",sans-serif;background:Canvas;color:CanvasText}
  h1{font-size:1.25rem;margin:0 0 .2rem}
  .sub{color:var(--mut);font-size:.85rem;margin-bottom:1rem}
  .card{border:1px solid var(--bd);border-radius:10px;padding:1rem;margin-bottom:1rem}
  .row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}
  input[type=text],input[type=number],select{padding:.55rem .7rem;border:1px solid #9ca3af;
       border-radius:7px;background:Canvas;color:CanvasText;font-size:.95rem}
  input[type=text]{flex:1;min-width:260px}
  button{padding:.55rem 1.1rem;border:0;border-radius:7px;background:var(--acc);
       color:#fff;font-size:.95rem;font-weight:600;cursor:pointer}
  button:disabled{opacity:.5;cursor:not-allowed}
  button.ghost{background:transparent;color:var(--acc);border:1px solid var(--acc)}
  .bar{height:6px;background:#8882;border-radius:99px;overflow:hidden;margin:.75rem 0 .5rem}
  .bar>i{display:block;height:100%;background:var(--acc);width:0;transition:width .3s}
  pre.log{margin:0;max-height:240px;overflow:auto;font-size:.78rem;line-height:1.5;
       background:#8881;padding:.6rem;border-radius:7px;white-space:pre-wrap}
  .prof{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.6rem}
  .prof div{font-size:.85rem}
  .prof b{display:block;color:var(--mut);font-weight:500;font-size:.75rem}
  .chips{display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.3rem}
  .chip{background:#8882;padding:.15rem .5rem;border-radius:99px;font-size:.75rem}
  .wrap{overflow-x:auto}
  table{border-collapse:collapse;width:100%;font-size:.85rem}
  th,td{padding:.45rem .55rem;text-align:left;white-space:nowrap;border-bottom:1px solid var(--bd)}
  th{position:sticky;top:0;background:Canvas;cursor:pointer;user-select:none}
  td.num{text-align:right;font-variant-numeric:tabular-nums}
  tr:hover td{background:#3b82f611}
  .tier{display:inline-block;min-width:1.4em;text-align:center;padding:.05em .4em;
       border-radius:4px;color:#fff;font-weight:700;font-size:.78rem}
  .A{background:#1a7f37}.B{background:#3b82f6}.C{background:#d97706}.D{background:#9ca3af}
  .mhi{color:#1a7f37;font-weight:600}.mmd{color:#d97706}.mlo{color:var(--mut)}
  .ap{display:inline-block;padding:.1em .5em;border-radius:99px;font-size:.75rem;
      white-space:nowrap;border:1px solid currentColor}
  .ap-instant{color:#1a7f37}.ap-moderated{color:#d97706}.ap-editorial{color:#3b82f6}
  .ap-verification{color:#9333ea}.ap-paid{color:#dc2626}.ap-unknown{color:var(--mut)}
  td.acts{display:flex;gap:.3rem}
  td.acts button{padding:.3rem .6rem;font-size:.78rem}
  .gsec{margin-top:.9rem}
  .gsec h4{margin:0 0 .35rem;font-size:.9rem}
  .gsec ol,.gsec ul{margin:0;padding-left:1.4rem;font-size:.87rem;line-height:1.65}
  .gsec li{margin-bottom:.3rem}
  .gwarn li{color:#b45309}
  .gfact{background:#3b82f611;border-left:3px solid var(--acc);padding:.5rem .7rem;
         border-radius:0 6px 6px 0;font-size:.85rem;line-height:1.6}
  a{color:var(--acc);text-decoration:none}
  dialog{border:1px solid var(--bd);border-radius:10px;padding:1rem;max-width:min(680px,92vw);
       background:Canvas;color:CanvasText}
  dialog pre{white-space:pre-wrap;background:#8881;padding:.7rem;border-radius:7px;font-size:.85rem}
  .warn{color:#b45309;font-size:.83rem}
  .muted{color:var(--mut);font-size:.8rem}
</style></head><body>

<h1>Backlink Finder</h1>
<div class="sub">วาง URL เว็บของคุณ แล้วกด Start — ระบบจะวิเคราะห์เว็บ หา keyword ที่เหมาะ
แล้วค้นหาและจัดอันดับเป้าหมายให้อัตโนมัติ</div>

<div class="card">
  <div class="row">
    <input type="text" id="url" placeholder="payofflogic.com" autocomplete="url">
    <input type="number" id="limit" value="60" min="5" max="500" title="จำนวนเป้าหมายสูงสุด" style="width:110px">
    <button id="go">Start</button>
    <button id="stop" class="ghost" disabled>Stop</button>
  </div>
  <div class="bar"><i id="pbar"></i></div>
  <div class="row" style="justify-content:space-between">
    <span id="phase" class="muted">พร้อมเริ่ม</span>
    <span id="counts" class="muted"></span>
  </div>
  <pre class="log" id="log" hidden></pre>
</div>

<div class="card" id="profcard" hidden>
  <div style="font-weight:600;margin-bottom:.6rem">เว็บของคุณ</div>
  <div class="prof" id="prof"></div>
</div>

<div class="card">
  <div class="row" style="justify-content:space-between;margin-bottom:.7rem">
    <div style="font-weight:600">เป้าหมาย <span id="total" class="muted"></span></div>
    <div class="row">
      <select id="tier"><option value="">ทุก Tier</option><option>A</option>
        <option>B</option><option>C</option><option>D</option></select>
      <select id="order">
        <option value="priority">เรียง: Priority</option>
        <option value="quality">เรียง: Quality</option>
        <option value="match">เรียง: Match</option>
        <option value="ease">เรียง: Ease</option>
      </select>
      <input type="number" id="minmatch" placeholder="Match ≥" style="width:110px" min="0" max="100">
      <button class="ghost" id="refresh">รีเฟรช</button>
    </div>
  </div>
  <div class="wrap"><table id="t">
    <thead><tr><th>Tier</th><th>Prio</th><th>Qual</th><th>Match</th><th>Ease</th>
      <th>Auth</th><th>ประเภท</th><th>การอนุมัติ</th><th>Link</th><th>ภาษา</th>
      <th>สถานะ</th><th>โดเมน</th><th></th></tr></thead>
    <tbody id="tb"><tr><td colspan="13" class="muted">ยังไม่มีข้อมูล — กด Start</td></tr></tbody>
  </table></div>
</div>

<dialog id="gdlg">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem">
    <b id="gtitle"></b>
    <button class="ghost" onclick="document.getElementById('gdlg').close()">ปิด</button>
  </div>
  <div id="gmeta" class="muted" style="margin:.3rem 0 .5rem"></div>
  <div id="gbody"></div>
  <div class="row" style="margin-top:.9rem">
    <button id="gdone">ทำแล้ว → ตั้งเป็น contacted</button>
    <a id="gopen" href="#" target="_blank" rel="noopener">
      <button class="ghost" type="button">เปิดเว็บนั้น</button></a>
  </div>
</dialog>

<dialog id="dlg">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem">
    <b id="dtitle"></b>
    <button class="ghost" onclick="document.getElementById('dlg').close()">ปิด</button>
  </div>
  <div id="dmeta" class="muted" style="margin:.3rem 0 .6rem"></div>
  <pre id="dbody"></pre>
  <div id="dwarn"></div>
  <div id="dcheck" class="muted"></div>
  <div class="row" style="margin-top:.7rem">
    <button id="dcopy">คัดลอก</button>
    <select id="dkind"><option value="auto">อัตโนมัติ</option>
      <option value="comment">คอมเมนต์</option><option value="outreach">อีเมล</option>
      <option value="directory">ฟอร์มไดเรกทอรี</option></select>
    <label class="muted"><input type="checkbox" id="dlink"> ใส่ลิงก์เว็บเรา</label>
  </div>
</dialog>

<script>
const $ = id => document.getElementById(id);
let poll = null, curUrl = null;

async function api(path, opts) {
  const r = await fetch(path, opts);
  return r.json();
}

$('go').onclick = async () => {
  const url = $('url').value.trim();
  if (!url) { $('url').focus(); return; }
  $('go').disabled = true; $('stop').disabled = false;
  $('log').hidden = false; $('log').textContent = '';
  const res = await api('/api/start', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({url, limit: +$('limit').value || 60})
  });
  if (res.error || res.ok === false) {
    alert(res.error || res.message); $('go').disabled = false; $('stop').disabled = true; return;
  }
  poll = setInterval(tick, 900); tick();
};

$('stop').onclick = () => api('/api/stop', {method:'POST'});
$('refresh').onclick = loadResults;
$('tier').onchange = loadResults; $('order').onchange = loadResults;
$('minmatch').onchange = loadResults;
$('url').addEventListener('keydown', e => { if (e.key === 'Enter') $('go').click(); });

async function tick() {
  const s = await api('/api/status');
  $('phase').textContent = ({profiling:'กำลังวิเคราะห์เว็บคุณ…',
    discovering:'กำลังค้นหาเป้าหมาย…', analyzing:'กำลังตรวจเป้าหมาย…',
    done:'เสร็จแล้ว', error:'ผิดพลาด', idle:'พร้อมเริ่ม'}[s.phase]) || s.phase;
  $('counts').textContent = (s.found ? `พบ ${s.found} · ` : '') +
    (s.total ? `ตรวจแล้ว ${s.done}/${s.total}` : '');
  $('pbar').style.width = s.total ? (100 * s.done / s.total) + '%'
    : (s.phase === 'done' ? '100%' : '15%');
  if (s.log) { $('log').textContent = s.log.join('\n'); $('log').scrollTop = 1e9; }
  if (s.profile) renderProfile(s.profile);
  if (!s.running) {
    clearInterval(poll); poll = null;
    $('go').disabled = false; $('stop').disabled = true;
    loadResults();
  }
}

function renderProfile(p) {
  $('profcard').hidden = false;
  const chips = a => `<div class="chips">${(a||[]).map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div>`;
  $('prof').innerHTML = `
    <div><b>แบรนด์</b>${esc(p.brand||'—')}</div>
    <div><b>ภาษา</b>${esc(p.language||'—')}</div>
    <div><b>ประเทศ</b>${esc(p.country||'—')}${p.is_local_business?' · ธุรกิจท้องถิ่น':''}</div>
    <div><b>อ่านแล้ว</b>${(p.pages_read||[]).length} หน้า</div>
    <div style="grid-column:1/-1"><b>หัวข้อที่ตรวจพบ</b>${chips(p.topics)}</div>
    <div style="grid-column:1/-1"><b>คำค้นที่ใช้</b>${chips(p.seed_keywords)}</div>`;
}

async function loadResults() {
  const q = new URLSearchParams({order: $('order').value, limit: 300});
  if ($('tier').value) q.set('min_tier', $('tier').value);
  if ($('minmatch').value) q.set('min_match', $('minmatch').value);
  const d = await api('/api/results?' + q);
  const rows = d.rows || [];
  $('total').textContent = rows.length ? `(${rows.length})` : '';
  $('tb').innerHTML = rows.length ? rows.map(r => {
    const mc = r.match >= 60 ? 'mhi' : (r.match >= 30 ? 'mmd' : 'mlo');
    const u = r.url.replace(/'/g, "\\'");
    return `<tr>
      <td><span class="tier ${r.tier}">${r.tier}</span></td>
      <td class="num">${r.priority}</td><td class="num">${r.quality}</td>
      <td class="num ${mc}">${r.match}</td><td class="num">${r.ease}</td>
      <td class="num">${r.authority ?? ''}</td>
      <td>${esc(r.type)}</td>
      <td><span class="ap ap-${esc(r.approval)}">${esc(r.approval_label)}</span></td>
      <td>${esc(r.link)}</td><td>${esc(r.lang)}</td>
      <td>${esc(r.status)}</td>
      <td><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.domain)}</a></td>
      <td class="acts">
        <button onclick="guide('${u}')">วิธีทำ</button>
        <button class="ghost" onclick="draft('${u}')">ร่าง</button>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="13" class="muted">ยังไม่มีข้อมูล</td></tr>';
}

async function guide(url) {
  const d = await api('/api/guide?' + new URLSearchParams({url}));
  if (d.error) { alert(d.error); return; }
  $('gtitle').textContent = 'วิธีสร้าง Backlink: ' + d.domain;
  $('gmeta').innerHTML =
    `<span class="ap ap-${esc(d.approval)}">${esc(d.approval_label)}</span>`
    + (d.effort ? ` &nbsp;⏱ ${esc(d.effort)}` : '')
    + ` &nbsp;·&nbsp; ${esc(d.type)}`;

  const list = (title, items, tag, cls) => (items && items.length)
    ? `<div class="gsec ${cls||''}"><h4>${title}</h4><${tag}>`
      + items.map(x => `<li>${esc(x)}</li>`).join('') + `</${tag}></div>`
    : '';

  $('gbody').innerHTML =
    (d.summary ? `<div style="font-size:.92rem;margin-bottom:.6rem">${esc(d.summary)}</div>` : '')
    + (d.facts && d.facts.length
        ? `<div class="gfact"><b>สิ่งที่พบในหน้านี้</b><ul style="margin:.3rem 0 0;padding-left:1.1rem">`
          + d.facts.map(f => `<li>${esc(f)}</li>`).join('') + `</ul></div>` : '')
    + list('เตรียมให้พร้อมก่อน', d.prep, 'ul')
    + list('ขั้นตอน', d.steps, 'ol')
    + list('ข้อผิดพลาดที่ทำให้ไม่ผ่าน', d.pitfalls, 'ul', 'gwarn')
    + list('ตรวจว่าสำเร็จแล้วหรือยัง', d.verify, 'ul');

  $('gopen').href = d.url;
  $('gdone').onclick = async () => {
    await api('/api/status-set', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url: d.url, state: 'contacted'})
    });
    $('gdlg').close(); loadResults();
  };
  $('gdlg').showModal();
}

async function draft(url) {
  curUrl = url;
  const q = new URLSearchParams({url, kind: $('dkind').value,
                                link: $('dlink').checked ? '1' : '0'});
  const d = await api('/api/draft?' + q);
  if (d.error) { alert(d.error); return; }
  $('dtitle').textContent = ({comment:'ร่างคอมเมนต์', outreach:'ร่างอีเมล',
                             directory:'ข้อมูลกรอกฟอร์ม'}[d.kind]) || d.kind;
  $('dmeta').textContent = `ภาษา: ${d.language} · สร้างโดย: ${d.generated_by}`
    + (d.subject ? ` · หัวข้อ: ${d.subject}` : '');
  $('dbody').textContent = d.body;
  $('dwarn').innerHTML = (d.warnings||[]).map(w=>`<div class="warn">⚠ ${esc(w)}</div>`).join('');
  $('dcheck').innerHTML = '<div style="margin-top:.5rem"><b>ตรวจก่อนโพสต์:</b></div>'
    + (d.checklist||[]).map(c=>`<div>☐ ${esc(c)}</div>`).join('');
  $('dlg').showModal();
}
$('dkind').onchange = () => curUrl && draft(curUrl);
$('dlink').onchange = () => curUrl && draft(curUrl);
$('dcopy').onclick = () => navigator.clipboard.writeText($('dbody').textContent);

function esc(s) { return String(s ?? '').replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

loadResults();
</script>
</body></html>
"""
