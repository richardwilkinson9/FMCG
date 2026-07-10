import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import {
  armDownloadNameProbe,
  blockCloud,
  exportDeck,
  seedExportEmail,
  seedWorkedExample,
} from './helpers'

/**
 * Journey 3 — export. The deck costs an email, once per browser
 * (localStorage 'gross-export-email'). Both sides of the gate are covered,
 * and the list signup behind it is blocked here — the export must not care.
 */

test.describe('the export journey', () => {
  // A lazy exceljs chunk plus a real workbook build — longer leash
  test.slow()

  test('a fresh browser pays the email toll, and the deck still lands with the cloud down', async ({
    page,
    context,
  }) => {
    await blockCloud(context)
    const downloadName = await armDownloadNameProbe(page)
    await seedWorkedExample(page)

    // First Export click: no email on file, so the ask replaces the buttons
    await page.getByRole('button', { name: 'Export', exact: true }).click()
    await expect(page.getByText('The deck is free. The price is an email')).toBeVisible()

    // The submit stays disabled until the email parses
    const submit = page.getByRole('button', { name: 'Take it — export the deck' })
    await expect(submit).toBeDisabled()
    await page.getByLabel('Email address for the export').fill('not-an-email')
    await expect(submit).toBeDisabled()

    // A valid email unlocks it; the signup fire-and-forgets into a dead
    // Supabase and the export must not blink
    await page.getByLabel('Email address for the export').fill('rat@getgross.co.uk')
    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 })
    await submit.click()
    const download = await downloadPromise

    // The anchor's download attribute carries the deck's name (the sandbox's
    // headless shell reports blob anchors as plain "download")
    expect(await downloadName()).toMatch(/^GROSS_.+\.xlsx$/)
    const path = await download.path()
    const bytes = fs.readFileSync(path)
    // xlsx is a zip: first two bytes are PK, and a real deck is not tiny
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK')
    expect(bytes.length).toBeGreaterThan(20_000)

    // The toll is remembered — once per browser
    expect(await page.evaluate(() => localStorage.getItem('gross-export-email'))).toBe(
      'rat@getgross.co.uk',
    )
  })

  test('an email already on file skips the gate entirely', async ({ page, context }) => {
    await blockCloud(context)
    const downloadName = await armDownloadNameProbe(page)
    await seedExportEmail(page)
    await seedWorkedExample(page)

    const download = await exportDeck(page)
    // No ask, straight to the deck
    await expect(page.getByText('The deck is free. The price is an email')).not.toBeVisible()

    expect(await downloadName()).toMatch(/^GROSS_.+\.xlsx$/)
    const bytes = fs.readFileSync(await download.path())
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK')
    expect(bytes.length).toBeGreaterThan(20_000)
  })
})
