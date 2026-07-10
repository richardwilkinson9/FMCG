import { test, expect } from '@playwright/test'
import { blockCloud } from './helpers'

/**
 * Journey 5 — the Union sign-up on the homepage. Supabase is unreachable
 * here (and the route is aborted for a fast, deterministic failure), so the
 * form must fail soft: the exact red line, no hang, no crash, and the page
 * carries on as if nothing happened. Which, in fairness, it didn't.
 */

test.describe('the union sign-up journey', () => {
  test('a sign-up with the cloud down fails politely and the page stays usable', async ({
    page,
    context,
  }) => {
    await blockCloud(context)
    await page.goto('/')

    const email = page.getByLabel('Email address', { exact: true })
    await email.scrollIntoViewIfNeeded()
    await email.fill('rat@getgross.co.uk')
    await page.getByRole('button', { name: 'Sign up' }).click()

    // The exact fail-soft line (typographic apostrophe and all), within the
    // withTimeout window even if the abort were slow
    await expect(page.getByText(/That didn.t save\. Try again in a minute\./)).toBeVisible({
      timeout: 15_000,
    })
    // The success line must NOT appear — nothing was saved
    await expect(page.getByText(/In\. We.ll email when a fee moves\./)).not.toBeVisible()

    // The failed state resets to idle after 3s: the button comes back for
    // another go, with the typed email still in the box
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible({ timeout: 10_000 })
    await expect(email).toHaveValue('rat@getgross.co.uk')

    // And the rest of the site shrugs it off — navigation still works
    await page.locator('#calculators button').filter({ hasText: 'The P&L' }).first().click()
    await expect(page.locator('h1')).toHaveText('The P&L')
  })

  test('Enter submits too, and fails just as softly', async ({ page, context }) => {
    await blockCloud(context)
    await page.goto('/')

    const email = page.getByLabel('Email address', { exact: true })
    await email.fill('rat@getgross.co.uk')
    await email.press('Enter')

    await expect(page.getByText(/That didn.t save\. Try again in a minute\./)).toBeVisible({
      timeout: 15_000,
    })
  })
})
