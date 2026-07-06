/**
 * THE LEDGER — the monthly letter's on-site archive.
 *
 * Add an issue here when it goes out and the page updates. Body paragraphs
 * are plain strings; keep the voice: deadpan, dry, blunt, British.
 */
export interface LedgerIssue {
  /** e.g. 'no-001' — becomes the anchor */
  id: string
  number: number
  title: string
  /** e.g. 'July 2026' */
  date: string
  /** One-line standfirst shown in the list */
  standfirst: string
  /** Body paragraphs */
  body: string[]
}

export const LEDGER_ISSUES: LedgerIssue[] = []
