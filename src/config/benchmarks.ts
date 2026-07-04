/**
 * CATEGORY BENCHMARKS — indicative brand gross-margin ranges by UK FMCG
 * category, as a share of net revenue (the same basis as The P&L's margin %).
 *
 * The maths is sacred; these are NOT. They are broad, indicative bands drawn
 * from category-typical commentary — a sense-check, never a target, and never
 * a precise figure. Shown as ranges, dated, and attributed on The Rate Card.
 * Edit freely; if you can't stand behind a number, widen the band or remove it.
 */

export interface Benchmark {
  category: string
  /** Brand gross margin as a share of net revenue — indicative low/high */
  low: number
  high: number
}

export const BENCHMARK_CHECKED = '03 JUL 2026'
export const BENCHMARK_SOURCE =
  'Indicative UK FMCG brand gross-margin ranges from category-typical commercial commentary. Broad bands, not targets.'

export const BENCHMARKS: Benchmark[] = [
  { category: 'General FMCG', low: 0.25, high: 0.45 },
  { category: 'Confectionery', low: 0.30, high: 0.50 },
  { category: 'Soft drinks', low: 0.25, high: 0.45 },
  { category: 'Snacks', low: 0.30, high: 0.48 },
  { category: 'Ambient grocery', low: 0.20, high: 0.40 },
  { category: 'Chilled & fresh', low: 0.18, high: 0.35 },
  { category: 'Health & wellness', low: 0.35, high: 0.55 },
  { category: 'Beauty & personal care', low: 0.45, high: 0.65 },
]

export const BENCHMARK_CATEGORIES = BENCHMARKS.map((b) => b.category)

export function benchmarkFor(category: string | undefined): Benchmark {
  return BENCHMARKS.find((b) => b.category === category) ?? BENCHMARKS[0]
}
