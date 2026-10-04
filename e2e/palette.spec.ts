import { expect, test } from './fixtures'

test.describe('command palette', () => {
  test('opens with Ctrl+K and navigates with the keyboard', async ({ app: page, isMobile }) => {
    test.skip(isMobile)
    await page.keyboard.press('Control+k')
    const input = page.getByRole('combobox', { name: 'Search commands and transactions' })
    await expect(input).toBeFocused()
    await input.fill('budg')
    await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('option').first()).toContainText('Budgets')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/budgets/)
    await expect(page.getByRole('heading', { name: 'Budgets', level: 1 })).toBeVisible()
  })

  test('searches transactions and opens one for editing', async ({ app: page }) => {
    await page.getByRole('button', { name: 'Search' }).filter({ visible: true }).click()
    await page.getByRole('combobox').fill('biryani')
    await page.getByRole('option', { name: /Biryani night/ }).first().click()
    await expect(page.getByRole('dialog', { name: 'Edit transaction' })).toBeVisible()
  })
})
