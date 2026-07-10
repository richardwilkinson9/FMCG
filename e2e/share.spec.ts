import { test, expect } from '@playwright/test'
import {
  armClipboard,
  blockCloud,
  decodeShareBlob,
  goToCalculatorCard,
  previewUrl,
  seedWorkedExample,
} from './helpers'

/**
 * Journey 2 — share. Copy share link writes the long ?s= URL inside the click,
 * then tries to swap in a short link if Supabase answers. Here it never
 * answers (blocked, and we abort the route to fail fast), so the long link
 * must survive on the clipboard — that IS the fail-soft behaviour.
 */

test.describe('the share journey', () => {
  test('Copy share link puts the long ?s= URL on the clipboard and it round-trips', async ({
    page,
    context,
    browserName,
  }) => {
    await blockCloud(context)
    const readClipboard = await armClipboard(page, context, browserName)

    await seedWorkedExample(page)
    await goToCalculatorCard(page, 'The P&L', 'The P&L')

    // A recognisable edit, so the restored page can prove it carried over
    await page.getByLabel('Cost price / unit').fill('1.20')

    await page.getByRole('button', { name: 'Copy share link' }).click()
    await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible()

    const copied = await readClipboard()
    expect(copied).toContain('?s=')
    expect(copied).toContain('/the-pnl')

    // Decode the blob in the test and check the model actually round-trips
    const decoded = decodeShareBlob(copied)
    expect(decoded.activeCalculator).toBe('retailer-pnl')
    expect(decoded.products).toHaveLength(1)
    expect(decoded.products[0].name).toBe('Worked example — Ledger 001')
    expect(decoded.products[0].cogsPerUnit).toBe(1.2)
    expect((decoded.scenario as { grocery: { retailerMargin: number } }).grocery.retailerMargin).toBe(0.448)

    // Supabase never answered, so the short link must NOT have replaced the
    // long one. Give the (aborted) attempt a beat, then check nothing moved.
    await page.waitForTimeout(800)
    expect(await readClipboard()).toContain('?s=')
    expect(await readClipboard()).not.toMatch(/\/s\/[a-z0-9]+$/)

    // Paste the link into a fresh page: the full model must come back
    const restored = await context.newPage()
    await restored.goto(previewUrl(copied))
    await expect(restored.locator('h1')).toHaveText('The P&L')
    await expect(restored.getByLabel('Product name')).toHaveValue('Worked example — Ledger 001')
    await expect(restored.getByLabel('Cost price / unit')).toHaveValue('1.2')
    await expect(restored.getByLabel('Retailer margin')).toHaveValue('44.8')
    await restored.close()
  })

  test('the address bar itself becomes the share link after an edit', async ({ page }) => {
    await seedWorkedExample(page)
    // The store syncs into the URL on a 400ms debounce (replaceState)
    await expect(page).toHaveURL(/\?s=/, { timeout: 5_000 })
    const decoded = decodeShareBlob(page.url())
    expect(decoded.products[0].name).toBe('Worked example — Ledger 001')
    expect(decoded.activeCalculator).toBe('min-margin')
  })

  test('a dead short link lands on home, not a broken page', async ({ page, context }) => {
    await blockCloud(context)
    await page.goto('/s/deadbeef')
    // resolveShortLink fails soft → home, and the path is tidied up. The
    // failure only surfaces when the app's own 6s withTimeout gives up, so
    // the leash is longer than the aborted request deserves.
    await expect(page.locator('h1').first()).toHaveText('GROSS.')
    await expect(page).toHaveURL(/\/(\?s=.*)?$/, { timeout: 12_000 })
  })
})
