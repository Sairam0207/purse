import { expect, test } from './fixtures'

test('setting a budget updates its progress bar', async ({ app: page }) => {
  await page.goto('/#/budgets')
  const input = page.getByLabel('Monthly budget for Health')
  await input.fill('500')
  await input.press('Enter')
  await expect(page.getByRole('status')).toContainText('Budget set for Health')
  await expect(page.getByRole('progressbar', { name: 'Health spending' })).toHaveAttribute('aria-valuetext', /of ₹500/)
})

test('theme preference applies and persists', async ({ app: page }) => {
  await page.goto('/#/settings')
  await page.getByRole('radio', { name: 'Dark' }).check({ force: true })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('delete all asks for confirmation and can be cancelled', async ({ app: page }) => {
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Delete all data' }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete all data?' })
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'Delete all data' }).click()
  await page.getByRole('dialog', { name: 'Delete all data?' }).getByRole('button', { name: 'Delete all data' }).click()
  await page.goto('/#/transactions')
  await expect(page.getByRole('heading', { name: 'Your ledger is empty' })).toBeVisible()
})

test('CSV export and re-import round-trips', async ({ app: page }, testInfo) => {
  await page.goto('/#/settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloadPromise
  const path = testInfo.outputPath('export.csv')
  await download.saveAs(path)

  await page.getByRole('button', { name: 'Delete all data' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete all data' }).click()
  await page.locator('input[type=file]').setInputFiles(path)
  await expect(page.getByRole('status')).toContainText(/Imported \d+ transactions/)
})
