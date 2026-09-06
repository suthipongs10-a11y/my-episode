/**
 * Seller-side signals from a page. Every detector returns evidence, and the
 * negative cases matter as much as the positive ones: a share button is not a
 * Facebook page, an analytics tag is not ad spend, a blog post that says
 * "coming soon" is not a parked domain.
 */
import { describe, expect, it } from "vitest";
import {
  adsVerdict, detectAdTags, detectCopyrightYear, detectSocialLinks, looksParked,
} from "./signals.ts";

describe("detectAdTags", () => {
  it("finds a Meta Pixel by the vendor snippet, not by the word facebook", () => {
    const html = `<script>!function(f,b,e,v,n,t,s){...}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','123');</script>`;
    const tags = detectAdTags(html);
    expect(tags.map((t) => t.platform)).toEqual(["meta"]);
    expect(tags[0]!.evidence).toBeTruthy();
  });

  it("finds a Google Ads conversion tag", () => {
    expect(detectAdTags(`gtag('config', 'AW-1234567890');`).map((t) => t.platform))
      .toContain("google_ads");
  });

  it("finds TikTok and LINE tags", () => {
    const html = `<script src="https://analytics.tiktok.com/i18n/pixel/events.js"></script>
      <script src="https://tag.line.me/tag.js"></script>`;
    expect(detectAdTags(html).map((t) => t.platform).sort()).toEqual(["line", "tiktok"]);
  });

  it("reports each platform once even when the snippet appears twice", () => {
    const html = `fbq('init','1'); fbq('init','2'); connect.facebook.net/x/fbevents.js`;
    expect(detectAdTags(html)).toHaveLength(1);
  });

  it("does not fire on a plain link to facebook.com", () => {
    expect(detectAdTags(`<a href="https://facebook.com/shop">FB</a>`)).toEqual([]);
  });
});

describe("adsVerdict", () => {
  it("is yes for a paid platform, maybe for GTM alone, no for nothing", () => {
    expect(adsVerdict([{ platform: "meta", evidence: "x" }])).toBe("yes");
    expect(adsVerdict([{ platform: "gtm", evidence: "x" }])).toBe("maybe");
    expect(adsVerdict([{ platform: "ga4", evidence: "x" }])).toBe("no");
    expect(adsVerdict([])).toBe("no");
  });
});

describe("detectSocialLinks", () => {
  it("keeps a profile and drops the share/plugin URLs every site carries", () => {
    const out = detectSocialLinks([
      "https://www.facebook.com/sharer/sharer.php?u=x",
      "https://www.facebook.com/plugins/like.php",
      "https://www.facebook.com/phuketmaid",
      "https://www.instagram.com/p/abc/",
      "https://www.instagram.com/phuketmaid/",
      "https://lin.ee/abc123",
      "https://www.youtube.com/embed/xyz",
    ]);
    expect(out.facebook).toBe("https://www.facebook.com/phuketmaid");
    expect(out.instagram).toBe("https://www.instagram.com/phuketmaid/");
    expect(out.line).toBe("https://lin.ee/abc123");
    expect(out.youtube).toBeUndefined();
  });

  it("ignores the platform homepage — that is not a profile", () => {
    expect(detectSocialLinks(["https://facebook.com/", "https://tiktok.com"])).toEqual({});
  });

  it("survives garbage", () => {
    expect(detectSocialLinks(["not a url", "", "javascript:void(0)"])).toEqual({});
  });
});

describe("looksParked", () => {
  it("catches a domain-for-sale page and a hosting default", () => {
    expect(looksParked("Domain for sale", "This domain may be for sale", 8)).toBe(true);
    expect(looksParked("Welcome to nginx!", "If you see this page…", 20)).toBe(true);
  });

  it("catches a Thai placeholder", () => {
    expect(looksParked(null, "เว็บไซต์อยู่ระหว่างการปรับปรุง", 5)).toBe(true);
  });

  it("does not flag a real site that mentions construction in a post", () => {
    expect(looksParked("บล็อก", "บทความยาว under construction " + "x ".repeat(300), 300)).toBe(false);
  });
});

describe("detectCopyrightYear", () => {
  const now = new Date("2026-08-04");
  it("reads a Gregorian year and a range", () => {
    expect(detectCopyrightYear("© 2019 Phuket Maid", now)).toBe(2019);
    expect(detectCopyrightYear("Copyright 2015–2024 ACME", now)).toBe(2024);
  });
  it("converts a Buddhist-era year", () => {
    expect(detectCopyrightYear("สงวนลิขสิทธิ์ 2567 บริษัท", now)).toBe(2024);
  });
  it("ignores numbers that are not years", () => {
    expect(detectCopyrightYear("© ACME 0812345678", now)).toBeNull();
    expect(detectCopyrightYear("no footer here", now)).toBeNull();
  });
  it("does not accept a year from the future", () => {
    expect(detectCopyrightYear("© 2099", now)).toBeNull();
  });
});
