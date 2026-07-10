import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import { blockCloud, exportDeck, seedExportEmail, seedWorkedExample } from './helpers'

/**
 * Journey 4 — upload the deck back. The only writer of a valid deck (with its
 * very-hidden gross-meta sheet) is the app's own exporter, so the round trip
 * is: export, tamper with the model in the UI, upload, watch the deck win.
 */

test.describe('the upload-the-deck journey', () => {
  test.slow()

  test('an exported deck restores the model it left with', async ({ page, context }, testInfo) => {
    await blockCloud(context)
    await seedExportEmail(page)
    await seedWorkedExample(page)

    // Export from The Floor and keep the file
    const download = await exportDeck(page)
    const deckPath = testInfo.outputPath('gross-deck.xlsx')
    await download.saveAs(deckPath)

    // Over to The Shelf, where the upload control lives
    await page.getByRole('button', { name: 'CHANGE PRODUCT' }).click()
    await expect(page.locator('h1')).toHaveText('The Shelf')

    // Tamper with the product so the restore is provable
    await page.getByLabel('Product name').fill('Tampered by hand')
    await page.getByLabel('Cost price / unit').fill('9.99')
    // Fields hold their text buffer while focused — step off before the upload
    // so the restored value can actually be read back
    await page.getByLabel('Cost price / unit').blur()

    // The visible chip is a <label> wrapping a hidden file input —
    // setInputFiles works on it without unhiding anything
    await page
      .locator('label:has-text("UPLOAD THE DECK") input[type=file]')
      .setInputFiles(deckPath)

    // The deadpan receipt line (auto-clears after 6s, so no dawdling)
    await expect(
      page.getByText(/^Deck read\. 1 product and every assumption read back in\./),
    ).toBeVisible({ timeout: 15_000 })

    // The tampering is undone — the deck's model is back on the shelf
    await expect(page.getByLabel('Product name')).toHaveValue('Worked example — Ledger 001')
    await expect(page.getByLabel('Cost price / unit')).toHaveValue('0.9')
  })

  test('a garbage .xlsx gets the deadpan error, not a crash', async ({ page }, testInfo) => {
    // Junk bytes in an .xlsx suit — exceljs should refuse politely
    const garbagePath = testInfo.outputPath('garbage.xlsx')
    fs.writeFileSync(garbagePath, Buffer.from('This is not a spreadsheet. It never was.'))

    await page.goto('/the-shelf/')
    await expect(page.locator('h1')).toHaveText('The Shelf')

    await page
      .locator('label:has-text("UPLOAD THE DECK") input[type=file]')
      .setInputFiles(garbagePath)

    await expect(
      page.getByText('That did not read as an Excel file. Upload the .xlsx the Export gave you.'),
    ).toBeVisible({ timeout: 15_000 })

    // Still standing: the toolbar works and a product can be added
    await page.getByRole('button', { name: '+ ADD PRODUCT' }).click()
    await expect(page.getByText('ON SHELF', { exact: true })).toBeVisible()
  })
})
