/**
 * The two documents, rendered from one synthetic run. The server tests cover
 * routing and the stored fixture; this covers what the templates promise on
 * their own — in particular what the client's report must and must not say.
 */
import { describe, expect, it } from "vitest";
import type { AuditDetail } from "../queries.ts";
import { reportPage, runPage } from "./pages.ts";

const detail = (over: Partial<AuditDetail> = {}): AuditDetail => ({
  id: "11111111-1111-1111-1111-111111111111",
  domain: "shop.example",
  areas: ["ภูเก็ต"],
  areaScope: "province",
  status: "done",
  stage: "12-scoring",
  error: null,
  createdAt: "2026-09-06T01:00:00Z",
  startedAt: "2026-09-06T01:00:00Z",
  finishedAt: "2026-09-06T01:02:00Z",
  costThb: 0,
  scoringVersion: 3,
  overall: 40,
  opportunity: 71,
  pitch: "ads_leak",
  findingsTotal: 2,
  criticalTotal: 1,
  snapshot: {
    scoring_version: 3,
    scores: { overall: 40, conversion: 30, onpage: 60, technical: 50, local: 50, content: 50, visibility: 50 },
    inputs: { coverage: 0.4 },
  },
  opportunityDetail: null,
  presence: null,
  findings: [
    { code: "CVR-005", category: "conversion", severity: "critical", evidence: { pages_without_cta_above_fold: 2 }, effortHours: 3, impactScore: 9 },
    { code: "CVR-003", category: "conversion", severity: "high", evidence: { pages_without_sticky_cta: 2 }, effortHours: 2, impactScore: 7 },
  ],
  pages: [{ pageType: "home", count: 1 }],
  keywords: [],
  competitors: [],
  spend: [],
  ...over,
});

describe("findings that were read from code, not from a screen", () => {
  it("tell the owner how to confirm them by eye, on both pages", () => {
    for (const html of [runPage(detail()), reportPage(detail())]) {
      expect(html).toContain("ตรวจซ้ำเองได้โดย");
      expect(html).toContain("เปิดเว็บบนมือถือแล้วเลื่อนลง");
      expect(html).toContain("ไม่พบปุ่มติดต่อในส่วนบนของหน้า");
    }
  });

  it("never claim what was not measured", () => {
    const html = reportPage(detail());
    expect(html).not.toContain("Google ยังไม่รู้ว่าธุรกิจ");
    expect(html).not.toContain("ยังไม่ถูก Google เก็บเข้าระบบ");
  });
});

describe("the client report", () => {
  it("carries none of the seller's numbers", () => {
    const html = reportPage(detail());
    expect(html).not.toContain("โอกาสในการขาย");
    expect(html).not.toContain("สรุปสำหรับส่งต่อ");
    expect(html).not.toContain("71");
  });
});

describe("a run that never got past the readability gate", () => {
  const failed = detail({
    status: "failed",
    error: "หน้าแรกไม่มีเนื้อหาให้อ่าน เพราะเว็บประกอบหน้าด้วย JavaScript ในเบราว์เซอร์",
    snapshot: null, findings: [], findingsTotal: 0, criticalTotal: 0,
    pages: [], overall: null, opportunity: null, pitch: null,
  });

  it("says why, and what to do about it", () => {
    const html = runPage(failed);
    expect(html).toContain("การตรวจไม่สำเร็จ");
    expect(html).toContain("JavaScript");
    expect(html).toContain("ทำอย่างไรต่อ");
  });

  /**
   * The whole point of the gate: "we could not read this" must never be
   * rendered in the same words as "we read it and it was fine".
   */
  it("never says no problems were found", () => {
    const html = runPage(failed);
    expect(html).not.toContain("ไม่พบปัญหา");
    expect(html).not.toContain("คะแนนเว็บ");
    expect(html).not.toContain("โอกาสในการขาย");
  });
});
