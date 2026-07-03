import { formatGBP } from '../../utils/calculations'

/** GROSS receipt formatting — matches the design prototypes exactly. */

export const gbp = (v: number): string => (Number.isFinite(v) ? formatGBP(v) : '—')

/** A deduction line: always shown with a leading minus. */
export const neg = (v: number): string => '−' + gbp(Math.abs(v))

export const pct = (v: number): string => (v * 100).toFixed(1) + '%'

/** Whole number with thousands separators. */
export const n0 = (v: number): string =>
  Number.isFinite(v) ? Math.round(v).toLocaleString('en-GB') : '—'

/** Ceiling (units/cases you must actually sell), with separators. */
export const ceil0 = (v: number): string =>
  Number.isFinite(v) ? Math.ceil(v).toLocaleString('en-GB') : '—'

/** GROSS colour constants for value-driven styling (traffic lights, negatives). */
export const INK = '#0A0A0A'
export const BILE = '#C6F215'
export const REDUCED = '#FFD400'
export const REDPEN = '#E4002B'

/** Health-chip labels — edit here, applies everywhere (copy deck refs G24–G27). */
export const HEALTH = {
  healthy: "HEALTHY - WHO'S A GOOD BOY/GIRL/DOG",
  tight: 'TIGHT - YOU BETTER BE SURE OF YOUR ROS',
  thin: 'THIN - NO BONUS HERE',
  underwater: "UNDERWATER - DON'T YOU DARE",
}
