import { expect, test } from './fixtures'

test('10,000 transactions render with a small, constant DOM', async ({ app: page }) => {
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Load 10,000 transactions' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Load test data' }).click()
  await expect(page.getByRole('status')).toContainText('Loaded 10,000')

  await page.goto('/#/transactions')
  await expect(page.getByText(/^10,000 transactions/)).toBeVisible()

  const rendered = () => page.locator('.v-row').count()
  expect(await rendered()).toBeLessThan(80)

  // Scroll deep into the list: still a small DOM, and the right rows appear.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.75))
  await expect.poll(rendered).toBeLessThan(80)
  // Rows are swapped in on the next animation frame, so poll rather than read once.
  await expect
    .poll(async () => Number(await page.locator('.v-row-tx').last().getAttribute('aria-posinset')))
    .toBeGreaterThan(6000)
})
