/**
 * Domain normalisation.
 *
 * In core rather than in an app because two entry points now take a domain
 * from a human — the CLI and the dashboard form — and they must agree. A
 * client who types `https://Example.com/pricing` in one and `example.com` in
 * the other has to land on the same `clients` row, or the audit history splits
 * in two without anybody noticing.
 */

/** Strip scheme, www and any path — the DB stores a bare registrable host. */
export function normaliseDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]!
    .split("?")[0]!
    .toLowerCase();
}
