import { expect, openAddDialog, test } from './fixtures'

test.describe('adding and editing transactions', () => {
  test('validates, adds, edits and deletes with undo', async ({ app: page }) => {
    await openAddDialog(page)
    const dialog = page.getByRole('dialog', { name: 'New transaction' })

    // Validation: empty amount is rejected and focused.
    await dialog.getByRole('button', { name: 'Add transaction' }).click()
    await expect(dialog.getByLabel('Amount')).toBeFocused()
    await expect(dialog.getByText('Enter an amount greater than zero')).toBeVisible()

    await dialog.getByLabel('Amount').fill('1,234.50')
    await dialog.getByLabel('Category').selectOption({ label: 'Shopping' })
    await dialog.getByLabel(/Note/).fill('Playwright headphones')
    await dialog.getByRole('button', { name: 'Add transaction' }).click()

    await expect(page.getByRole('status')).toContainText('Transaction added')
    await expect(dialog).toBeHidden()

    await page.goto('/#/transactions?q=playwright')
    const row = page.getByRole('button', { name: /Playwright headphones/ })
    await expect(row).toContainText('₹1,234.5')

    // Edit
    await row.click()
    const edit = page.getByRole('dialog', { name: 'Edit transaction' })
    await expect(edit.getByLabel('Amount')).toHaveValue('1234.50')
    await edit.getByLabel('Amount').fill('999')
    await edit.getByRole('button', { name: 'Save changes' }).click()
    await expect(row).toContainText('₹999')

    // Delete, then undo
    await row.click()
    await page.getByRole('button', { name: 'Delete transaction' }).click()
    await expect(row).toBeHidden()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(row).toBeVisible()
  })

  test('data survives a reload', async ({ app: page }) => {
    await openAddDialog(page)
    await page.getByLabel('Amount').fill('42')
    await page.getByLabel(/Note/).fill('Persisted chai')
    await page.getByRole('button', { name: 'Add transaction' }).last().click()
    await page.reload()
    await page.goto('/#/transactions?q=persisted')
    await expect(page.getByRole('button', { name: /Persisted chai/ })).toBeVisible()
  })

  test('the N shortcut opens the dialog and Escape closes it', async ({ app: page, isMobile }) => {
    test.skip(isMobile, 'Keyboard shortcuts are a desktop feature')
    await page.keyboard.press('n')
    const dialog = page.getByRole('dialog', { name: 'New transaction' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})

test.describe('filtering', () => {
  test('filters are stored in the URL and survive reload', async ({ app: page }) => {
    await page.goto('/#/transactions')
    await page.getByRole('combobox', { name: 'Type' }).selectOption('expense')
    await page.getByRole('combobox', { name: 'Category' }).selectOption({ label: 'Transport' })
    await expect(page).toHaveURL(/type=expense/)
    await expect(page).toHaveURL(/cat=transport/)

    await page.reload()
    await expect(page.getByRole('combobox', { name: 'Category' })).toHaveValue('transport')
    const rows = page.locator('.v-row-tx')
    await expect(rows.first()).toContainText('Transport')
    for (const text of await rows.allTextContents()) expect(text).toContain('Transport')

    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page).not.toHaveURL(/cat=/)
  })

  test('shows a helpful empty state when nothing matches', async ({ app: page }) => {
    await page.goto('/#/transactions?q=zzzznothing')
    await expect(page.getByRole('heading', { name: 'No matches' })).toBeVisible()
  })
})
