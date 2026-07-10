import { test, expect } from '@playwright/test'
import { PAGE_META } from '../src/config/pages'

/**
 * Smoke — every route in the registry loads, has an H1 and keeps the console
 * clean. The sandbox blocks Supabase and the LinkedIn tag at the proxy, so
 * failures against those hosts are expected noise and allowlisted; anything
 * else on the console is a real problem and fails the test.
 */

const EXPECTED_NOISE = [
  /supabase\.co/i, // analytics + cloud layer, blocked by design here
  /licdn\.com/i, // the LinkedIn Insight tag script
  /linkedin\.com/i, // …and its pixel
]

for (const meta of PAGE_META) {
  // vite preview only resolves prerendered routes with a trailing slash
  const path = meta.slug ? `/${meta.slug}/` : '/'

  test(`${meta.id} (${path}) loads with an H1 and a clean console`, async ({ page }) => {
    const complaints: string[] = []
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const haystack = `${msg.text()} ${msg.location().url}`
      if (EXPECTED_NOISE.some((re) => re.test(haystack))) return
      complaints.push(haystack)
    })
    page.on('pageerror', (err) => complaints.push(`pageerror: ${String(err)}`))

    await page.goto(path)

    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
    await expect(h1).not.toHaveText('')

    // A short grace so late console errors (lazy chunks, analytics) surface
    await page.waitForTimeout(400)
    expect(complaints).toEqual([])
  })
}
