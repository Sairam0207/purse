import { expect, test } from './fixtures'

test('the spending calendar shows a day’s transactions', async ({ app: page }) => {
  const day = page.getByRole('button', { name: /^Tuesday 3 March:/ })
  await expect(day).toHaveAttribute('aria-label', /spent/)
  await day.click()
  await expect(day).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Tuesday, 3 March' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Rent/ }).first()).toBeVisible()
})

test('calendar is keyboard navigable', async ({ app: page, isMobile }) => {
  test.skip(isMobile)
  await page.getByRole('button', { name: /^Wednesday 18 March:/ }).focus()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('button', { name: /^Wednesday 11 March:/ })).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('button', { name: /^Tuesday 10 March:/ })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Tuesday, 10 March' })).toBeVisible()
})

test('future days are disabled and months can be browsed', async ({ app: page }) => {
  await expect(page.getByRole('button', { name: /^Thursday 19 March:/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Next month' })).toBeDisabled()
  await page.getByRole('button', { name: 'Previous month' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('February')
  await expect(page).toHaveURL(/m=2026-02/)
})

test('category rows link to filtered transactions', async ({ app: page }) => {
  await page.getByRole('link', { name: /Groceries/ }).click()
  await expect(page).toHaveURL(/#\/transactions\?cat=groceries&month=2026-03/)
})
