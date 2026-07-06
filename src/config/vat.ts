/**
 * UK VAT expectations by category — a sense-check, not tax advice.
 *
 * Most food and drink for home consumption is zero-rated; the exceptions the
 * trade forgets are the standard-rated ones: confectionery, crisps and savoury
 * snacks, soft drinks and bottled water, alcohol, ice cream. Checked Jul 2026
 * against HMRC VAT Notice 701/14 (food) — see The Rate Card.
 */
export interface VatExpectation {
  /** The rate most products in this category carry */
  expected: number
  /** Shown when the product's VAT disagrees */
  note: string
}

const STANDARD = 0.2

export const VAT_BY_CATEGORY: Record<string, VatExpectation> = {
  'Confectionery': { expected: STANDARD, note: 'Confectionery is standard-rated (20%) — the zero rate for food does not apply.' },
  'Soft drinks': { expected: STANDARD, note: 'Soft drinks and bottled water are standard-rated (20%), unlike most food.' },
  'Snacks': { expected: STANDARD, note: 'Crisps and most savoury snacks are standard-rated (20%).' },
  'Ambient grocery': { expected: 0, note: 'Most ambient food is zero-rated. If yours is 20%, make sure it should be.' },
  'Chilled & fresh': { expected: 0, note: 'Most chilled and fresh food is zero-rated. If yours is 20%, make sure it should be.' },
  'Beauty & personal care': { expected: STANDARD, note: 'Beauty and personal care is standard-rated (20%).' },
}

/** The note to show when the product's VAT disagrees with the category norm; null when it agrees (or we have no opinion). */
export function vatMismatch(category: string | undefined, vatRate: number): string | null {
  if (!category) return null
  const exp = VAT_BY_CATEGORY[category]
  if (!exp) return null
  return Math.abs(vatRate - exp.expected) > 0.001 ? exp.note : null
}
