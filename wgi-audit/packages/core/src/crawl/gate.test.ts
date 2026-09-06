/**
 * The gate exists to stop one specific lie: a report about a page nobody saw.
 * Each case here is a real shape of HTML the crawler has met or will meet.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { detectChallenge, looksUnrendered } from "./gate.ts";
import { extractPage } from "./extract.ts";

const fixture = (p: string) =>
  readFileSync(fileURLToPath(new URL(`../../../../fixtures/${p}`, import.meta.url)), "utf8");

const CF_CHALLENGE = `<!DOCTYPE html><html><head><title>Just a moment...</title></head>
<body><div id="cf-chl-widget"></div><noscript>Enable JavaScript and cookies to continue</noscript>
<script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1?ray=8a1"></script></body></html>`;

describe("detectChallenge", () => {
  it("recognises a Cloudflare JavaScript challenge by its own markers", () => {
    const w = detectChallenge(CF_CHALLENGE, {}, 503);
    expect(w?.vendor).toBe("Cloudflare");
  });

  it("trusts the cf-mitigated header on its own, whatever the body says", () => {
    expect(detectChallenge("", { "CF-Mitigated": "challenge" }, 200)?.vendor).toBe("Cloudflare");
  });

  it("recognises a Cloudflare block page", () => {
    const html = `<html><head><title>Attention Required! | Cloudflare</title></head><body>
      <h1>Sorry, you have been blocked</h1><div class="cf-error-details">You are unable to access example.com</div></body></html>`;
    expect(detectChallenge(html, {}, 403)?.vendor).toBe("Cloudflare");
  });

  it("recognises Imperva even on a 200", () => {
    const html = `<html><head><script src="/_Incapsula_Resource?SWJIYLWA=719d34d31c8e3a6e6fffd425f7e032f3"></script></head><body></body></html>`;
    expect(detectChallenge(html, {}, 200)?.vendor).toBe("Imperva");
  });

  it("recognises Akamai's access-denied page", () => {
    const html = `<html><head><title>Access Denied</title></head><body><h1>Access Denied</h1>
      <p>You don't have permission to access "http://example.com/" on this server.</p><p>Reference #18.4f1c1002.1700000000.1a2b3c</p></body></html>`;
    expect(detectChallenge(html, {}, 403)?.vendor).toBe("Akamai");
  });

  it("does not mistake a real page that mentions its firewall for the wall", () => {
    const body = "<p>" + "บริการทำความสะอาดบ้านและคอนโดในภูเก็ต ทีมงานมืออาชีพ ".repeat(30) + "</p>";
    const html = `<html><head><title>ร้านของเรา</title></head><body>${body}
      <footer>Protected by Cloudflare · <a href="/contact">ติดต่อ</a></footer>
      <form><div class="g-recaptcha" data-sitekey="x"></div></form></body></html>`;
    expect(detectChallenge(html, { server: "cloudflare" }, 200)).toBeNull();
  });

  it("does not fire on a plain 404 or a plain 500", () => {
    expect(detectChallenge("<html><body>Not found</body></html>", {}, 404)).toBeNull();
    expect(detectChallenge("<html><body>Internal Server Error</body></html>", {}, 500)).toBeNull();
  });

  it("passes the fixture homepage", () => {
    expect(detectChallenge(fixture("phuketmaid/index.html"), {}, 200)).toBeNull();
  });
});

describe("looksUnrendered", () => {
  const page = (html: string) => extractPage("https://shop.example/", html, { domain: "shop.example" });

  it("stops a React app shell", () => {
    const html = `<!doctype html><html><head><title>Shop</title></head><body>
      <noscript>You need to enable JavaScript to run this app.</noscript>
      <div id="root"></div><script src="/static/js/main.3f2a.js"></script></body></html>`;
    const s = looksUnrendered(html, page(html));
    expect(s?.kind).toBe("shell");
  });

  it("stops a Next.js shell that carries data but no text", () => {
    const html = `<html><body><div id="__next"></div>
      <script id="__NEXT_DATA__" type="application/json">{"props":{}}</script></body></html>`;
    expect(looksUnrendered(html, page(html))?.kind).toBe("shell");
  });

  it("calls a page with no scripts and no words empty, not a shell", () => {
    const html = `<html><body></body></html>`;
    expect(looksUnrendered(html, page(html))?.kind).toBe("empty");
  });

  it("lets a thin landing page with a menu through — there is something to audit", () => {
    const html = `<html><body><nav><a href="/services">บริการ</a><a href="/about">เกี่ยวกับเรา</a>
      <a href="/contact">ติดต่อ</a></nav><h1>ล้างแอร์ภูเก็ต</h1><div id="root"></div></body></html>`;
    expect(looksUnrendered(html, page(html))).toBeNull();
  });

  it("passes the fixture homepage", () => {
    const html = fixture("phuketmaid/index.html");
    expect(looksUnrendered(html, page(html))).toBeNull();
  });
});
