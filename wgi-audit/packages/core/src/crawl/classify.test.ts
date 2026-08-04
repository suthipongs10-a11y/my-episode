import { describe, expect, it } from "vitest";
import { classifyPage } from "./classify.ts";

const base = {
  title: null as string | null,
  h1: [] as string[],
  schemaTypes: [] as string[],
  wordCount: 500,
  areas: ["ภูเก็ต", "ป่าตอง"],
};

const type = (over: Partial<typeof base> & { url: string; isHomepage?: boolean }) =>
  classifyPage({ ...base, ...over }).type;

describe("classifyPage", () => {
  it("recognises the homepage", () => {
    expect(type({ url: "https://x.com/" })).toBe("home");
    expect(type({ url: "https://x.com/th/", isHomepage: true })).toBe("home");
  });

  it("recognises pages by their URL", () => {
    expect(type({ url: "https://x.com/contact/" })).toBe("contact");
    expect(type({ url: "https://x.com/about-us/" })).toBe("about");
    expect(type({ url: "https://x.com/faq/" })).toBe("faq");
    expect(type({ url: "https://x.com/blog/how-to/" })).toBe("article");
    expect(type({ url: "https://x.com/services/deep-cleaning/" })).toBe("service");
  });

  it("recognises Thai URLs", () => {
    expect(type({ url: "https://x.com/ติดต่อเรา/" })).toBe("contact");
    expect(type({ url: "https://x.com/บริการ/" })).toBe("service");
  });

  it("trusts structured data over the URL", () => {
    expect(type({ url: "https://x.com/services/x/", schemaTypes: ["BlogPosting"] })).toBe("article");
    expect(type({ url: "https://x.com/anything/", schemaTypes: ["FAQPage"] })).toBe("faq");
  });

  it("calls a page naming a service and an area a location page", () => {
    // These are what rank for "service + district", and counting them as
    // ordinary service pages would hide the gap the report is meant to show.
    expect(type({
      url: "https://x.com/cleaning-patong/",
      title: "บริการทำความสะอาด ป่าตอง",
    })).toBe("location");
  });

  it("finds the area in a percent-encoded Thai URL", () => {
    expect(type({ url: `https://x.com/${encodeURIComponent("ภูเก็ต")}/` })).toBe("location");
  });

  it("prefers location over service when both fit", () => {
    expect(type({
      url: "https://x.com/services/cleaning/",
      h1: ["ทำความสะอาดบ้าน ป่าตอง"],
    })).toBe("location");
  });

  it("does not count a thin services index as a service page", () => {
    // An index that lists names without detail converts nobody, and counting
    // it would inflate the page count the competitor comparison rests on.
    expect(type({ url: "https://x.com/services/", wordCount: 40 })).toBe("other");
    expect(type({ url: "https://x.com/services/", wordCount: 800 })).toBe("service");
  });

  it("treats policy and cart pages as other", () => {
    expect(type({ url: "https://x.com/privacy-policy/" })).toBe("other");
    expect(type({ url: "https://x.com/checkout/" })).toBe("other");
  });

  it("admits when it cannot tell", () => {
    const r = classifyPage({ ...base, url: "https://x.com/xyz123/" });
    expect(r.type).toBe("other");
    expect(r.confidence).toBeLessThan(0.6); // routed to the LLM at M3
  });

  it("explains which signal decided, for the human reviewing it", () => {
    expect(classifyPage({ ...base, url: "https://x.com/contact/" }).reason).toBe("url:contact");
    expect(classifyPage({
      ...base, url: "https://x.com/a/", title: "ทำความสะอาด ภูเก็ต",
    }).reason).toBe("area:ภูเก็ต");
  });

  it("ignores an area list that is empty", () => {
    expect(classifyPage({ ...base, url: "https://x.com/services/x/", areas: [] }).type)
      .toBe("service");
  });
});
