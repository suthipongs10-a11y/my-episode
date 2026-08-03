/**
 * Rule metadata: how bad, how much work, how much it helps.
 *
 * Separate from the rule logic so severity and effort can be retuned from
 * selling experience without touching the code that detects anything — and so
 * the report's ordering has one place to argue about.
 *
 * `impact` is 1-10 and drives the "5 things to do first" page. It answers
 * "how much closer does fixing this get the owner to a phone call", not "how
 * much does an SEO tool score go up".
 */
import type { Category, Severity } from "../types/index.ts";
import { th, type FindingCode } from "../i18n/th.ts";

export interface RuleMeta {
  code: FindingCode;
  category: Category;
  severity: Severity;
  /** Rough hours for a competent web person. */
  effortHours: number;
  /** 1-10, business impact. */
  impact: number;
}

export const CATALOG: Record<FindingCode, RuleMeta> = {
  // -- On-page --------------------------------------------------------------
  "ONP-001": { code: "ONP-001", category: "onpage", severity: "high",   effortHours: 2, impact: 5 },
  "ONP-002": { code: "ONP-002", category: "onpage", severity: "high",   effortHours: 2, impact: 6 },
  "ONP-003": { code: "ONP-003", category: "onpage", severity: "medium", effortHours: 2, impact: 4 },
  "ONP-004": { code: "ONP-004", category: "onpage", severity: "medium", effortHours: 2, impact: 4 },
  "ONP-005": { code: "ONP-005", category: "onpage", severity: "high",   effortHours: 8, impact: 7 },
  "ONP-006": { code: "ONP-006", category: "onpage", severity: "low",    effortHours: 2, impact: 2 },
  "ONP-007": { code: "ONP-007", category: "onpage", severity: "medium", effortHours: 2, impact: 4 },
  "ONP-008": { code: "ONP-008", category: "onpage", severity: "high",   effortHours: 2, impact: 7 },
  "ONP-009": { code: "ONP-009", category: "onpage", severity: "medium", effortHours: 3, impact: 4 },

  // -- Technical ------------------------------------------------------------
  "TEC-001": { code: "TEC-001", category: "technical", severity: "critical", effortHours: 2, impact: 8 },
  "TEC-002": { code: "TEC-002", category: "technical", severity: "high",     effortHours: 6, impact: 6 },
  "TEC-003": { code: "TEC-003", category: "technical", severity: "high",     effortHours: 4, impact: 6 },
  "TEC-004": { code: "TEC-004", category: "technical", severity: "medium",   effortHours: 1, impact: 4 },
  "TEC-005": { code: "TEC-005", category: "technical", severity: "critical", effortHours: 1, impact: 9 },
  "TEC-006": { code: "TEC-006", category: "technical", severity: "high",     effortHours: 3, impact: 7 },
  "TEC-007": { code: "TEC-007", category: "technical", severity: "critical", effortHours: 12, impact: 9 },
  "TEC-008": { code: "TEC-008", category: "technical", severity: "medium",   effortHours: 2, impact: 3 },

  // -- Conversion — the category that differentiates this product -----------
  "CVR-001": { code: "CVR-001", category: "conversion", severity: "critical", effortHours: 1, impact: 10 },
  "CVR-002": { code: "CVR-002", category: "conversion", severity: "high",     effortHours: 2, impact: 8 },
  "CVR-003": { code: "CVR-003", category: "conversion", severity: "high",     effortHours: 3, impact: 8 },
  "CVR-004": { code: "CVR-004", category: "conversion", severity: "high",     effortHours: 1, impact: 6 },
  "CVR-005": { code: "CVR-005", category: "conversion", severity: "critical", effortHours: 3, impact: 9 },
  "CVR-006": { code: "CVR-006", category: "conversion", severity: "medium",   effortHours: 3, impact: 5 },
  "CVR-007": { code: "CVR-007", category: "conversion", severity: "high",     effortHours: 4, impact: 7 },
  "CVR-008": { code: "CVR-008", category: "conversion", severity: "medium",   effortHours: 6, impact: 5 },
  "CVR-009": { code: "CVR-009", category: "conversion", severity: "medium",   effortHours: 2, impact: 4 },
  "CVR-010": { code: "CVR-010", category: "conversion", severity: "high",     effortHours: 1, impact: 7 },
};

/** Severity order for sorting; higher is worse. */
export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
};

export function meta(code: FindingCode): RuleMeta {
  const m = CATALOG[code];
  if (!m) throw new Error(`rule not in catalog: ${code}`);
  return m;
}

/** The owner-facing text for a code. */
export function describe(code: FindingCode): { title: string; fix: string } {
  return th.findings[code];
}
