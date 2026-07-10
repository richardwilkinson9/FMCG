import type { BrowserContext, Page } from '@playwright/test'
import { test, expect } from '@playwright/test'
import { exportDeck, seedExportEmail, seedWorkedExample } from './helpers'

/**
 * Workstream 7 — the event-taxonomy contract. Every anonymous analytics event
 * is fired through `logEvent(name, slug)` (src/utils/analytics.ts → the lazy
 * cloud layer → a Supabase `events` insert). This suite pins the EXACT trail
 * each journey emits and guards against drift: if a journey starts firing an
 * unexpected event, or stops firing an expected one, a test here goes red.
 *
 * Supabase is unreachable in the sandbox, so instead of aborting the route
 * (which the other specs do) we STUB it: capture the `events` insert bodies to
 * read {name, slug}, and answer every Supabase call 2xx so the success paths
 * (union sign-up, short-link resolve) actually run. The canonical taxonomy —
 * every name, when it fires, its slug meaning, and which test proves it — is in
 * EVENTS.md at the repo root.
 */

interface Captured {
  name: string
  slug: string
}

/** CORS must be honoured or the browser blocks the real POST before we see it. */
const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-expose-headers': '*',
}

/**
 * Intercept every Supabase call. Record the `events` insert bodies, hand back a
 * plausible 2xx for everything (so union sign-up / short-link resolve succeed),
 * and optionally serve a stubbed short-link blob for the shortlink_open probe.
 * Returns the growing list of captured events.
 */
async function stubSupabase(
  context: BrowserContext,
  opts: { shareLinkBlob?: () => string | undefined } = {},
): Promise<Captured[]> {
  const events: Captured[] = []
  await context.route('https://*.supabase.co/**', async (route) => {
    const req = route.request()
    const url = req.url()

    // Preflight — answer with the CORS headers or the real request never fires.
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS })
      return
    }

    // The one endpoint we actually read: the events insert.
    if (url.includes('/rest/v1/events')) {
      try {
        const raw = req.postData()
        if (raw) {
          const parsed = JSON.parse(raw)
          for (const row of Array.isArray(parsed) ? parsed : [parsed]) {
            events.push({ name: String(row?.name ?? ''), slug: String(row?.slug ?? '') })
          }
        }
      } catch {
        // A malformed body would itself be a regression; leave it uncaptured so
        // the trail assertion notices the missing event rather than papering it.
      }
      await route.fulfill({ status: 201, headers: { ...CORS, 'content-type': 'application/json' }, body: '[]' })
      return
    }

    // Short-link resolve reads share_links (maybeSingle → a single JSON object).
    if (url.includes('/rest/v1/share_links') && req.method() === 'GET') {
      const blob = opts.shareLinkBlob?.()
      const body = blob ? JSON.stringify({ blob }) : ''
      await route.fulfill({
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
        body,
      })
      return
    }

    // Everything else (share_links / union_signups inserts, models, stats):
    // a clean 2xx so the app's success branches execute.
    await route.fulfill({ status: 201, headers: { ...CORS, 'content-type': 'application/json' }, body: '[]' })
  })
  return events
}

const key = (e: Captured): string => `${e.name}:${e.slug}`

/** Wait until the tail (from index `from`) equals `expected`, then hold for a
 * beat and re-assert — so a late, unexpected event still fails the test. */
async function expectTrail(
  page: Page,
  events: Captured[],
  from: number,
  expected: string[],
  timeout = 20_000,
): Promise<void> {
  await expect.poll(() => events.slice(from).map(key), { timeout }).toEqual(expected)
  await page.waitForTimeout(700)
  expect(events.slice(from).map(key)).toEqual(expected)
}

/** Let any pending events land, then return the current length as a clean
 * baseline so the next assertion measures only the action under test. */
async function settleAndMark(events: Captured[], atLeast: number): Promise<number> {
  await expect.poll(() => events.length).toBeGreaterThanOrEqual(atLeast)
  await new Promise((r) => setTimeout(r, 500))
  return events.length
}

test.describe('the event taxonomy', () => {
  test('loading a calculator route emits view (home, then the tool)', async ({ page, context }) => {
    const events = await stubSupabase(context)
    // '/' mounts on `home` (one view), the worked example lands on The Floor
    // (page id `min-margin`) — a second view.
    await seedWorkedExample(page)
    await expectTrail(page, events, 0, ['view:home', 'view:min-margin'])
  })

  test('copy share link emits share, and nothing else', async ({ page, context }) => {
    const events = await stubSupabase(context)
    await seedWorkedExample(page)
    const from = await settleAndMark(events, 2)

    await page.getByRole('button', { name: 'Copy share link' }).click()
    await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible()

    await expectTrail(page, events, from, ['share:min-margin'])
  })

  test('export with an email on file emits a lone export', async ({ page, context }) => {
    test.slow()
    const events = await stubSupabase(context)
    await seedExportEmail(page) // skips the once-per-browser email gate
    await seedWorkedExample(page)
    const from = await settleAndMark(events, 2)

    const download = await exportDeck(page)
    expect(await download.suggestedFilename()).toBeTruthy()

    await expectTrail(page, events, from, ['export:min-margin'])
  })

  test('the email-gate export emits export_email then export', async ({ page, context }) => {
    test.slow()
    const events = await stubSupabase(context)
    // No seeded email → the gate opens on first Export click.
    await seedWorkedExample(page)
    const from = await settleAndMark(events, 2)

    await page.getByRole('button', { name: 'Export', exact: true }).click()
    const emailInput = page.getByLabel('Email address for the export')
    await expect(emailInput).toBeVisible()
    await emailInput.fill('gate@getgross.co.uk')

    const download = page.waitForEvent('download', { timeout: 60_000 })
    await page.getByRole('button', { name: 'Take it — export the deck' }).click()
    await download

    await expectTrail(page, events, from, ['export_email:min-margin', 'export:min-margin'])
  })

  test('uploading a deck emits import', async ({ page, context }, testInfo) => {
    test.slow()
    const events = await stubSupabase(context)
    await seedExportEmail(page)
    await seedWorkedExample(page)

    // The only writer of a valid, upload-able deck is the app's own exporter.
    const download = await exportDeck(page)
    const deckPath = testInfo.outputPath('events-deck.xlsx')
    await download.saveAs(deckPath)

    await page.getByRole('button', { name: 'CHANGE PRODUCT' }).click()
    await expect(page.locator('h1')).toHaveText('The Shelf')

    // Mark AFTER we're on the Shelf so the view:products from navigating here is
    // excluded — the upload action should emit import and only import.
    const from = await settleAndMark(events, 1)

    await page
      .locator('label:has-text("UPLOAD THE DECK") input[type=file]')
      .setInputFiles(deckPath)
    await expect(
      page.getByText(/^Deck read\. \d+ products? and every assumption read back in\./),
    ).toBeVisible({ timeout: 15_000 })

    await expectTrail(page, events, from, ['import:products'])
  })

  test('a successful union sign-up emits union', async ({ page, context }) => {
    // Supabase is stubbed 2xx, so unionSignup returns ok → the union event
    // fires and the success line shows. (Under the abort used elsewhere it
    // would fail soft and emit nothing — see EVENTS.md.)
    const events = await stubSupabase(context)
    await page.goto('/')
    const from = await settleAndMark(events, 1)

    const email = page.getByLabel('Email address', { exact: true })
    await email.scrollIntoViewIfNeeded()
    await email.fill('union@getgross.co.uk')
    await page.getByRole('button', { name: 'Sign up' }).click()

    await expect(page.getByText(/In\. We.ll email when a fee moves\./)).toBeVisible({ timeout: 15_000 })
    await expectTrail(page, events, from, ['union:'])
  })

  test('save-receipt-as-image emits receipt_image', async ({ page, context }) => {
    test.slow()
    const events = await stubSupabase(context)
    await seedExportEmail(page) // also suppresses the Ledger nudge
    await seedWorkedExample(page)
    const from = await settleAndMark(events, 2)

    // html-to-image is a lazy chunk; the anchor click emits a download too.
    const download = page.waitForEvent('download', { timeout: 60_000 })
    await page.getByRole('button', { name: /SAVE THE RECEIPT AS AN IMAGE/ }).click()
    await download

    await expectTrail(page, events, from, ['receipt_image:min-margin'])
  })

  test('resolving a short link emits shortlink_open', async ({ page, context }) => {
    // Bonus coverage: shortlink_open fires inside resolveShortLink, which only
    // runs when share_links returns a blob — so we capture a real blob from a
    // share round-trip, then serve it for a /s/<id> boot.
    let blob: string | undefined
    const events = await stubSupabase(context, { shareLinkBlob: () => blob })

    await seedWorkedExample(page)
    await expect(page).toHaveURL(/\?s=/, { timeout: 5_000 })
    blob = new URL(page.url()).searchParams.get('s') ?? undefined
    expect(blob).toBeTruthy()

    const from = await settleAndMark(events, 2)
    await page.goto('/s/rat123')

    // resolveShortLink logs shortlink_open (slug = the id) before the model is
    // restored; a view for the restored tool follows. Assert the beacon is
    // present rather than pinning the whole tail (order of the trailing view is
    // an implementation detail).
    await expect
      .poll(() => events.slice(from).map(key), { timeout: 20_000 })
      .toContain('shortlink_open:rat123')
  })

  test('the whole suite fires only taxonomy events (no drift)', async ({ page, context }) => {
    // A belt-and-braces sweep across a multi-step session: every captured name
    // must be one of the nine documented events — a stray or renamed event
    // (Workstream 7's drift) trips this immediately.
    const KNOWN = new Set([
      'view',
      'share',
      'export',
      'export_email',
      'import',
      'receipt_image',
      'union',
      'shortlink_open',
      'client_error',
    ])
    const events = await stubSupabase(context)
    await seedExportEmail(page)
    await seedWorkedExample(page)
    await page.getByRole('button', { name: 'Copy share link' }).click()
    await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible()
    await page.getByRole('button', { name: 'CHANGE PRODUCT' }).click()
    await expect(page.locator('h1')).toHaveText('The Shelf')

    await new Promise((r) => setTimeout(r, 800))
    expect(events.length).toBeGreaterThan(0)
    const strays = events.filter((e) => !KNOWN.has(e.name))
    expect(strays, `unexpected event names: ${JSON.stringify(strays)}`).toEqual([])
    // No client_error means the session ran clean, which is also the point.
    expect(events.map((e) => e.name)).not.toContain('client_error')
  })
})
