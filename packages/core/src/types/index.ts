/** Shared vocabulary. These names appear in the DB, so they are enums, not strings. */
import { z } from "zod";

export const AreaScope = z.enum(["nationwide", "province", "district"]);
export type AreaScope = z.infer<typeof AreaScope>;

export const RunStatus = z.enum(["queued", "running", "done", "failed"]);
export type RunStatus = z.infer<typeof RunStatus>;

export const JobStatus = z.enum(["pending", "running", "done", "failed"]);
export type JobStatus = z.infer<typeof JobStatus>;

export const PageType = z.enum([
  "home", "service", "location", "article", "faq", "contact", "about", "other",
]);
export type PageType = z.infer<typeof PageType>;

export const Severity = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof Severity>;

export const Category = z.enum([
  "onpage", "technical", "conversion", "local", "content", "competitor",
]);
export type Category = z.infer<typeof Category>;

export const SnapshotKind = z.enum([
  "site", "page", "psi", "serp", "gbp", "grid", "presence", "competitor",
]);
export type SnapshotKind = z.infer<typeof SnapshotKind>;

/** The 14 pipeline stages, in order. `audit_runs.stage` holds one of these. */
export const STAGES = [
  "01-intake", "02-discover", "03-crawl", "04-classify", "05-psi",
  "06-keywords", "07-serp", "08-gbp", "09-presence", "10-competitors",
  "11-rules", "12-scoring", "13-narrative", "14-report",
] as const;
export type Stage = (typeof STAGES)[number];

export interface Client {
  id: string;
  name: string | null;
  domain: string;
  business_type: string | null;
  business_type_confirmed: boolean;
  area_scope: AreaScope;
  areas: string[];
  contact_phone: string | null;
  contact_line: string | null;
  contact_email: string | null;
  lead_source: string | null;
}

export interface AuditRun {
  id: string;
  client_id: string;
  status: RunStatus;
  stage: Stage | null;
  scoring_version: number;
  cost_thb: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
}

/** A rule's output. Every finding must carry the evidence that produced it. */
export interface Finding {
  code: string;
  category: Category;
  severity: Severity;
  evidence: Record<string, unknown>;
  affectedUrls?: string[];
  effortHours?: number;
  impactScore?: number;
}

/** One crawled page, as the rules see it. Mirrors the `pages` table. */
export interface PageRecord {
  url: string;
  domain: string;
  isCompetitor: boolean;
  statusCode: number | null;
  pageType: PageType;
  title: string | null;
  titleLen: number;
  metaDesc: string | null;
  metaDescLen: number;
  h1: string[];
  h1Count: number;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  imagesTotal: number;
  imagesNoAlt: number;
  schemaTypes: string[];
  hasTelLink: boolean;
  hasLineLink: boolean;
  hasForm: boolean;
  formFieldCount: number;
  hasPrice: boolean;
  hasReview: boolean;
  lang: string | null;
  /** Set when the page could not be fetched; rules skip these. */
  fetchError?: string;
}
