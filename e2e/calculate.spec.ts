import { test, expect } from '@playwright/test'
import { seedWorkedExample, goToCalculatorCard, receiptValue } from './helpers'

/**
 * Journey 1 — calculate. Open a calculator, get a product on the shelf, type
 * a number, watch the receipt redo the maths. Expected figures are derived by
 * hand below; the formulas are sacred, so if these fail the app is wrong.
 */

test.describe('the calculate journey', () => {
  test('The P&L recalculates the receipt when the cost price changes', async ({ page }) => {
    // The worked example: cost £0.90, RSP £2.50, VAT 0%, 24/case, and the
    // scenario it loads sets retailer margin 44.8%, no wholesaler, logistics £0.
    await seedWorkedExample(page)
    await goToCalculatorCard(page, 'The P&L', 'The P&L')

    // Hand derivation (retailerPnL, src/utils/calculations.ts):
    //   RSP ex-VAT      = 2.50 / (1 + 0)        = £2.50
    //   retailer keeps  = 2.50 × 0.448          = £1.12
    //   you bank / unit = 2.50 × (1 − 0.448)    = £1.38
    //   landed cost     = 0.90 + 0 (logistics)  = £0.90
    //   GM / unit       = 1.38 − 0.90           = £0.48
    //   GM %            = 0.48 / 1.38           = 34.7826… → "34.8%"
    await expect(receiptValue(page, 'You bank / unit')).toHaveText('£1.38')
    await expect(receiptValue(page, 'Gross margin / unit')).toHaveText('£0.48')
    await expect(receiptValue(page, 'Margin % (of net revenue)')).toHaveText('34.8%')

    // Fields are free-typing string buffers committing on every valid parse —
    // fill() lands the whole value in one input event, no blur needed.
    await page.getByLabel('Cost price / unit').fill('1.20')

    // New maths: GM / unit = 1.38 − 1.20 = £0.18; GM % = 0.18 / 1.38 = 13.04… → "13.0%"
    await expect(receiptValue(page, 'Gross margin / unit')).toHaveText('£0.18')
    await expect(receiptValue(page, 'Margin % (of net revenue)')).toHaveText('13.0%')

    // Push the cost past the net revenue and the verdict turns on you:
    // GM / unit = 1.38 − 1.50 = −£0.12 — underwater, red pen, told off.
    await page.getByLabel('Cost price / unit').fill('1.50')
    await expect(receiptValue(page, 'Gross margin / unit')).toHaveText('−£0.12')
    await expect(page.getByText('You are paying to be stocked')).toBeVisible()
  })

  test('bin every product and the calculators offer a product, not a crash', async ({ page }) => {
    // A fresh browser ships one demo product (VOLT 250ml). Bin it.
    // (Deep link with a trailing slash — the vite preview quirk.)
    await page.goto('/the-shelf/')
    await expect(page.getByLabel('Product name')).toHaveValue('VOLT 250ml')
    await page.getByRole('button', { name: 'REMOVE' }).click()
    await expect(page.getByRole('heading', { name: 'Nothing on the shelf.' })).toBeVisible()

    // In-app to a calculator — a full page load would reseed the demo product
    await page.getByRole('button', { name: 'GROSS home' }).click()
    await page.locator('#calculators button').filter({ hasText: 'The P&L' }).first().click()
    await expect(page.locator('h1')).toHaveText('The P&L')
    await expect(page.getByRole('heading', { name: 'No product yet.' })).toBeVisible()

    // The rat's escape hatch lands on The Shelf…
    await page.getByRole('button', { name: 'Start with a product' }).click()
    await expect(page.locator('h1')).toHaveText('The Shelf')

    // …where creating a product puts it straight on the shelf.
    await page.getByRole('button', { name: 'Add a product' }).click()
    await expect(page.getByText('ON SHELF', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Product name')).toBeVisible()
  })
})
