import { test, expect, type Page } from '@playwright/test'

/**
 * Visual regression of every calculator receipt — the `.print-block` rendered
 * by src/components/gross/Receipt.tsx. The receipt is the brand's load-bearing
 * surface (dashed tear-lines, Space Mono numerals, the inverted Ink answer
 * block, the deadpan verdict), so it is what must never silently drift.
 *
 * The store seeds a demo product ('VOLT 250ml') on boot and getActiveProduct()
 * falls back to the first product, so a deep-linked calculator renders a fully
 * populated receipt without any interaction. If that ever regresses to an
 * empty state, the guard below fails loudly rather than snapshotting the rat.
 *
 * `vite preview` only resolves prerendered routes with a trailing slash
 * (/the-pnl 404s under preview; /the-pnl/ serves dist/the-pnl/index.html —
 * Vercel's cleanUrls handles both in production), so every path carries one.
 */

// slug (with trailing slash) ↔ the H1 that proves the tool actually mounted.
// Every route here renders exactly one `.print-block` (the ChannelPlan on the
// Amazon/TikTok pages and the ComparePanel are NOT print-blocks).
const RECEIPTS: { slug: string; h1: string }[] = [
  { slug: 'the-pnl', h1: 'The P&L' },
  { slug: 'the-waterfall', h1: 'The Waterfall' },
  { slug: 'the-floor', h1: 'The Floor' },
  { slug: 'the-listing', h1: 'The Listing' },
  { slug: 'the-payback', h1: 'The Payback' },
  { slug: 'the-stock-answer', h1: 'The Stock Answer' },
  { slug: 'the-amazon-cut', h1: 'The Amazon Cut' },
  { slug: 'the-tiktok-cut', h1: 'The TikTok Cut' },
  { slug: 'the-line-up', h1: 'The Line-Up' },
  { slug: 'the-range', h1: 'The Range' },
  { slug: 'the-wait', h1: 'The Wait' },
]

/** Navigate to a tool, prove it mounted, and hand back its receipt locator. */
async function openReceipt(page: Page, slug: string, h1: string) {
  await page.goto(`/${slug}/`)
  await expect(page.locator('h1')).toHaveText(h1)

  const receipt = page.locator('.print-block').first()
  await expect(receipt).toBeVisible()

  // Fonts must be in before the snapshot — Space Mono/Anton/Inter are
  // self-hosted, and a FOUT would poison the pixels.
  await page.evaluate(() => document.fonts.ready)
  // The reveal animation is frozen by animations:'disabled', but wait for the
  // element box to settle so we never catch a mid-layout frame.
  await expect(receipt).toBeVisible()
  await page.waitForLoadState('networkidle')

  return receipt
}

for (const { slug, h1 } of RECEIPTS) {
  test(`receipt does not drift — ${slug}`, async ({ page }) => {
    const receipt = await openReceipt(page, slug, h1)

    // Mask the best-before-style date stamp (receiptStamp() → e.g. "10 JUL
    // 2026"): it renders in the receipt header and would change every day,
    // making the snapshot non-deterministic. Everything else is pinned by the
    // seeded VOLT product + default scenario.
    const dateStamp = receipt.getByText(/^\d{2} [A-Z]{3} \d{4}$/)

    await expect(receipt).toHaveScreenshot(`receipt-${slug}.png`, {
      mask: [dateStamp],
    })
  })
}
