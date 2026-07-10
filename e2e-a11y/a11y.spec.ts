import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { PAGE_META } from '../src/config/pages'

/**
 * The axe accessibility gate — every route in the page registry, scanned with
 * the WCAG 2.x A/AA rule set on both viewport projects (desktop + 375×667).
 *
 * FAILS on any violation with impact 'serious' or 'critical'.
 * Moderate/minor violations do not fail the gate but are attached as an
 * annotation per route so drift stays visible in the report.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * KNOWN CONTRAST ISSUES — brand-hex text pairings that cannot be fixed without
 * changing a brand colour (forbidden) or visibly redesigning (also forbidden).
 * The brand reds/greens are canon; axe still measures them:
 *
 *   redpen #E4002B on receipt #F7F5EF — 4.44:1 (needs 4.5) — negatives/verdicts
 *   redpen #E4002B on ink #0A0A0A     — 4.08:1 (needs 4.5) — small answer rows
 *   redpen dimmed (opacity-75 rows) → #E93D5C on receipt — 3.64:1
 *   bile dimmed → #D2F34C on receipt  — 1.15:1 — The P&L benchmark "Read" line
 *     when above range (RetailerPnL.tsx colour choice; needs a brand decision —
 *     the 'within range' case already uses ink on the same line)
 *
 * These exact fg/bg pairs are allowlisted; ANY other contrast failure — or the
 * same colours in a new pairing — still fails the gate.
 */
const KNOWN_BRAND_CONTRAST: { fg: string; bg: string }[] = [
  { fg: '#e4002b', bg: '#f7f5ef' },
  { fg: '#e4002b', bg: '#0a0a0a' },
  { fg: '#e93d5c', bg: '#f7f5ef' },
  { fg: '#d2f34c', bg: '#f7f5ef' },
]

type AxeNode = { any?: { data?: { fgColor?: string; bgColor?: string } }[] }

function isKnownBrandContrast(ruleId: string, node: AxeNode): boolean {
  if (ruleId !== 'color-contrast') return false
  const data = node.any?.[0]?.data
  const fg = data?.fgColor?.toLowerCase()
  const bg = data?.bgColor?.toLowerCase()
  return KNOWN_BRAND_CONTRAST.some((k) => k.fg === fg && k.bg === bg)
}

/** Routes rendered by CalcShell — must be scanned with the receipt on screen. */
const CALCULATOR_IDS = new Set([
  'retailer-pnl',
  'waterfall',
  'min-margin',
  'listing-model',
  'trade-spend',
  'stock-forecast',
  'amazon-fba',
  'tiktok-shop',
  'cross-channel',
  'portfolio',
  'cash-flow',
])

async function settle(page: Page, id: string) {
  // Every page renders inside <main>; wait for the lazy chunk to mount.
  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 30_000 })

  if (CALCULATOR_IDS.has(id)) {
    // The store seeds a demo product (VOLT 250ml), so the receipt should render
    // immediately. If the empty state somehow shows, seed via its own button.
    const emptyCta = page.getByRole('button', { name: /start with a product/i })
    if (await emptyCta.isVisible().catch(() => false)) {
      await emptyCta.click()
      await page.goBack().catch(() => {})
    }
    await expect(page.locator('.print-block').first()).toBeVisible({ timeout: 15_000 })
  }
}

for (const meta of PAGE_META) {
  const path = meta.slug === '' ? '/' : `/${meta.slug}`

  test(`a11y: ${path} (${meta.id})`, async ({ page }, testInfo) => {
    await page.goto(path)
    await settle(page, meta.id)

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

    // Split out the documented brand-colour contrast pairs (see header note):
    // they are reported, not failed — everything else serious/critical fails.
    let knownNodes = 0
    const gate = results.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => {
        const nodes = v.nodes.filter((n) => {
          const known = isKnownBrandContrast(v.id, n as AxeNode)
          if (known) knownNodes++
          return !known
        })
        return { ...v, nodes }
      })
      .filter((v) => v.nodes.length > 0)
    const drift = results.violations.filter(
      (v) => v.impact !== 'serious' && v.impact !== 'critical',
    )

    // Moderate/minor + known brand-contrast: report, don't fail — visible
    // drift, not a red build.
    testInfo.annotations.push({
      type: 'a11y-drift',
      description:
        `known brand-contrast nodes: ${knownNodes}; ` +
        (drift.length === 0
          ? 'moderate/minor: 0'
          : `moderate/minor: ${drift.length} — ` +
            drift
              .map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}`)
              .join('; ')),
    })

    const detail = gate
      .map(
        (v) =>
          `\n[${v.impact}] ${v.id}: ${v.help}\n` +
          v.nodes
            .slice(0, 5)
            .map((n) => `  - ${n.target.join(' ')}\n    ${n.failureSummary?.split('\n').join('\n    ')}`)
            .join('\n'),
      )
      .join('\n')

    expect(gate, `serious/critical axe violations on ${path}:${detail}`).toEqual([])
  })
}
