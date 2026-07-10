import type { BrowserContext, Download, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Shared plumbing for the GROSS. e2e suite. No test ids exist in the app (by
 * design), so everything here leans on visible text, aria-labels (Field sets
 * aria-label = its visible label) and the one structural hook we get for free:
 * the receipt is the only `.print-block` on a page.
 */

/** Supabase is blocked in this sandbox anyway; aborting the route makes the
 * fail-soft path deterministic instead of waiting out an 8s timeout. */
export async function blockCloud(context: BrowserContext): Promise<void> {
  await context.route('https://*.supabase.co/**', (r) => r.abort())
}

/**
 * `vite preview` only resolves prerendered routes with a trailing slash
 * (/the-pnl 404s, /the-pnl/ serves dist/the-pnl/index.html). Vercel's
 * cleanUrls handles both in production; the tests add the slash themselves.
 */
export function previewUrl(url: string): string {
  const u = new URL(url)
  if (!u.pathname.endsWith('/')) u.pathname += '/'
  return u.toString()
}

/**
 * Seed the store the way a human does: the homepage hero's worked-example
 * button. Loads the Ledger 001 product (cost £0.90, RSP £2.50, VAT 0%,
 * 24 units/case, ROS 2) with retailer margin at 44.8% and lands on The Floor.
 */
export async function seedWorkedExample(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'See a real listing worked.' }).click()
  await expect(page.locator('h1')).toHaveText('The Floor')
}

/** In-app navigation: home wordmark, then a card in the #calculators grid. */
export async function goToCalculatorCard(page: Page, cardName: string, h1: string): Promise<void> {
  await page.getByRole('button', { name: 'GROSS home' }).click()
  await page.locator('#calculators button').filter({ hasText: cardName }).first().click()
  await expect(page.locator('h1')).toHaveText(h1)
}

/**
 * The value span of a receipt line. RLine and AnswerBlock rows are anonymous
 * label-span / value-span pairs — the adjacent-sibling selector is the least
 * fragile way in without adding test ids to src/ (which we do not do).
 */
export function receiptValue(page: Page, label: string) {
  // RLine rows are span/span pairs; AnswerBlock rows are dt/dd (the receipt's
  // answer reads as a definition list to screen readers).
  return page
    .locator('.print-block')
    .locator(`span:text-is("${label}") + span, dt:text-is("${label}") + dd`)
}

/**
 * Clipboard access. Chromium grants real permissions; anything else (WebKit,
 * should PW_WEBKIT ever come alive) gets a stub installed before first
 * navigation, because grantPermissions throws there.
 * Returns a reader for whatever the app last wrote.
 */
export async function armClipboard(
  page: Page,
  context: BrowserContext,
  browserName: string,
): Promise<() => Promise<string>> {
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    return () => page.evaluate(() => navigator.clipboard.readText())
  }
  await page.addInitScript(() => {
    const store = { text: '' }
    ;(window as unknown as { __grossClipboard: typeof store }).__grossClipboard = store
    Object.defineProperty(navigator, 'clipboard', {
      get: () => ({
        writeText: (t: string) => {
          store.text = t
          return Promise.resolve()
        },
        readText: () => Promise.resolve(store.text),
      }),
    })
  })
  return () =>
    page.evaluate(() => (window as unknown as { __grossClipboard: { text: string } }).__grossClipboard.text)
}

/** Decode a `?s=` share blob the same way the app does (btoa(encodeURIComponent(json))). */
export function decodeShareBlob(shareUrl: string): {
  products: Array<Record<string, unknown>>
  activeProductId: string | null
  activeCalculator: string
  scenario: Record<string, unknown>
} {
  const s = new URL(shareUrl).searchParams.get('s')
  if (!s) throw new Error(`No ?s= blob on ${shareUrl}`)
  // encodeURIComponent output is pure ASCII, so latin1 round-trips exactly
  return JSON.parse(decodeURIComponent(Buffer.from(s, 'base64').toString('latin1')))
}

/** Seed the export email before first navigation — skips the once-per-browser
 * email gate and, as a side effect, the Ledger nudge. */
export async function seedExportEmail(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('gross-export-email', 'e2e@getgross.co.uk')
  })
}

/** Click Export and hand back the download. exceljs is a lazy chunk plus a
 * real workbook build, so the leash is longer than the suite default. */
export async function exportDeck(page: Page): Promise<Download> {
  const download = page.waitForEvent('download', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  return download
}

/**
 * Record the `download` attribute of any anchor the app clicks. The sandbox's
 * older headless-shell build reports blob-anchor downloads as plain
 * "download" via suggestedFilename(), so the anchor itself is the reliable
 * witness for the deck's filename. Install before first navigation.
 */
export async function armDownloadNameProbe(page: Page): Promise<() => Promise<string | undefined>> {
  await page.addInitScript(() => {
    const originalClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) {
        ;(window as unknown as { __grossDownloadName?: string }).__grossDownloadName = this.download
      }
      return originalClick.call(this)
    }
  })
  return () =>
    page.evaluate(() => (window as unknown as { __grossDownloadName?: string }).__grossDownloadName)
}
